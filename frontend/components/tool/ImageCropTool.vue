<script setup lang="ts">
/**
 * ImageCropTool.vue - 图片裁剪工具组件
 *
 * 严格参照 ui/pages/图片裁剪.html 交互区结构：
 * 1. 上传拖拽区（支持点击/拖拽上传，JPG/PNG/GIF/WebP/BMP，最大 20MB）
 * 2. 裁剪工作区（Canvas + 可拖拽裁剪框 + 8 个调整手柄 + 右侧参数面板）
 *    - 裁剪比例：自由 / 1:1 / 4:3 / 3:4 / 16:9 / 9:16 / 3:2 / 2:3
 *    - 旋转：向左/向右 90°、水平/垂直翻转
 *    - 实时尺寸显示（W/H/X/Y）
 *    - 操作：应用裁剪 / 重置 / 重新上传
 * 3. 预览与下载（预览图 + 原始/裁剪后尺寸对比 + 格式/质量选择 + 下载）
 * 4. 本地处理保障提示
 * 5. 常见问题 FAQ
 *
 * SubTask 17.1: 裁剪 UI（上传、裁剪框、比例选择、尺寸设置、预览、下载）
 * SubTask 17.2: EXIF 方向修正 + Canvas 裁剪与重采样，导出 png/jpg
 * SubTask 17.3: 工具页 SEO + 接入统计/点赞（通过 ToolLayout，核心操作触发 tool_use，下载触发 download）
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 应用裁剪 → tool_use 事件
 * - 下载裁剪图片 → download 事件
 */
import {
  Check,
  ChevronDown,
  Crop,
  Download,
  Eye,
  FileImage,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  Lock,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Upload,
} from 'lucide-vue-next'
import {
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  getOutputFilename,
  loadImageWithOrientation,
  type ImageFormat,
} from '~/utils/tools/image'

/** 广告数据接口 */
interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

/** SSR 获取图片工具中间广告数据（img_tool_middle） */
const { data: adData } = await useAsyncData<AdItem | null>(
  'img-tool-middle-ad',
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    try {
      const response = await $fetch<{
        code: number
        data: AdItem[]
      }>('/api/v1/ads', {
        baseURL,
        params: { locationSymbol: 'img_tool_middle' },
      })
      if (response.code === 0 && response.data && response.data.length > 0) {
        return response.data[0]
      }
      return null
    } catch {
      return null
    }
  },
  { default: () => null }
)

useHead({
  titleTemplate: null,
  title: '图片裁剪工具 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线图片裁剪工具，支持自定义尺寸、多比例裁剪、旋转翻转，本地浏览器处理不上传，免登录一键导出高清原图。'
    },
    {
      name: 'keywords',
      content: '图片裁剪,在线裁剪图片,图片旋转,自定义尺寸'
    },
    {
      property: 'og:title',
      content: '图片裁剪工具 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线图片裁剪工具，支持自定义尺寸、多比例裁剪、旋转翻转，本地浏览器处理不上传，免登录一键导出高清原图。'
    }
  ]
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const route = useRoute()
const { reportEvent } = useAnalytics()

/** 用于事件上报的 slug：优先使用 prop，其次路由参数 */
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'image-crop',
)

// === 常量 ===
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]

/** 裁剪比例选项（value = 宽/高比，0 表示自由） */
const ratioOptions: { label: string; value: number }[] = [
  { label: '自由', value: 0 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 1.3333 },
  { label: '3:4', value: 0.75 },
  { label: '16:9', value: 1.7778 },
  { label: '9:16', value: 0.5625 },
  { label: '3:2', value: 1.5 },
  { label: '2:3', value: 0.6667 },
]

/** 8 个调整手柄 */
const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as const

// === 状态 ===
/** EXIF 方向修正后的源 canvas（不含旋转/翻转） */
const sourceCanvas = ref<HTMLCanvasElement | null>(null)
/** 当前画布尺寸（旋转/翻转后，图像像素坐标） */
const origWidth = ref(0)
const origHeight = ref(0)
/** 旋转角度 0/90/180/270 */
const rotation = ref(0)
const flipH = ref(false)
const flipV = ref(false)
/** 裁剪比例：0 = 自由，否则宽/高比 */
const ratio = ref(0)
/** 裁剪框（图像像素坐标） */
const crop = reactive({ x: 0, y: 0, w: 0, h: 0 })
/** 裁剪结果 canvas */
const croppedCanvas = ref<HTMLCanvasElement | null>(null)
const originalFileName = ref('')
/** 原始图片尺寸（EXIF 修正后，用于对比展示） */
const originalNaturalSize = reactive({ w: 0, h: 0 })

// === 画布显示尺寸（CSS 像素，用于裁剪框定位） ===
const displayWidth = ref(0)
const displayHeight = ref(0)
const containerWidth = ref(0)
const containerHeight = ref(0)

// === UI 可见性 ===
const imageLoaded = ref(false)
const cropApplied = ref(false)
const dragover = ref(false)
const errorMsg = ref('')

// === 预览 / 下载状态 ===
const previewUrl = ref('')
const fileSizeText = ref('')
const format = ref<'png' | 'jpeg' | 'webp'>('png')
const quality = ref(0.9)

// === 模板引用 ===
const fileInputRef = ref<HTMLInputElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// === 计算属性 ===
/** 图像像素 → 显示像素的缩放比 */
const scale = computed(() =>
  origWidth.value > 0 ? displayWidth.value / origWidth.value : 1,
)

/** 画布在容器中的居中偏移（flex 居中导致） */
const offsetX = computed(() =>
  Math.max(0, (containerWidth.value - displayWidth.value) / 2),
)
const offsetY = computed(() =>
  Math.max(0, (containerHeight.value - displayHeight.value) / 2),
)

/** 裁剪框样式（显示坐标） */
const cropRectStyle = computed(() => {
  const s = scale.value
  return {
    left: `${offsetX.value + crop.x * s}px`,
    top: `${offsetY.value + crop.y * s}px`,
    width: `${crop.w * s}px`,
    height: `${crop.h * s}px`,
  }
})

/** 画布左上角实时尺寸标签 */
const dimensionsText = computed(
  () => `${Math.round(crop.w)} x ${Math.round(crop.h)}`,
)

/** PNG 格式不支持质量调节 */
const isQualityDisabled = computed(() => format.value === 'png')

/** 当前格式对应的 MIME 类型 */
const formatMime = computed<ImageFormat>(() => {
  if (format.value === 'png') return 'image/png'
  if (format.value === 'jpeg') return 'image/jpeg'
  return 'image/webp'
})

/** 原始尺寸文本 */
const originalSizeText = computed(() =>
  originalNaturalSize.w
    ? `${originalNaturalSize.w} x ${originalNaturalSize.h}`
    : '-',
)

/** 裁剪后尺寸文本 */
const croppedSizeText = computed(() =>
  croppedCanvas.value
    ? `${croppedCanvas.value.width} x ${croppedCanvas.value.height}`
    : '-',
)

// === 工具函数 ===
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
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

function onDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragover.value = true
}
function onDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragover.value = true
}
function onDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragover.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragover.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

/** 处理上传文件：校验格式/大小，加载图片并修正 EXIF 方向 */
async function handleFile(file: File) {
  if (!file) return
  if (import.meta.server) return

  if (!ACCEPTED_TYPES.includes(file.type)) {
    errorMsg.value =
      '不支持的图片格式，请上传 JPG、PNG、GIF、WebP 或 BMP 格式的图片。'
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    errorMsg.value = '文件大小超过 20MB 限制，请压缩后重试。'
    return
  }
  errorMsg.value = ''
  originalFileName.value = file.name

  try {
    const canvas = await loadImageWithOrientation(file)
    sourceCanvas.value = canvas
    originalNaturalSize.w = canvas.width
    originalNaturalSize.h = canvas.height
    // 重置变换
    rotation.value = 0
    flipH.value = false
    flipV.value = false
    ratio.value = 0
    cropApplied.value = false
    croppedCanvas.value = null
    previewUrl.value = ''
    fileSizeText.value = ''

    imageLoaded.value = true
    await nextTick()
    renderImage()
    initCropRect()
  } catch {
    errorMsg.value = '图片加载失败，请检查文件是否损坏。'
  }
}

// === 渲染图片到画布（含旋转/翻转） ===
function renderImage() {
  if (!sourceCanvas.value || !canvasRef.value) return
  const src = sourceCanvas.value
  const rot = rotation.value % 360
  const swap = rot === 90 || rot === 270
  const w = swap ? src.height : src.width
  const h = swap ? src.width : src.height
  origWidth.value = w
  origHeight.value = h

  const canvas = canvasRef.value
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.save()
  ctx.clearRect(0, 0, w, h)
  ctx.translate(w / 2, h / 2)
  if (rot === 90) ctx.rotate(Math.PI / 2)
  else if (rot === 180) ctx.rotate(Math.PI)
  else if (rot === 270) ctx.rotate(-Math.PI / 2)
  if (flipH.value) ctx.scale(-1, 1)
  if (flipV.value) ctx.scale(1, -1)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  ctx.restore()

  fitCanvasDisplay()
}

/** 将画布显示尺寸适配到容器（保持比例，仅缩小不放大） */
function fitCanvasDisplay() {
  if (!canvasContainerRef.value || !canvasRef.value) return
  if (!origWidth.value || !origHeight.value) return
  const cW = canvasContainerRef.value.clientWidth
  const cH = Math.max(300, cW * 0.6)
  canvasContainerRef.value.style.height = `${cH}px`
  const s = Math.min(cW / origWidth.value, cH / origHeight.value, 1)
  const dW = origWidth.value * s
  const dH = origHeight.value * s
  canvasRef.value.style.width = `${dW}px`
  canvasRef.value.style.height = `${dH}px`
  // 更新响应式显示状态（驱动裁剪框定位）
  displayWidth.value = dW
  displayHeight.value = dH
  containerWidth.value = cW
  containerHeight.value = cH
}

// === 裁剪框初始化 ===
function initCropRect() {
  const w = origWidth.value
  const h = origHeight.value
  let cw = w * 0.8
  let ch = h * 0.8
  if (ratio.value > 0) {
    if (cw / ch > ratio.value) {
      cw = ch * ratio.value
    } else {
      ch = cw / ratio.value
    }
  }
  crop.x = (w - cw) / 2
  crop.y = (h - ch) / 2
  crop.w = cw
  crop.h = ch
}

// === 裁剪框拖拽（移动 + 调整大小） ===
let dragMode: string | null = null
interface DragStart {
  px: number
  py: number
  cx: number
  cy: number
  cw: number
  ch: number
}
let dragStart: DragStart | null = null

function getEventPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if (!canvasContainerRef.value) return { x: 0, y: 0 }
  const rect = canvasContainerRef.value.getBoundingClientRect()
  const clientX =
    'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX
  const clientY =
    'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function onDragStart(e: MouseEvent | TouchEvent) {
  if (!imageLoaded.value) return
  const target = e.target as HTMLElement
  const handle = target.getAttribute('data-handle')
  dragMode = handle || 'move'
  const pos = getEventPos(e)
  dragStart = {
    px: pos.x,
    py: pos.y,
    cx: crop.x,
    cy: crop.y,
    cw: crop.w,
    ch: crop.h,
  }
  e.preventDefault()
  e.stopPropagation()
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!dragMode || !dragStart) return
  e.preventDefault()
  const pos = getEventPos(e)
  const s = scale.value
  const dx = (pos.x - dragStart.px) / s
  const dy = (pos.y - dragStart.py) / s
  const minSize = 10
  let x = dragStart.cx
  let y = dragStart.cy
  let w = dragStart.cw
  let h = dragStart.ch

  if (dragMode === 'move') {
    x = clamp(dragStart.cx + dx, 0, origWidth.value - w)
    y = clamp(dragStart.cy + dy, 0, origHeight.value - h)
  } else {
    // 调整大小
    let newX = dragStart.cx
    let newY = dragStart.cy
    let newW = dragStart.cw
    let newH = dragStart.ch
    if (dragMode.includes('n')) {
      newY = dragStart.cy + dy
      newH = dragStart.ch - dy
    }
    if (dragMode.includes('s')) {
      newH = dragStart.ch + dy
    }
    if (dragMode.includes('w')) {
      newX = dragStart.cx + dx
      newW = dragStart.cw - dx
    }
    if (dragMode.includes('e')) {
      newW = dragStart.cw + dx
    }
    // 最小尺寸约束
    if (newW < minSize) {
      if (dragMode.includes('w'))
        newX = dragStart.cx + dragStart.cw - minSize
      newW = minSize
    }
    if (newH < minSize) {
      if (dragMode.includes('n'))
        newY = dragStart.cy + dragStart.ch - minSize
      newH = minSize
    }
    // 锁定宽高比
    if (ratio.value > 0) {
      const r = ratio.value
      if (dragMode === 'n' || dragMode === 's') {
        newW = newH * r
        if (!dragMode.includes('w'))
          newX = dragStart.cx + (dragStart.cw - newW) / 2
      } else if (dragMode === 'e' || dragMode === 'w') {
        newH = newW / r
        if (!dragMode.includes('n'))
          newY = dragStart.cy + (dragStart.ch - newH) / 2
      } else {
        // 角手柄：按变化较大的维度决定
        if (
          Math.abs(newW - dragStart.cw) / r >
          Math.abs(newH - dragStart.ch)
        ) {
          newH = newW / r
        } else {
          newW = newH * r
        }
        if (dragMode.includes('n'))
          newY = dragStart.cy + dragStart.ch - newH
        if (dragMode.includes('w'))
          newX = dragStart.cx + dragStart.cw - newW
      }
    }
    // 约束到图片边界
    if (newX < 0) {
      newW += newX
      newX = 0
      if (ratio.value > 0) newH = newW / ratio.value
    }
    if (newY < 0) {
      newH += newY
      newY = 0
      if (ratio.value > 0) newW = newH * ratio.value
    }
    if (newX + newW > origWidth.value) {
      newW = origWidth.value - newX
      if (ratio.value > 0) newH = newW / ratio.value
    }
    if (newY + newH > origHeight.value) {
      newH = origHeight.value - newY
      if (ratio.value > 0) newW = newH * ratio.value
    }
    if (newW < minSize) newW = minSize
    if (newH < minSize) newH = minSize
    x = newX
    y = newY
    w = newW
    h = newH
  }
  crop.x = x
  crop.y = y
  crop.w = w
  crop.h = h
}

function onDragEnd() {
  dragMode = null
  dragStart = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
}

// === 裁剪比例选择 ===
function selectRatio(value: number) {
  ratio.value = value
  if (value > 0) {
    const cx = crop.x + crop.w / 2
    const cy = crop.y + crop.h / 2
    const maxW = origWidth.value * 0.8
    const maxH = origHeight.value * 0.8
    let newW: number
    let newH: number
    if (maxW / maxH > value) {
      newH = maxH
      newW = newH * value
    } else {
      newW = maxW
      newH = newW / value
    }
    crop.w = newW
    crop.h = newH
    crop.x = clamp(cx - newW / 2, 0, origWidth.value - newW)
    crop.y = clamp(cy - newH / 2, 0, origHeight.value - newH)
  }
}

// === 旋转 / 翻转 ===
function rotateLeft() {
  rotation.value = (rotation.value + 270) % 360
  renderImage()
  initCropRect()
}
function rotateRight() {
  rotation.value = (rotation.value + 90) % 360
  renderImage()
  initCropRect()
}
function toggleFlipH() {
  flipH.value = !flipH.value
  renderImage()
}
function toggleFlipV() {
  flipV.value = !flipV.value
  renderImage()
}

// === 应用裁剪 ===
async function applyCrop() {
  if (!canvasRef.value) return
  let sx = Math.round(crop.x)
  let sy = Math.round(crop.y)
  let sw = Math.round(crop.w)
  let sh = Math.round(crop.h)
  sx = clamp(sx, 0, origWidth.value - 1)
  sy = clamp(sy, 0, origHeight.value - 1)
  sw = clamp(sw, 1, origWidth.value - sx)
  sh = clamp(sh, 1, origHeight.value - sy)

  const out = document.createElement('canvas')
  out.width = sw
  out.height = sh
  const octx = out.getContext('2d')
  if (!octx) return
  octx.drawImage(canvasRef.value, sx, sy, sw, sh, 0, 0, sw, sh)
  croppedCanvas.value = out
  cropApplied.value = true

  // 生成预览
  previewUrl.value = out.toDataURL('image/png')

  // 上报 tool_use 事件
  reportEvent('tool_use', effectiveSlug.value)

  // 估算文件大小
  await updateFileSize()

  // 滚动到预览区
  if (import.meta.client) {
    await nextTick()
    const el = document.getElementById('pz-crop-preview-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** 根据当前格式/质量估算裁剪结果文件大小 */
async function updateFileSize() {
  if (!croppedCanvas.value) return
  try {
    const blob = await canvasToBlob(
      croppedCanvas.value,
      formatMime.value,
      quality.value,
    )
    fileSizeText.value = formatFileSize(blob.size)
  } catch {
    fileSizeText.value = '-'
  }
}

// === 重置 ===
function resetAll() {
  if (!sourceCanvas.value) return
  rotation.value = 0
  flipH.value = false
  flipV.value = false
  ratio.value = 0
  renderImage()
  initCropRect()
}

// === 重新上传 ===
function reupload() {
  sourceCanvas.value = null
  croppedCanvas.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
  previewUrl.value = ''
  imageLoaded.value = false
  cropApplied.value = false
  errorMsg.value = ''
  fileSizeText.value = ''
}

// === 下载裁剪图片 ===
async function downloadCropped() {
  if (!croppedCanvas.value) return
  try {
    const blob = await canvasToBlob(
      croppedCanvas.value,
      formatMime.value,
      quality.value,
    )
    const baseName = originalFileName.value || 'image'
    const filename = getOutputFilename(`cropped_${baseName}`, formatMime.value)
    downloadBlob(blob, filename)
    // 上报 download 事件
    reportEvent('download', effectiveSlug.value)
  } catch {
    errorMsg.value = '下载失败，请重试。'
  }
}

// === 格式 / 质量变更 ===
function onFormatChange() {
  updateFileSize()
}
function onQualityInput() {
  updateFileSize()
}

// === 窗口尺寸变化：重新适配画布 ===
let resizeTimer: ReturnType<typeof setTimeout> | null = null
function onWindowResize() {
  if (!imageLoaded.value) return
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    fitCanvasDisplay()
  }, 150)
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('resize', onWindowResize)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', onWindowResize)
    if (resizeTimer) clearTimeout(resizeTimer)
  }
  // 清理拖拽监听
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
})
</script>

<template>
  <div>
    <!-- 1. 上传拖拽区 -->
    <div v-if="!imageLoaded" class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <FileImage
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          上传图片
        </h2>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
        aria-hidden="true"
        @change="onFileChange"
      >
      <div
        class="pz-crop-upload-zone"
        :class="{ 'pz-dragover': dragover }"
        role="button"
        tabindex="0"
        aria-label="上传图片"
        @click="triggerFileInput"
        @keydown.enter.prevent="triggerFileInput"
        @keydown.space.prevent="triggerFileInput"
        @dragover="onDragOver"
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <div class="flex flex-col items-center gap-3">
          <ImageIcon
            class="w-10 h-10"
            style="color: var(--pz-color-text-tertiary)"
            aria-hidden="true"
          />
          <div
            class="text-sm font-medium"
            style="color: var(--pz-color-text-primary)"
          >
            拖拽图片到此处或点击上传
          </div>
          <div class="text-xs" style="color: var(--pz-color-text-tertiary)">
            支持 JPG、PNG、GIF、WebP、BMP 格式，最大 20MB
          </div>
        </div>
      </div>
      <!-- 错误提示 -->
      <div
        v-if="errorMsg"
        class="mt-3 text-sm flex items-start gap-2"
        style="color: var(--pz-state-error)"
        role="alert"
      >
        <span>{{ errorMsg }}</span>
      </div>
      <p v-else class="text-xs mt-3" style="color: var(--pz-color-text-tertiary)">
        图片不会上传到服务器，所有处理在浏览器本地完成。
      </p>
    </div>

    <!-- 2. 裁剪工作区 -->
    <div v-if="imageLoaded" class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Crop
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          裁剪工作区
        </h2>
      </div>
      <div class="pz-crop-workspace">
        <!-- 左：画布区域 -->
        <div class="pz-crop-canvas-area">
          <div
            ref="canvasContainerRef"
            class="pz-crop-canvas-container"
          >
            <canvas ref="canvasRef" />
            <div class="pz-crop-dimensions">{{ dimensionsText }}</div>
            <div
              class="pz-crop-rect"
              :style="cropRectStyle"
              @mousedown="onDragStart"
              @touchstart="onDragStart"
            >
              <div
                v-for="h in handles"
                :key="h"
                :class="`pz-crop-handle pz-crop-handle--${h}`"
                :data-handle="h"
              />
            </div>
          </div>
        </div>
        <!-- 右：参数面板 -->
        <div class="pz-crop-panel pz-card p-4">
          <!-- 裁剪比例 -->
          <div class="pz-crop-panel-section">
            <div class="pz-crop-panel-label">裁剪比例</div>
            <div class="pz-crop-ratio-grid">
              <button
                v-for="opt in ratioOptions"
                :key="opt.label"
                type="button"
                class="pz-crop-ratio-btn"
                :class="{
                  'pz-crop-ratio-btn--active': ratio === opt.value,
                }"
                @click="selectRatio(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <!-- 旋转 / 翻转 -->
          <div class="pz-crop-panel-section">
            <div class="pz-crop-panel-label">旋转</div>
            <div class="pz-crop-rotate-btns">
              <button
                type="button"
                class="pz-crop-action-btn"
                @click="rotateLeft"
              >
                <RotateCcw class="w-[14px] h-[14px]" aria-hidden="true" />
                向左旋转 90°
              </button>
              <button
                type="button"
                class="pz-crop-action-btn"
                @click="rotateRight"
              >
                <RotateCw class="w-[14px] h-[14px]" aria-hidden="true" />
                向右旋转 90°
              </button>
              <button
                type="button"
                class="pz-crop-action-btn"
                @click="toggleFlipH"
              >
                <FlipHorizontal class="w-[14px] h-[14px]" aria-hidden="true" />
                水平翻转
              </button>
              <button
                type="button"
                class="pz-crop-action-btn"
                @click="toggleFlipV"
              >
                <FlipVertical class="w-[14px] h-[14px]" aria-hidden="true" />
                垂直翻转
              </button>
            </div>
          </div>
          <!-- 裁剪尺寸 -->
          <div class="pz-crop-panel-section">
            <div class="pz-crop-panel-label">裁剪尺寸</div>
            <div class="pz-crop-info-row">
              <span class="pz-crop-info-label">宽度 (W)</span>
              <span class="pz-crop-info-value">{{ Math.round(crop.w) }}</span>
            </div>
            <div class="pz-crop-info-row">
              <span class="pz-crop-info-label">高度 (H)</span>
              <span class="pz-crop-info-value">{{ Math.round(crop.h) }}</span>
            </div>
            <div class="pz-crop-info-row">
              <span class="pz-crop-info-label">X 坐标</span>
              <span class="pz-crop-info-value">{{ Math.round(crop.x) }}</span>
            </div>
            <div class="pz-crop-info-row">
              <span class="pz-crop-info-label">Y 坐标</span>
              <span class="pz-crop-info-value">{{ Math.round(crop.y) }}</span>
            </div>
          </div>
          <!-- 操作 -->
          <div class="pz-crop-panel-section">
            <div class="pz-crop-panel-label">操作</div>
            <div class="flex flex-col gap-2">
              <button
                type="button"
                class="pz-btn-primary w-full justify-center"
                @click="applyCrop"
              >
                <Check class="w-4 h-4" aria-hidden="true" />
                应用裁剪
              </button>
              <button
                type="button"
                class="pz-btn-secondary w-full justify-center"
                @click="resetAll"
              >
                <RefreshCw class="w-4 h-4" aria-hidden="true" />
                重置
              </button>
              <button
                type="button"
                class="pz-btn-secondary w-full justify-center"
                @click="reupload"
              >
                <Upload class="w-4 h-4" aria-hidden="true" />
                重新上传
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 预览与下载 -->
    <div
      v-if="cropApplied"
      id="pz-crop-preview-section"
      class="pz-card p-4 mb-6"
    >
      <div class="flex items-center gap-2 mb-3">
        <Eye
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          预览与下载
        </h2>
      </div>
      <div class="pz-crop-preview">
        <div class="pz-crop-preview-img">
          <img v-if="previewUrl" :src="previewUrl" alt="裁剪预览">
        </div>
        <div class="pz-crop-preview-compare">
          <div class="pz-crop-preview-compare-item">
            <span class="pz-crop-compare-label">原始尺寸</span>
            <span class="pz-crop-compare-value">{{ originalSizeText }}</span>
          </div>
          <div class="pz-crop-preview-compare-item">
            <span class="pz-crop-compare-label">裁剪后尺寸</span>
            <span class="pz-crop-compare-value">{{ croppedSizeText }}</span>
          </div>
          <div class="pz-crop-preview-compare-item">
            <span class="pz-crop-compare-label">文件大小</span>
            <span class="pz-crop-compare-value">{{ fileSizeText || '-' }}</span>
          </div>
        </div>
        <div class="pz-crop-download-bar">
          <select
            v-model="format"
            class="pz-crop-format-select"
            aria-label="下载格式"
            @change="onFormatChange"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
          <div
            class="pz-crop-quality-wrap"
            :style="{ opacity: isQualityDisabled ? 0.5 : 1 }"
          >
            <span>质量</span>
            <input
              v-model.number="quality"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              :disabled="isQualityDisabled"
              @input="onQualityInput"
            >
            <span class="pz-crop-quality-value">{{ quality.toFixed(1) }}</span>
          </div>
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            @click="downloadCropped"
          >
            <Download class="w-4 h-4" aria-hidden="true" />
            下载裁剪图片
          </button>
        </div>
      </div>
    </div>

    <!-- 4. 本地处理保障 -->
    <div class="pz-crop-privacy">
      <div class="pz-crop-privacy-icon" aria-hidden="true">
        <Lock class="w-[18px] h-[18px]" />
      </div>
      <div>
        <div class="pz-crop-privacy-title">本地处理保障</div>
        <div class="pz-crop-privacy-text">
          所有图片处理在浏览器本地完成，图片不会上传到服务器，确保您的隐私安全。
        </div>
      </div>
    </div>

    <!-- ============ 广告位（本地处理保障和常见问题之间） ============ -->
    <div class="my-6">
      <StaticAdCard
        v-if="adData"
        id="imageCropMiddle"
        :title="adData.product_description"
        :image-url="adData.product_url"
        :link-url="adData.ad_url"
      />
    </div>

    <!-- 5. 常见问题 -->
    <section class="pb-8">
      <h2
        class="text-xl font-semibold mb-4"
        style="
          color: var(--pz-color-text-primary);
          font-family: var(--pz-font-display);
          text-wrap: balance;
        "
      >
        常见问题
      </h2>
      <div class="flex flex-col gap-3">
        <details class="pz-faq pz-card pz-card-hover p-4" open>
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              支持哪些图片格式？
            </span>
            <ChevronDown
              class="w-4 h-4 pz-faq-chevron shrink-0"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
          </summary>
          <p
            class="text-sm mt-3"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            支持 JPG、PNG、GIF、WebP、BMP
            等常见图片格式，最大文件大小为
            20MB。如果您的图片超过此限制，建议先使用图片压缩工具进行压缩。所有格式均可裁剪并导出为
            PNG、JPEG 或 WebP 格式。
          </p>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              裁剪后图片质量会下降吗？
            </span>
            <ChevronDown
              class="w-4 h-4 pz-faq-chevron shrink-0"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
          </summary>
          <div
            class="text-sm mt-3 flex flex-col gap-2"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            <p>
              裁剪操作本身不会降低图片质量。裁剪只是选取原图的一个区域，不会对像素进行缩放或压缩。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >PNG 格式：</strong
              >无损保存，适合需要最高质量的场景，但文件体积较大。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >JPEG 格式：</strong
              >有损压缩，可通过质量滑块调整压缩率（0.1 - 1.0），适合照片类图片。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >WebP 格式：</strong
              >兼顾质量与体积，现代浏览器均支持，推荐用于网页场景。
            </p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              图片会上传到服务器吗？
            </span>
            <ChevronDown
              class="w-4 h-4 pz-faq-chevron shrink-0"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
          </summary>
          <div
            class="text-sm mt-3 flex flex-col gap-2"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            <p>
              <strong style="color: var(--pz-color-text-primary)">不会。</strong
              >所有图片处理完全在浏览器本地完成，图片数据不会离开您的设备。
            </p>
            <p>
              技术上，图片通过浏览器的 File API
              读取，然后使用 Canvas API
              进行裁剪、旋转、翻转等操作。整个过程中数据不会通过网络发送到任何服务器。
            </p>
            <p>因此，即使是敏感图片，也可以放心使用本工具进行处理。</p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              如何使用预设比例裁剪？
            </span>
            <ChevronDown
              class="w-4 h-4 pz-faq-chevron shrink-0"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
          </summary>
          <div
            class="text-sm mt-3 flex flex-col gap-2"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            <p>
              在裁剪比例区域选择所需比例（如 1:1、16:9、4:3 等），裁剪框将自动调整为对应比例。
            </p>
            <p>
              选择比例后，拖拽裁剪框的边角手柄进行调整时，裁剪框会始终保持所选比例不变。选择"自由"比例则可无约束地任意调整裁剪框大小。
            </p>
            <p>
              常见用途：1:1
              适合头像、社交媒体方图；16:9 适合视频封面、横幅；9:16
              适合手机壁纸、竖版短视频封面。
            </p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              可以旋转和翻转图片吗？
            </span>
            <ChevronDown
              class="w-4 h-4 pz-faq-chevron shrink-0"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
          </summary>
          <div
            class="text-sm mt-3 flex flex-col gap-2"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            <p>可以。工具支持以下操作：</p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >向左旋转 90°：</strong
              >将图片逆时针旋转 90 度。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >向右旋转 90°：</strong
              >将图片顺时针旋转 90 度。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >水平翻转：</strong
              >沿垂直轴左右镜像翻转。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >垂直翻转：</strong
              >沿水平轴上下镜像翻转。
            </p>
            <p>
              旋转和翻转操作会即时生效，裁剪框会自动适配新的图片方向。可以连续多次操作实现
              180°、270° 等旋转效果。
            </p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              裁剪框如何操作？
            </span>
            <ChevronDown
              class="w-4 h-4 pz-faq-chevron shrink-0"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
          </summary>
          <div
            class="text-sm mt-3 flex flex-col gap-2"
            style="color: var(--pz-color-text-secondary); line-height: 1.6"
          >
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >移动裁剪框：</strong
              >鼠标按住裁剪框中间区域拖拽，可移动裁剪框位置。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >调整大小：</strong
              >裁剪框四周有 8 个调整手柄（4 个角 + 4
              条边中点），拖拽手柄可改变裁剪框大小。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >角手柄：</strong
              >拖拽四个角的手柄可同时调整宽度和高度（自由模式下），或按比例调整（锁定比例模式下）。
            </p>
            <p>
              <strong style="color: var(--pz-color-text-primary)"
                >边手柄：</strong
              >拖拽四条边中点的手柄仅调整对应方向的尺寸（自由模式下），锁定比例时会联动调整以保持比例。
            </p>
            <p>
              裁剪框始终被限制在图片范围内，不会超出边界。实时尺寸信息显示在画布左上角和右侧参数面板中。
            </p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* === Upload dropzone === */
.pz-crop-upload-zone {
  border: 2px dashed var(--pz-color-border-strong);
  border-radius: var(--pz-radius-lg);
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  background-color: var(--pz-color-bg-secondary);
}
.pz-crop-upload-zone:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-crop-upload-zone.pz-dragover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}

/* === Crop workspace (two-column) === */
.pz-crop-workspace {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
@media (max-width: 900px) {
  .pz-crop-workspace {
    flex-direction: column;
  }
}
.pz-crop-canvas-area {
  flex: 0 0 65%;
  max-width: 65%;
  min-width: 0;
}
@media (max-width: 900px) {
  .pz-crop-canvas-area {
    flex: 1 1 auto;
    max-width: 100%;
    width: 100%;
  }
}
.pz-crop-canvas-container {
  position: relative;
  background-color: var(--pz-color-bg-tertiary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  overflow: hidden;
  user-select: none;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
.pz-crop-canvas-container canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

/* === Crop rectangle === */
.pz-crop-rect {
  position: absolute;
  border: 1px solid var(--pz-color-primary);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
  box-sizing: border-box;
  z-index: 5;
}

/* === Resize handles === */
.pz-crop-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: var(--pz-color-bg);
  border: 1px solid var(--pz-color-primary);
  border-radius: var(--pz-radius-sm);
  z-index: 10;
}
.pz-crop-handle--nw {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}
.pz-crop-handle--ne {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}
.pz-crop-handle--sw {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}
.pz-crop-handle--se {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}
.pz-crop-handle--n {
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}
.pz-crop-handle--s {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}
.pz-crop-handle--e {
  top: 50%;
  right: -5px;
  transform: translateY(-50%);
  cursor: e-resize;
}
.pz-crop-handle--w {
  top: 50%;
  left: -5px;
  transform: translateY(-50%);
  cursor: w-resize;
}

/* === Real-time dimension display === */
.pz-crop-dimensions {
  position: absolute;
  top: 8px;
  left: 8px;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-inverse);
  background-color: rgba(0, 0, 0, 0.6);
  padding: 0.25rem 0.5rem;
  border-radius: var(--pz-radius-sm);
  pointer-events: none;
  z-index: 20;
}

/* === Right parameter panel === */
.pz-crop-panel {
  flex: 0 0 33%;
  max-width: 33%;
  min-width: 0;
}
@media (max-width: 900px) {
  .pz-crop-panel {
    flex: 1 1 auto;
    max-width: 100%;
    width: 100%;
  }
}
.pz-crop-panel-section {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--pz-color-border-light);
  margin-bottom: 1rem;
}
.pz-crop-panel-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.pz-crop-panel-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  margin-bottom: 0.5rem;
}

/* === Aspect ratio grid === */
.pz-crop-ratio-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
}
.pz-crop-ratio-btn {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.375rem 0.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  user-select: none;
}
.pz-crop-ratio-btn:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}
.pz-crop-ratio-btn--active {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
  border-color: var(--pz-color-primary);
}
.pz-crop-ratio-btn--active:hover {
  background-color: var(--pz-color-primary-hover);
  color: var(--pz-color-text-inverse);
}

/* === Rotate/flip button group === */
.pz-crop-rotate-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.375rem;
}
.pz-crop-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.5rem 0.5rem;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  user-select: none;
}
.pz-crop-action-btn:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}
.pz-crop-action-btn svg {
  flex-shrink: 0;
}

/* === Dimension info rows === */
.pz-crop-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  padding: 0.375rem 0;
}
.pz-crop-info-row .pz-crop-info-label {
  color: var(--pz-color-text-secondary);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
}
.pz-crop-info-row .pz-crop-info-value {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-sm);
  padding: 0.125rem 0.5rem;
  min-width: 60px;
  text-align: right;
}

/* === Preview section === */
.pz-crop-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pz-crop-preview-img {
  background-color: var(--pz-color-bg-tertiary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  overflow: hidden;
}
.pz-crop-preview-img img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}
.pz-crop-preview-compare {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.pz-crop-preview-compare-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pz-crop-preview-compare-item .pz-crop-compare-label {
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
  font-weight: var(--pz-weight-medium);
}
.pz-crop-preview-compare-item .pz-crop-compare-value {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  font-weight: var(--pz-weight-medium);
}

/* === Download controls bar === */
.pz-crop-download-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.pz-crop-format-select {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease;
}
.pz-crop-format-select:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}
.pz-crop-quality-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
}
.pz-crop-quality-wrap input[type='range'] {
  width: 120px;
  accent-color: var(--pz-color-primary);
  cursor: pointer;
}
.pz-crop-quality-value {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-primary);
  min-width: 32px;
}

/* === Privacy callout === */
.pz-crop-privacy {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background-color: var(--pz-state-info-bg);
  border: 1px solid var(--pz-state-info-border);
  border-radius: var(--pz-radius-lg);
}
.pz-crop-privacy-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--pz-state-info);
  color: var(--pz-color-text-inverse);
  border-radius: var(--pz-radius-full);
}
.pz-crop-privacy-title {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-primary);
  margin-bottom: 0.25rem;
}
.pz-crop-privacy-text {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
  line-height: var(--pz-leading-normal);
}

/* === FAQ accordion (native details) === */
.pz-faq > summary {
  list-style: none;
}
.pz-faq > summary::-webkit-details-marker {
  display: none;
}
.pz-faq .pz-faq-chevron {
  transition: transform 0.2s ease;
}
.pz-faq[open] .pz-faq-chevron {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .pz-crop-upload-zone,
  .pz-crop-ratio-btn,
  .pz-crop-action-btn,
  .pz-crop-format-select,
  .pz-faq-chevron {
    transition: none;
  }
}
</style>
