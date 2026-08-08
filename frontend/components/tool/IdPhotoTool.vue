<script setup lang="ts">
/**
 * IdPhotoTool.vue - AI 证件照工具组件
 *
 * 参照 id-photo-tool/pages/ 原型（index=上传 / preview=编辑预览 /
 * processing=生成中 / result=结果页），视觉采用本站设计令牌（pz-*）。
 *
 * 功能：
 * 1. 图片上传（点击 / 拖拽 / 粘贴），JPG/JPEG/PNG，长或宽 < 8000px
 * 2. 画布预览：缩放（0.25~4）、按住拖动平移、重置、重新上传
 * 3. 配置面板：6 种照片底色 + 9 种证件照尺寸（mm 规格），开始制作状态机
 * 4. 智能抠图：MediaPipe Tasks Vision ImageSegmenter（浏览器本地分割，
 *    不处理不上传），降采样 1024px 分割，person 置信度 mask 按 getLabels
 *    解析索引（该模型版本仅返回 1 个 person mask，取索引 0），阈值 0.5，
 *    destination-in 生成全尺寸透明人像图层并缓存
 * 5. 证件照合成：按 300DPI 换算目标像素，填充底色 + 等比居中叠加人像；
 *    底色/尺寸变更实时重合成（TR-5.1）
 * 6. 成品导出：PNG 下载（id-photo-{sizeSlug}.png）与剪贴板复制
 *
 * 交互事件（useAnalytics 上报）：开始制作 → tool_use；下载 → download；复制 → copy
 */
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Download,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import {
  canvasToBlob,
  downloadBlob,
  loadImageWithOrientation,
  resizeCanvas,
} from '~/utils/tools/image'

useHead({
  titleTemplate: null,
  title: 'AI证件照工具 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线 AI 证件照制作工具，一键智能抠图换底色，支持一寸、二寸等 9 种标准尺寸，300DPI 高清导出，浏览器本地处理不上传。'
    },
    {
      name: 'keywords',
      content: 'AI证件照,证件照制作,证件照换底色,一寸照片,二寸照片,在线证件照'
    },
    {
      property: 'og:title',
      content: 'AI证件照工具 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线 AI 证件照制作工具，一键智能抠图换底色，支持一寸、二寸等 9 种标准尺寸，300DPI 高清导出，浏览器本地处理不上传。'
    }
  ]
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const route = useRoute()
const { reportEvent } = useAnalytics()

/** 用于事件上报的 slug：优先使用 prop，其次路由参数 */
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'id-photo',
)

// === 常量与选项 ===
/** 允许的图片 MIME / 扩展名 */
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
/** 长或宽达到该像素值即拒绝 */
const MAX_DIMENSION = 8000
/** 毫米 → 像素换算（300DPI） */
const MM_TO_PX = 300 / 25.4
/** 分割降采样最长边 */
const SEGMENT_MAX_SIDE = 1024

/** MediaPipe Tasks Vision CDN（仅客户端动态加载） */
const VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const VISION_WASM_DIR = `${VISION_CDN}/wasm`
const SEGMENTER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'

interface SizeOption {
  key: string
  label: string
  w: number
  h: number
  slug: string
}

/** 9 种标准证件照尺寸（mm） */
const sizeOptions: SizeOption[] = [
  { key: '1inch', label: '一寸', w: 25, h: 35, slug: 'one-inch' },
  { key: 'small-1inch', label: '小一寸', w: 22, h: 32, slug: 'small-one-inch' },
  { key: 'large-1inch', label: '大一寸', w: 33, h: 48, slug: 'large-one-inch' },
  { key: '2inch', label: '二寸', w: 35, h: 49, slug: 'two-inch' },
  { key: 'small-2inch', label: '小二寸', w: 35, h: 45, slug: 'small-two-inch' },
  { key: 'large-2inch', label: '大二寸', w: 35, h: 53, slug: 'large-two-inch' },
  { key: '3inch', label: '三寸', w: 55, h: 84, slug: 'three-inch' },
  { key: '4inch', label: '四寸', w: 76, h: 102, slug: 'four-inch' },
  { key: '5inch', label: '五寸', w: 89, h: 127, slug: 'five-inch' },
]

interface BgOption {
  key: string
  label: string
  type: 'solid' | 'gradient'
  color?: string
  colors?: [string, string]
}

/** 6 种照片底色 */
const bgOptions: BgOption[] = [
  { key: 'white', label: '白', type: 'solid', color: '#ffffff' },
  { key: 'light-blue', label: '浅蓝', type: 'solid', color: '#e0f2fe' },
  { key: 'dark-blue', label: '深蓝', type: 'solid', color: '#1e3a8a' },
  { key: 'red', label: '红色', type: 'solid', color: '#ef4444' },
  {
    key: 'gradient',
    label: '渐变',
    type: 'gradient',
    colors: ['#e0f2fe', '#2563eb'],
  },
  { key: 'light-gray', label: '浅灰', type: 'solid', color: '#f1f5f9' },
]

/** 案例参考图 */
const samples = [
  {
    src: '/images/id-photo/sample-portrait-woman.jpg',
    label: '女性示例',
    name: 'sample-woman',
  },
  {
    src: '/images/id-photo/sample-portrait-child.jpg',
    label: '儿童示例',
    name: 'sample-child',
  },
  {
    src: '/images/id-photo/sample-portrait-man.jpg',
    label: '男性示例',
    name: 'sample-man',
  },
  {
    src: '/images/id-photo/sample-portrait-elderly.jpg',
    label: '长辈示例',
    name: 'sample-elderly',
  },
]

// === 状态 ===
/** EXIF 修正后的源 canvas */
const sourceCanvas = ref<HTMLCanvasElement | null>(null)
const originalFileName = ref('')
/** 上传后的预览 dataURL（降采样生成，避免大图内存开销） */
const previewDataUrl = ref('')
const imageLoaded = ref(false)
const errorMsg = ref('')
const dragover = ref(false)

/** 配置选择 */
const bgKey = ref('white')
const sizeKey = ref('')

/** 画布缩放 / 平移 */
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0

/** 制作流程 */
const generating = ref(false)
const genStep = ref(0)
const genSteps = ['智能抠图', '换底色', '尺寸裁切', '完成']
/** 缓存的人像透明图层（切换底色不重复抠图） */
const personLayer = ref<HTMLCanvasElement | null>(null)
const modelFailed = ref(false)
const done = ref(false)
const resultCanvas = ref<HTMLCanvasElement | null>(null)
const resultDataUrl = ref('')
const resultPixelText = ref('')
let segmenterPromise: Promise<unknown> | null = null

/** 轻量 toast（开发中 / 复制反馈） */
const toastMsg = ref('')
const toastKind = ref<'info' | 'success' | 'error'>('info')
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** 模板引用 */
const fileInputRef = ref<HTMLInputElement | null>(null)

// === 计算属性 ===
const selectedBg = computed(
  () => bgOptions.find((b) => b.key === bgKey.value) ?? bgOptions[0],
)
const selectedSize = computed(
  () => sizeOptions.find((s) => s.key === sizeKey.value) ?? null,
)
/** 未上传 / 未选尺寸 / 生成中 → 不可开始 */
const canStart = computed(
  () => imageLoaded.value && !!selectedSize.value && !generating.value,
)
/** 目标像素尺寸（300DPI） */
const targetSize = computed(() => {
  const s = selectedSize.value
  if (!s) return { w: 0, h: 0 }
  return { w: Math.round(s.w * MM_TO_PX), h: Math.round(s.h * MM_TO_PX) }
})
const zoomPercent = computed(() => `${Math.round(zoom.value * 100)}%`)
const previewTransformStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
}))
const genProgress = computed(() => `${(genStep.value + 1) * 25}%`)
const toastIcon = computed(() => {
  if (toastKind.value === 'success') return Check
  if (toastKind.value === 'error') return AlertTriangle
  return Info
})
const resultSizeLabel = computed(() => selectedSize.value?.label ?? '-')
const resultBgLabel = computed(() => selectedBg.value?.label ?? '-')

// === 工具函数 ===
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function showToast(kind: 'info' | 'success' | 'error', msg: string) {
  toastKind.value = kind
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 2500)
}

/** 底色 swatch 圆形色块样式（纯色 / 渐变） */
function swatchStyle(bg: BgOption) {
  if (bg.type === 'gradient' && bg.colors) {
    return {
      background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})`,
    }
  }
  return { backgroundColor: bg.color ?? '#ffffff' }
}

/** 生成预览 dataURL（降采样到 1400px 内，避免超大 canvas 内存压力） */
function makePreviewUrl(canvas: HTMLCanvasElement): string {
  const preview = resizeCanvas(canvas, 1400, 1400)
  return preview.toDataURL('image/png')
}

// === 上传处理 ===
function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0])
  }
}

/** 窗口 paste 事件：粘贴上传 */
function onWindowPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        handleFile(file)
        return
      }
    }
  }
}

// 拖拽计数，避免子元素间 dragleave 误触发
let dragDepth = 0
function onDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragDepth++
  dragover.value = true
}
function onDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragover.value = true
}
function onDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragover.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragDepth = 0
  dragover.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

/** 校验文件类型（MIME 或扩展名） */
function validateFileType(file: File): boolean {
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    /\.(jpe?g|png)$/i.test(file.name)
  )
}

/** 处理上传文件：校验 → EXIF 修正加载 → 尺寸校验 → 进入预览态 */
async function handleFile(file: File) {
  if (!file || import.meta.server) return

  if (!validateFileType(file)) {
    errorMsg.value = '仅支持 JPG/JPEG/PNG 格式的图片，请更换后重试。'
    return
  }
  errorMsg.value = ''

  try {
    const canvas = await loadImageWithOrientation(file)
    if (canvas.width >= MAX_DIMENSION || canvas.height >= MAX_DIMENSION) {
      errorMsg.value = `图片尺寸为 ${canvas.width}×${canvas.height} 像素，长或宽超过 ${MAX_DIMENSION} 像素限制，请压缩后重试。`
      return
    }
    setSourceCanvas(canvas, file.name)
  } catch {
    errorMsg.value = '图片加载失败，请检查文件是否损坏。'
  }
}

/** 加载示例图（new Image 绘制到 canvas 作为 sourceCanvas） */
function loadSample(src: string, name: string) {
  if (import.meta.server) return
  errorMsg.value = ''
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      errorMsg.value = '示例图片加载失败，请重试。'
      return
    }
    ctx.drawImage(img, 0, 0)
    setSourceCanvas(canvas, name)
  }
  img.onerror = () => {
    errorMsg.value = '示例图片加载失败，请稍后重试。'
  }
  img.src = src
}

/** 统一入口：设置源图并重置所有派生状态 */
function setSourceCanvas(canvas: HTMLCanvasElement, name: string) {
  sourceCanvas.value = canvas
  originalFileName.value = name
  imageLoaded.value = true
  previewDataUrl.value = makePreviewUrl(canvas)
  done.value = false
  resultCanvas.value = null
  resultDataUrl.value = ''
  resultPixelText.value = ''
  personLayer.value = null
  modelFailed.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  errorMsg.value = ''
}

/** 清空回上传态 */
function resetToUpload() {
  sourceCanvas.value = null
  imageLoaded.value = false
  previewDataUrl.value = ''
  done.value = false
  resultCanvas.value = null
  resultDataUrl.value = ''
  resultPixelText.value = ''
  personLayer.value = null
  modelFailed.value = false
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  errorMsg.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

/** 重新上传：清空回上传态并唤起文件选择 */
function reupload() {
  resetToUpload()
  triggerFileInput()
}

// === 画布缩放 / 平移 ===
function zoomIn() {
  zoom.value = clamp(zoom.value * 1.25, 0.25, 4)
}
function zoomOut() {
  zoom.value = clamp(zoom.value / 1.25, 0.25, 4)
}
function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function getClientPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  return { x: e.clientX, y: e.clientY }
}

function onPanStart(e: MouseEvent | TouchEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button, a')) return
  if (!imageLoaded.value) return
  isPanning.value = true
  const pos = getClientPos(e)
  panStartX = pos.x - panX.value
  panStartY = pos.y - panY.value
  e.preventDefault()
  document.addEventListener('mousemove', onPanMove)
  document.addEventListener('mouseup', onPanEnd)
  document.addEventListener('touchmove', onPanMove, { passive: false })
  document.addEventListener('touchend', onPanEnd)
}

function onPanMove(e: MouseEvent | TouchEvent) {
  if (!isPanning.value) return
  e.preventDefault()
  const pos = getClientPos(e)
  panX.value = pos.x - panStartX
  panY.value = pos.y - panStartY
}

function onPanEnd() {
  isPanning.value = false
  document.removeEventListener('mousemove', onPanMove)
  document.removeEventListener('mouseup', onPanEnd)
  document.removeEventListener('touchmove', onPanMove)
  document.removeEventListener('touchend', onPanEnd)
}

// === 配置选择 ===
function selectBg(key: string) {
  bgKey.value = key
  // 已制作完成 → 实时重合成（复用缓存的 personLayer）
  if (done.value) recompose()
}

function selectSize(key: string) {
  sizeKey.value = key
  if (done.value) recompose()
}

// === 智能抠图（MediaPipe ImageSegmenter，浏览器本地） ===
/** 懒加载并缓存 segmenter（单例） */
function getSegmenter(): Promise<unknown> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      // 动态 import CDN ESM（仅客户端执行）
      const vision: any = await import(/* @vite-ignore */ VISION_CDN)
      const fileset = await vision.FilesetResolver.forVisionTasks(
        VISION_WASM_DIR,
      )
      return vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: true,
      })
    })()
  }
  return segmenterPromise
}

/**
 * 解析 person 在 confidenceMasks 中的索引。
 * - confidenceMasks 与 getLabels() 返回的标签顺序一致
 * - 实测 selfie_segmenter（tasks-vision 0.10.14）仅返回 1 个 confidence mask（person），索引 0
 * - 多 mask 时优先按标签名匹配 person，无法解析则默认 1（background/person 顺序）
 */
function resolvePersonIndex(segmenter: unknown, maskCount: number): number {
  if (maskCount === 1) return 0
  try {
    const s = segmenter as {
      getLabels?: () => string[][] | string[]
    }
    const labels = s.getLabels?.()
    if (Array.isArray(labels)) {
      const flat = Array.isArray(labels[0]) ? (labels[0] as string[]) : (labels as string[])
      const idx = flat.findIndex(
        (l: string) => typeof l === 'string' && l.toLowerCase().includes('person'),
      )
      if (idx >= 0 && idx < maskCount) return idx
    }
  } catch {
    // 忽略标签解析异常
  }
  return 1
}

/**
 * 对 alpha 数组做形态学腐蚀（最小值滤波），用于去除人像边缘原背景色毛边。
 * radius: 腐蚀半径（1 表示 3x3 邻域）
 */
function erodeAlpha(alpha: Float32Array, w: number, h: number, radius: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minA = alpha[y * w + x]
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            minA = Math.min(minA, alpha[ny * w + nx])
          }
        }
      }
      out[y * w + x] = minA
    }
  }
  return out
}

/**
 * 从 canvas 四个角采样估计原背景色。证件照原图通常为均匀背景，
 * 四角最可能属于背景，用于后续边缘去色（去除毛边原背景色）。
 */
function estimateBackgroundColor(canvas: HTMLCanvasElement): { r: number; g: number; b: number } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { r: 255, g: 255, b: 255 }

  const sampleSize = 10
  const positions = [
    { x: 0, y: 0 },
    { x: canvas.width - sampleSize, y: 0 },
    { x: 0, y: canvas.height - sampleSize },
    { x: canvas.width - sampleSize, y: canvas.height - sampleSize },
  ]

  let totalR = 0
  let totalG = 0
  let totalB = 0
  let sampleCount = 0

  for (const pos of positions) {
    const sx = Math.max(0, Math.min(canvas.width - sampleSize, pos.x))
    const sy = Math.max(0, Math.min(canvas.height - sampleSize, pos.y))
    const data = ctx.getImageData(sx, sy, sampleSize, sampleSize).data
    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i]
      totalG += data[i + 1]
      totalB += data[i + 2]
      sampleCount++
    }
  }

  if (sampleCount === 0) return { r: 255, g: 255, b: 255 }
  return {
    r: totalR / sampleCount,
    g: totalG / sampleCount,
    b: totalB / sampleCount,
  }
}

/**
 * 对带透明通道的人像图层做边缘颜色去 contamination：
 * 半透明边缘像素的颜色由原背景色与前景色混合而成，通过 C = F*a + B*(1-a)
 * 反解 F 并替换，可显著削弱白边/原背景色毛边。
 * 仅处理 alpha 在 [15, 254] 的边缘像素，避免全透明或全不透明区域失真。
 */
function decontaminateEdges(canvas: HTMLCanvasElement, bg: { r: number; g: number; b: number }) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a <= 15 || a >= 254) continue

    const alpha = a / 255
    const invAlpha = 1 - alpha
    data[i] = Math.max(0, Math.min(255, Math.round((data[i] - bg.r * invAlpha) / alpha)))
    data[i + 1] = Math.max(0, Math.min(255, Math.round((data[i + 1] - bg.g * invAlpha) / alpha)))
    data[i + 2] = Math.max(0, Math.min(255, Math.round((data[i + 2] - bg.b * invAlpha) / alpha)))
  }

  ctx.putImageData(imgData, 0, 0)
}

/**
 * 人像分割：
 * 1. sourceCanvas 降采样到最长边 1024px
 * 2. 优先取 person 置信度 mask（resolvePersonIndex 定位，该模型版本为索引 0）
 *    将置信度直接作为平滑 alpha，并做 1 像素腐蚀去毛边；不可用则回退 categoryMask
 * 3. 生成全尺寸透明人像图层（RGBA mask + destination-in 平滑边缘）并缓存
 * 4. 对边缘做颜色去 contamination，进一步消除原背景色白边
 */
async function runSegmentation() {
  const src = sourceCanvas.value
  if (!src) return

  const temp = resizeCanvas(src, SEGMENT_MAX_SIDE, SEGMENT_MAX_SIDE)
  const segmenter: any = await getSegmenter()
  const result: any = await segmenter.segment(temp)

  let alphaArray: Float32Array | Uint8Array
  let mw: number
  let mh: number
  let useConfidence = false

  if (
    result.confidenceMasks &&
    Array.isArray(result.confidenceMasks) &&
    result.confidenceMasks.length >= 1
  ) {
    const personIdx = resolvePersonIndex(
      segmenter,
      result.confidenceMasks.length,
    )
    const cm = result.confidenceMasks[personIdx]
    if (cm && typeof cm.getAsFloat32Array === 'function') {
      const arr = cm.getAsFloat32Array()
      if (arr) {
        alphaArray = arr
        mw = cm.width
        mh = cm.height
        useConfidence = true
      }
    }
  }

  if (!useConfidence) {
    if (result.categoryMask && result.categoryMask.getAsUint8Array) {
      const arr = result.categoryMask.getAsUint8Array()
      if (!arr) throw new Error('人像类别数据不可用')
      alphaArray = arr
      mw = result.categoryMask.width
      mh = result.categoryMask.height
    } else {
      throw new Error('未获取到人像分割结果')
    }
  }

  if (!mw || !mh || alphaArray.length !== mw * mh) {
    throw new Error('人像分割结果尺寸异常')
  }

  // 生成 RGBA mask：
  // 1) 将置信度/类别结果转为 0~1 的 alpha；
  // 2) 做 1 像素腐蚀，去除人像边缘残留的原背景色毛边；
  // 3) 最终 mask 保留平滑透明度，与 destination-in 合成实现自然过渡。
  const rawAlpha = new Float32Array(mw * mh)
  for (let i = 0; i < mw * mh; i++) {
    // 实测该版本 categoryMask 语义为：背景=255、人像=0（与标准标签索引相反），
    // 因此回退分支按「=== 0」判定人像
    rawAlpha[i] = useConfidence
      ? alphaArray[i]
      : (alphaArray as Uint8Array)[i] === 0
        ? 1
        : 0
  }
  const erodedAlpha = erodeAlpha(rawAlpha, mw, mh, 1)

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = mw
  maskCanvas.height = mh
  const mctx = maskCanvas.getContext('2d')
  if (!mctx) throw new Error('Canvas 初始化失败')
  const imgData = mctx.createImageData(mw, mh)
  const px = imgData.data
  for (let i = 0; i < mw * mh; i++) {
    const a = Math.max(0, Math.min(255, Math.round(erodedAlpha[i] * 255)))
    const o = i * 4
    px[o] = 255
    px[o + 1] = 255
    px[o + 2] = 255
    px[o + 3] = a
  }
  mctx.putImageData(imgData, 0, 0)

  // 全尺寸透明人像图层：先画原图，再用 mask 做 destination-in
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const octx = out.getContext('2d')
  if (!octx) throw new Error('Canvas 初始化失败')
  octx.drawImage(src, 0, 0)
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(maskCanvas, 0, 0, out.width, out.height)
  octx.globalCompositeOperation = 'source-over'

  // 边缘颜色去 contamination：用四角估计的原背景色，消除半透明边缘残留的白边/背景色
  const bgColor = estimateBackgroundColor(src)
  decontaminateEdges(out, bgColor)

  personLayer.value = out
}

// === 证件照合成 ===
/** 构图参数：头顶留白占画面高比例、人物可见内容占画面高比例 */
const COMPOSE_TOP_RATIO = 0.05
const COMPOSE_CONTENT_RATIO = 0.95
/** 人物过窄时的最小宽度占比（兜底，防止瘦长图人物过小） */
const COMPOSE_MIN_WIDTH_RATIO = 0.80

/**
 * 计算透明人像图层的可见内容包围盒与水平质心（降采样分析，速度快）。
 * 返回值为原图坐标系下的像素边界及质心；全透明时返回 null。
 */
function getVisibleBounds(
  canvas: HTMLCanvasElement,
): { topY: number; bottomY: number; leftX: number; rightX: number; centerX: number } | null {
  const maxSide = 256
  const scale = maxSide / Math.max(canvas.width, canvas.height)
  const tw = Math.max(1, Math.round(canvas.width * scale))
  const th = Math.max(1, Math.round(canvas.height * scale))
  const temp = document.createElement('canvas')
  temp.width = tw
  temp.height = th
  const tctx = temp.getContext('2d', { willReadFrequently: true })
  if (!tctx) return null
  tctx.drawImage(canvas, 0, 0, tw, th)
  const data = tctx.getImageData(0, 0, tw, th).data

  let topY = -1
  let bottomY = -1
  let leftX = tw
  let rightX = -1
  let sumX = 0
  let count = 0
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      if (data[(y * tw + x) * 4 + 3] > 0) {
        if (topY < 0) topY = y
        bottomY = y
        if (x < leftX) leftX = x
        if (x > rightX) rightX = x
        sumX += x
        count++
      }
    }
  }
  if (topY < 0) return null

  const toFull = (v: number) => Math.round(v / scale)
  return {
    topY: toFull(topY),
    bottomY: toFull(bottomY),
    leftX: toFull(leftX),
    rightX: toFull(rightX),
    centerX: toFull(sumX / count),
  }
}

/**
 * 填充底色 + 按证件照标准构图叠加人像，生成目标尺寸 canvas。
 * 构图策略（与页面示例证件照一致）：
 * - 以可见内容（非透明）包围盒为基准，头顶留白约 5%、内容高约占画面 95%
 * - 以人像可见像素质心水平居中；允许肩部撑满/略超画布（画布自动裁剪外侧）
 * - 最后按人像可见内容底边裁剪底部多余纯色背景，避免生成结果下方出现背景色条
 */
function composeResult() {
  const layer = personLayer.value
  const size = selectedSize.value
  if (!layer || !size) return

  const { w, h } = targetSize.value
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 1. 填充底色（纯色 / 渐变）
  const bg = selectedBg.value
  if (bg.type === 'gradient' && bg.colors) {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, bg.colors[0])
    grad.addColorStop(1, bg.colors[1])
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = bg.color ?? '#ffffff'
  }
  ctx.fillRect(0, 0, w, h)

  // 2. 基于可见内容包围盒等比缩放并定位（不拉伸）
  const bounds = getVisibleBounds(layer)
  if (!bounds) {
    resultCanvas.value = canvas
    resultPixelText.value = `${w}×${h}px`
    resultDataUrl.value = makePreviewUrl(canvas)
    return
  }

  const pw = layer.width
  const ph = layer.height
  const contentH = bounds.bottomY - bounds.topY
  const contentW = bounds.rightX - bounds.leftX

  // 高度主导：可见内容占画面约 95%（头顶留白 5%，肩下不留多余背景）
  let s = (h * COMPOSE_CONTENT_RATIO) / contentH
  // 兜底：人物过窄时（如瘦长全身照）保证最小宽度
  if (contentW * s < w * COMPOSE_MIN_WIDTH_RATIO) {
    s = (w * COMPOSE_MIN_WIDTH_RATIO) / contentW
  }

  const dw = pw * s
  const dh = ph * s
  // 以人像质心水平居中，不受原图左右偏移影响；垂直方向按头顶留白定位
  const dx = w / 2 - bounds.centerX * s
  const dy = h * COMPOSE_TOP_RATIO - bounds.topY * s
  ctx.drawImage(layer, dx, dy, dw, dh)

  // 3. 裁剪底部多余纯色背景：以人像可见内容底边为基准精确裁切，
  //    不保留底部背景边距，彻底移除人像下方的纯色背景条。
  const contentBottomY = Math.min(h, Math.ceil(dy + bounds.bottomY * s))
  const cropH = Math.min(h, Math.max(1, contentBottomY))
  if (cropH < h) {
    const cropped = document.createElement('canvas')
    cropped.width = w
    cropped.height = cropH
    const cctx = cropped.getContext('2d')
    if (cctx) {
      cctx.drawImage(canvas, 0, 0, w, cropH, 0, 0, w, cropH)
      resultCanvas.value = cropped
      resultPixelText.value = `${w}×${cropH}px`
      resultDataUrl.value = makePreviewUrl(cropped)
      return
    }
  }

  resultCanvas.value = canvas
  resultPixelText.value = `${w}×${h}px`
  resultDataUrl.value = makePreviewUrl(canvas)
}

/** 已制作完成时，底色/尺寸变更实时重合成 */
function recompose() {
  if (!personLayer.value) return
  composeResult()
}

// === 开始制作（状态机） ===
async function startMake() {
  if (import.meta.server) return
  if (generating.value) return
  if (!sourceCanvas.value || !selectedSize.value) {
    errorMsg.value = '请先上传照片并选择照片尺寸。'
    return
  }

  errorMsg.value = ''
  modelFailed.value = false
  done.value = false
  resultCanvas.value = null
  resultDataUrl.value = ''
  resultPixelText.value = ''
  generating.value = true
  genStep.value = 0

  try {
    // 小延迟保证遮罩可见
    await delay(150)

    // 步骤 1：智能抠图（personLayer 已缓存则跳过）
    if (!personLayer.value) {
      genStep.value = 0
      await runSegmentation()
      await delay(150)
    } else {
      await delay(200)
    }

    // 步骤 2：换底色
    genStep.value = 1
    await delay(200)

    // 步骤 3：尺寸裁切
    genStep.value = 2
    await delay(200)

    composeResult()

    // 步骤 4：完成
    genStep.value = 3
    await delay(250)
    done.value = true

    reportEvent('tool_use', effectiveSlug.value)
  } catch {
    // 模型加载 / 分割失败：关闭遮罩，展示降级提示，不崩溃
    modelFailed.value = true
  } finally {
    generating.value = false
  }
}

/** 模型加载失败后重试 */
function retryModel() {
  segmenterPromise = null
  startMake()
}

// === 成品导出 ===
/** 下载 PNG（文件名含规格 slug） */
async function downloadResult() {
  if (!resultCanvas.value) return
  try {
    const blob = await canvasToBlob(resultCanvas.value, 'image/png')
    const slug = selectedSize.value?.slug ?? 'id'
    downloadBlob(blob, `id-photo-${slug}.png`)
    reportEvent('download', effectiveSlug.value)
  } catch {
    errorMsg.value = '下载失败，请重试。'
  }
}

/** 复制 PNG 到剪贴板（环境不支持时提示改用下载） */
async function copyResult() {
  if (!resultCanvas.value) return
  try {
    const blob = await canvasToBlob(resultCanvas.value, 'image/png')
    if (
      !navigator.clipboard?.write ||
      typeof ClipboardItem === 'undefined'
    ) {
      throw new Error('Clipboard API unsupported')
    }
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
    showToast('success', '已复制到剪贴板')
    reportEvent('copy', effectiveSlug.value)
  } catch {
    showToast('error', '复制失败，请使用下载功能')
  }
}

/** 重新制作：清空结果回上传后状态（personLayer 缓存保留，重做更快） */
function resetResult() {
  done.value = false
  resultCanvas.value = null
  resultDataUrl.value = ''
  resultPixelText.value = ''
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

// === 生命周期 ===
onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('paste', onWindowPaste)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('paste', onWindowPaste)
  }
  document.removeEventListener('mousemove', onPanMove)
  document.removeEventListener('mouseup', onPanEnd)
  document.removeEventListener('touchmove', onPanMove)
  document.removeEventListener('touchend', onPanEnd)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <div class="idp-root">
    <!-- ============ 顶部标题区 ============ -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-start gap-3">
        <div
          class="idp-header-icon"
          style="background-color: var(--pz-color-primary-light)"
          aria-hidden="true"
        >
          <ImageIcon class="w-5 h-5" style="color: var(--pz-color-primary)" />
        </div>
        <div class="min-w-0">
          <h2
            class="text-base font-semibold mb-1"
            style="color: var(--pz-color-text-primary)"
          >
            AI 证件照生成器
          </h2>
          <p
            class="text-sm"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            上传照片，AI 一键抠图换底色，支持 9 种标准尺寸，300DPI
            高清导出。照片仅在浏览器本地处理，不会上传。
          </p>
        </div>
      </div>
    </div>

    <!-- ============ 主体应用卡片 ============ -->
    <div class="pz-card p-4 md:p-6 mb-6">
      <div class="idp-app">
        <!-- 中：画布预览区 -->
        <section
          class="idp-canvas-wrap"
          :class="{ 'idp-canvas-wrap--dragover': dragover }"
          @dragenter="onDragEnter"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <!-- 上传前：虚线上传区 -->
          <div v-if="!imageLoaded" class="idp-upload-zone">
            <div class="idp-upload-icon" aria-hidden="true">
              <Upload class="w-7 h-7" />
            </div>
            <h3 class="idp-upload-title">点击上传、拖拽或粘贴照片</h3>
            <p class="idp-upload-hint">支持 JPG/JPEG/PNG，长宽小于 8000 像素</p>
            <button
              type="button"
              class="pz-btn-primary"
              @click="triggerFileInput"
            >
              <Upload class="w-4 h-4" aria-hidden="true" />
              选择照片
            </button>
          </div>

          <!-- 上传后：预览 + 工具栏 + 生成遮罩 -->
          <div v-else class="idp-preview">
            <div
              class="idp-preview-viewport"
              :class="{ 'idp-preview-viewport--panning': isPanning }"
              @mousedown="onPanStart"
              @touchstart="onPanStart"
            >
              <img
                v-if="done && resultDataUrl"
                :src="resultDataUrl"
                alt="证件照合成结果"
                class="idp-preview-img"
                :style="previewTransformStyle"
                draggable="false"
              >
              <img
                v-else
                :src="previewDataUrl"
                alt="已上传照片预览"
                class="idp-preview-img"
                :style="previewTransformStyle"
                draggable="false"
              >
              <span class="idp-zoom-badge">{{ zoomPercent }}</span>
              <span v-if="isPanning" class="idp-pan-hint">拖动平移中…</span>
            </div>

            <!-- 工具按钮 -->
            <div class="idp-preview-toolbar">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="idp-tool-btn"
                  title="放大"
                  aria-label="放大"
                  @click="zoomIn"
                >
                  <ZoomIn class="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="idp-tool-btn"
                  title="缩小"
                  aria-label="缩小"
                  @click="zoomOut"
                >
                  <ZoomOut class="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="idp-tool-btn"
                  title="重置视图"
                  aria-label="重置视图"
                  @click="resetView"
                >
                  <RotateCcw class="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="idp-tool-btn"
                  title="重新上传"
                  aria-label="重新上传"
                  @click="reupload"
                >
                  <Upload class="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <span class="idp-preview-status">
                当前：{{ selectedBg.label }}底 · {{ selectedSize ? selectedSize.label : '未选尺寸' }}
              </span>
            </div>

            <!-- 生成中遮罩 -->
            <div v-if="generating" class="idp-generating-mask" role="status">
              <div class="idp-gen-card">
                <div class="idp-gen-spin">
                  <Loader2 class="w-6 h-6 animate-spin" aria-hidden="true" />
                </div>
                <h3 class="idp-gen-title">正在生成证件照…</h3>
                <div class="idp-gen-steps">
                  <template v-for="(step, index) in genSteps" :key="step">
                    <span
                      class="idp-gen-step"
                      :class="{
                        'idp-gen-step--active': index === genStep,
                        'idp-gen-step--done': index < genStep,
                      }"
                    >
                      {{ step }}
                    </span>
                    <ChevronRight
                      v-if="index < genSteps.length - 1"
                      class="w-3 h-3 idp-gen-chevron"
                      aria-hidden="true"
                    />
                  </template>
                </div>
                <div class="idp-gen-progress" aria-hidden="true">
                  <div
                    class="idp-gen-progress-fill"
                    :style="{ width: genProgress }"
                  />
                </div>
                <p class="idp-gen-tip">大约需要 3-5 秒</p>
              </div>
            </div>
          </div>

          <!-- 模型加载失败降级提示 -->
          <div v-if="modelFailed && !generating" class="idp-model-error" role="alert">
            <AlertTriangle class="w-5 h-5 shrink-0" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <div class="idp-model-error-title">AI 模型加载失败</div>
              <p class="idp-model-error-text">
                可能因网络受限无法加载本地分割模型，请检查网络后重试。后续将支持云端兜底。
              </p>
              <button
                type="button"
                class="pz-btn-secondary idp-model-retry"
                @click="retryModel"
              >
                <RefreshCcw class="w-4 h-4" aria-hidden="true" />
                重试加载模型
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <div
            v-if="errorMsg"
            class="idp-error-msg"
            role="alert"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{{ errorMsg }}</span>
          </div>

          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            accept="image/jpeg,image/jpg,image/png"
            aria-hidden="true"
            @change="onFileChange"
          >
        </section>

        <!-- 右：配置面板 -->
        <aside class="idp-config-panel">
          <!-- 照片底色 -->
          <div class="idp-panel-section">
            <h4 class="idp-panel-label">照片底色</h4>
            <div class="idp-bg-grid">
              <button
                v-for="bg in bgOptions"
                :key="bg.key"
                type="button"
                class="idp-swatch"
                :class="{ 'idp-swatch--selected': bgKey === bg.key }"
                @click="selectBg(bg.key)"
              >
                <span
                  class="idp-swatch-dot"
                  :style="swatchStyle(bg)"
                  aria-hidden="true"
                />
                <span class="idp-swatch-label">{{ bg.label }}</span>
              </button>
            </div>
          </div>

          <!-- 照片尺寸 -->
          <div class="idp-panel-section">
            <h4 class="idp-panel-label">照片尺寸</h4>
            <div class="idp-size-grid">
              <button
                v-for="size in sizeOptions"
                :key="size.key"
                type="button"
                class="idp-size-btn"
                :class="{ 'idp-size-btn--active': sizeKey === size.key }"
                @click="selectSize(size.key)"
              >
                <span class="idp-size-name">{{ size.label }}</span>
                <span class="idp-size-mm">{{ size.w }}×{{ size.h }}mm</span>
              </button>
            </div>
          </div>

          <!-- 操作区（状态机） -->
          <div class="idp-panel-actions">
            <!-- 未完成：开始制作 -->
            <template v-if="!done">
              <button
                type="button"
                class="pz-btn-primary w-full justify-center idp-start-btn"
                :disabled="!canStart"
                @click="startMake"
              >
                <Sparkles class="w-4 h-4" aria-hidden="true" />
                开始制作
              </button>
              <p v-if="!imageLoaded" class="idp-action-hint">
                上传照片后可开始制作
              </p>
              <p v-else-if="!selectedSize" class="idp-action-hint">
                请选择照片尺寸
              </p>
              <p v-else class="idp-action-hint">
                将生成 {{ targetSize.w }}×{{ targetSize.h }}px（300DPI）证件照
              </p>
            </template>

            <!-- 已完成：复制 / 下载 / 重新制作 -->
            <template v-else>
              <div class="idp-result-summary">
                <div class="idp-result-row">
                  <span class="idp-result-label">尺寸</span>
                  <span class="idp-result-value">{{ resultSizeLabel }}</span>
                </div>
                <div class="idp-result-row">
                  <span class="idp-result-label">底色</span>
                  <span class="idp-result-value">{{ resultBgLabel }}</span>
                </div>
                <div class="idp-result-row">
                  <span class="idp-result-label">像素</span>
                  <span class="idp-result-value">{{ resultPixelText }}</span>
                </div>
                <div class="idp-result-row">
                  <span class="idp-result-label">分辨率</span>
                  <span class="idp-result-value">300 DPI</span>
                </div>
              </div>
              <button
                type="button"
                class="pz-btn-secondary w-full justify-center"
                @click="copyResult"
              >
                <Copy class="w-4 h-4" aria-hidden="true" />
                一键复制
              </button>
              <button
                type="button"
                class="pz-btn-primary w-full justify-center"
                @click="downloadResult"
              >
                <Download class="w-4 h-4" aria-hidden="true" />
                立即下载
              </button>
              <button
                type="button"
                class="idp-remake-link"
                @click="resetResult"
              >
                <RefreshCcw class="w-4 h-4" aria-hidden="true" />
                重新制作
              </button>
            </template>
          </div>
        </aside>
      </div>
    </div>

    <!-- ============ 案例参考区 ============ -->
    <div class="pz-card p-4 mb-6">
      <h3
        class="text-sm font-medium mb-4"
        style="color: var(--pz-color-text-primary)"
      >
        试试这些示例
      </h3>
      <div class="idp-sample-grid">
        <button
          v-for="sample in samples"
          :key="sample.src"
          type="button"
          class="idp-sample-btn"
          @click="loadSample(sample.src, sample.name)"
        >
          <img
            :src="sample.src"
            :alt="sample.label"
            class="idp-sample-img"
            loading="lazy"
          >
          <span class="idp-sample-label">{{ sample.label }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 轻量 toast ============ -->
    <Transition name="idp-toast">
      <div
        v-if="toastMsg"
        class="idp-toast"
        :class="`idp-toast--${toastKind}`"
        role="status"
      >
        <component :is="toastIcon" class="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{{ toastMsg }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* === 顶部标题 === */
.idp-header-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pz-radius-full);
}

/* === 应用布局：画布 | 配置面板 === */
.idp-app {
  display: flex;
  gap: 1.25rem;
  align-items: stretch;
}

/* === 中：画布区 === */
.idp-canvas-wrap {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px dashed transparent;
  border-radius: var(--pz-radius-lg);
  transition: border-color 0.15s ease;
}
.idp-canvas-wrap--dragover {
  border-color: var(--pz-color-primary);
}

/* 上传区 */
.idp-upload-zone {
  flex: 1 1 auto;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
  border: 2px dashed var(--pz-color-border-strong);
  border-radius: var(--pz-radius-lg);
  background-color: var(--pz-color-bg-secondary);
  padding: 3rem 1.5rem;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.idp-upload-zone:hover,
.idp-canvas-wrap--dragover .idp-upload-zone {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}
.idp-upload-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pz-radius-full);
  background-color: var(--pz-color-primary-light);
  color: var(--pz-color-primary);
}
.idp-upload-title {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-base);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
}
.idp-upload-hint {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-tertiary);
  margin-bottom: 0.5rem;
}

/* 预览区 */
.idp-preview {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 380px;
}
.idp-preview-viewport {
  position: relative;
  flex: 1 1 auto;
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--pz-color-bg-tertiary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.idp-preview-viewport--panning {
  cursor: grabbing;
}
.idp-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--pz-radius-sm);
  box-shadow: var(--pz-shadow-sm);
  transform-origin: center center;
  will-change: transform;
}
.idp-zoom-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-inverse);
  background-color: rgba(0, 0, 0, 0.55);
  padding: 0.25rem 0.5rem;
  border-radius: var(--pz-radius-sm);
  pointer-events: none;
}
.idp-pan-hint {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-inverse);
  background-color: rgba(0, 0, 0, 0.55);
  padding: 0.25rem 0.625rem;
  border-radius: var(--pz-radius-sm);
  pointer-events: none;
  white-space: nowrap;
}

/* 预览工具栏 */
.idp-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.625rem;
}
.idp-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--pz-color-text-secondary);
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}
.idp-tool-btn:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}
.idp-preview-status {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
}

/* 生成中遮罩 */
.idp-generating-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: color-mix(in srgb, var(--pz-color-bg) 78%, transparent);
  backdrop-filter: blur(3px);
  border-radius: var(--pz-radius-lg);
}
.idp-gen-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-lg);
  box-shadow: var(--pz-shadow-lg);
  padding: 1.5rem;
}
.idp-gen-spin {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pz-radius-full);
  background-color: var(--pz-color-primary-light);
  color: var(--pz-color-primary);
  margin-bottom: 0.75rem;
}
.idp-gen-title {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-base);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  margin-bottom: 0.75rem;
}
.idp-gen-steps {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.idp-gen-step {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
  white-space: nowrap;
}
.idp-gen-step--active {
  color: var(--pz-color-primary);
  font-weight: var(--pz-weight-medium);
}
.idp-gen-step--done {
  color: var(--pz-color-text-secondary);
}
.idp-gen-chevron {
  flex-shrink: 0;
  color: var(--pz-color-text-tertiary);
}
.idp-gen-progress {
  width: 100%;
  height: 6px;
  overflow: hidden;
  border-radius: var(--pz-radius-full);
  background-color: var(--pz-color-bg-tertiary);
  margin-bottom: 0.75rem;
}
.idp-gen-progress-fill {
  height: 100%;
  border-radius: var(--pz-radius-full);
  background-color: var(--pz-color-primary);
  transition: width 0.3s ease;
}
.idp-gen-tip {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
}

/* 模型加载失败降级提示 */
.idp-model-error {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  background-color: var(--pz-state-error-bg);
  border: 1px solid var(--pz-state-error-border);
  border-radius: var(--pz-radius-md);
  color: var(--pz-state-error);
}
.idp-model-error-title {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-primary);
}
.idp-model-error-text {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-secondary);
  line-height: var(--pz-leading-normal);
  margin-top: 0.25rem;
}
.idp-model-retry {
  margin-top: 0.625rem;
  padding: 0.375rem 0.875rem;
  font-size: var(--pz-text-xs);
}

/* 错误提示 */
.idp-error-msg {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-state-error);
  line-height: var(--pz-leading-normal);
}

/* === 右：配置面板 === */
.idp-config-panel {
  flex: 0 0 280px;
  width: 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-left: 1.25rem;
  border-left: 1px solid var(--pz-color-border-light);
}
.idp-panel-section {
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}
.idp-panel-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  margin-bottom: 0.75rem;
}

/* 底色 swatch */
.idp-bg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.idp-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.25rem;
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  user-select: none;
}
.idp-swatch:hover {
  border-color: var(--pz-color-primary-border);
  background-color: var(--pz-color-bg-secondary);
}
.idp-swatch--selected {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}
.idp-swatch-dot {
  width: 24px;
  height: 24px;
  border-radius: var(--pz-radius-full);
  border: 1px solid var(--pz-color-border-strong);
}
.idp-swatch-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-secondary);
}
.idp-swatch--selected .idp-swatch-label {
  color: var(--pz-color-primary);
  font-weight: var(--pz-weight-medium);
}

/* 尺寸按钮 */
.idp-size-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.idp-size-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem;
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
  user-select: none;
}
.idp-size-btn:hover {
  border-color: var(--pz-color-primary-border);
}
.idp-size-name {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
}
.idp-size-mm {
  font-family: var(--pz-font-sans);
  font-size: 10px;
  line-height: 1.2;
  color: var(--pz-color-text-tertiary);
}
.idp-size-btn--active {
  background-color: var(--pz-color-primary-light);
  border-color: var(--pz-color-primary);
}
.idp-size-btn--active .idp-size-name {
  color: var(--pz-color-primary);
}
.idp-size-btn--active .idp-size-mm {
  color: var(--pz-color-primary);
  opacity: 0.8;
}

/* 操作区 */
.idp-panel-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
.idp-start-btn {
  padding: 0.625rem 1.25rem;
}
.pz-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.idp-action-hint {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
  text-align: center;
}

/* 结果摘要 */
.idp-result-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background-color: var(--pz-color-bg-secondary);
  border-radius: var(--pz-radius-md);
  margin-bottom: 0.375rem;
}
.idp-result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
}
.idp-result-label {
  color: var(--pz-color-text-secondary);
}
.idp-result-value {
  color: var(--pz-color-text-primary);
  font-weight: var(--pz-weight-medium);
}
.idp-remake-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.375rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
}
.idp-remake-link:hover {
  color: var(--pz-color-primary);
}

/* === 案例参考区 === */
.idp-sample-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  overflow-x: auto;
}
.idp-sample-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.idp-sample-btn:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-bg-secondary);
}
.idp-sample-img {
  width: 80px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--pz-radius-sm);
}
.idp-sample-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-secondary);
}

/* === toast === */
.idp-toast {
  position: fixed;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: min(90vw, 420px);
  padding: 0.625rem 1rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-inverse);
  background-color: rgba(15, 23, 42, 0.92);
  border-radius: var(--pz-radius-md);
  box-shadow: var(--pz-shadow-floating);
  pointer-events: none;
}
.idp-toast--success {
  background-color: var(--pz-state-success);
}
.idp-toast--error {
  background-color: var(--pz-state-error);
}
.idp-toast-enter-active,
.idp-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.idp-toast-enter-from,
.idp-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* === 响应式：窄屏纵向堆叠 === */
@media (max-width: 1100px) {
  .idp-app {
    flex-direction: column;
  }
  .idp-config-panel {
    flex: none;
    width: 100%;
    padding-left: 0;
    padding-top: 1.25rem;
    border-left: none;
    border-top: 1px solid var(--pz-color-border-light);
  }
}

@media (max-width: 640px) {
  .idp-sample-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .idp-upload-zone,
  .idp-preview {
    min-height: 300px;
  }
  .idp-preview-viewport {
    min-height: 260px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .idp-tool-btn,
  .idp-swatch,
  .idp-size-btn,
  .idp-sample-btn,
  .idp-gen-progress-fill,
  .idp-toast-enter-active,
  .idp-toast-leave-active {
    transition: none;
  }
}
</style>
