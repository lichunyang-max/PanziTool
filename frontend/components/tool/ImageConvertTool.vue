<script setup lang="ts">
/**
 * ImageConvertTool.vue - 图片格式转换工具组件
 *
 * 严格参照 ui/pages/格式转换.html 交互区结构：
 * 1. 上传区（拖拽 / 点击，支持批量）— pz-conv-upload-zone
 * 2. 转换设置（目标格式 JPG/PNG/WebP、质量滑块、背景色、调整尺寸）— pz-conv-settings
 * 3. 文件列表与转换结果（缩略图、原格式→目标格式、状态、下载/移除）— pz-conv-file-list
 * 4. 隐私提示 / 格式参考表 / FAQ
 *
 * 核心能力（SubTask 18.1-18.3）：
 * - 18.1 转换 UI：上传、选择目标格式 jpeg/png/webp、预览、下载
 * - 18.2 EXIF 方向修正（loadImageWithOrientation）+ Canvas 导出不同 mime，
 *   PNG/WebP → JPG 时警告透明背景将丢失，建议填充白色背景
 * - 18.3 通过 useAnalytics 上报：开始转换 → tool_use，下载 → download
 *
 * 所有图片处理在浏览器本地完成（Canvas API + 手动 EXIF 解析），不上传服务器。
 * 组件渲染在 ToolLayout 默认插槽中，无需自行包裹 ToolLayout。
 */
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileImage,
  Lock,
  SlidersHorizontal,
  Table,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from 'lucide-vue-next'
import {
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  getOutputFilename,
  loadImageWithOrientation,
  type ImageFormat,
} from '~/utils/tools/image'

useHead({
  titleTemplate: null,
  title: '图片格式转换工具 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线图片格式转换工具，支持PNG/JPG/WEBP无损互转，保留透明背景，本地浏览器处理不上传，免登录批量转换。'
    },
    {
      name: 'keywords',
      content: '图片格式转换,PNG转JPG,WEBP转换,在线转格式'
    },
    {
      property: 'og:title',
      content: '图片格式转换工具 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线图片格式转换工具，支持PNG/JPG/WEBP无损互转，保留透明背景，本地浏览器处理不上传，免登录批量转换。'
    }
  ]
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'image-convert',
)

/* =========================================================================
 * 格式元数据
 * ========================================================================= */

/** 输入支持的格式键（用于检测原格式与参考表展示） */
type FormatKey = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp'

interface FormatInfo {
  /** MIME 类型（输出仅使用 jpeg/png/webp） */
  mime: string
  /** 扩展名 */
  ext: string
  /** 显示标签 */
  label: string
  /** 格式描述 */
  desc: string
  /** 是否支持质量调节（有损格式） */
  hasQuality: boolean
  /** 是否支持透明通道 */
  hasAlpha: boolean
}

const FORMAT_INFO: Record<FormatKey, FormatInfo> = {
  jpeg: {
    mime: 'image/jpeg',
    ext: 'jpg',
    label: 'JPG',
    desc: 'JPG：有损压缩，适合照片',
    hasQuality: true,
    hasAlpha: false,
  },
  png: {
    mime: 'image/png',
    ext: 'png',
    label: 'PNG',
    desc: 'PNG：无损压缩，支持透明',
    hasQuality: false,
    hasAlpha: true,
  },
  webp: {
    mime: 'image/webp',
    ext: 'webp',
    label: 'WebP',
    desc: 'WebP：现代格式，体积更小',
    hasQuality: true,
    hasAlpha: true,
  },
  gif: {
    mime: 'image/gif',
    ext: 'gif',
    label: 'GIF',
    desc: 'GIF：支持动画（转换仅取首帧）',
    hasQuality: false,
    hasAlpha: true,
  },
  bmp: {
    mime: 'image/bmp',
    ext: 'bmp',
    label: 'BMP',
    desc: 'BMP：无压缩位图',
    hasQuality: false,
    hasAlpha: false,
  },
}

/** 可作为输出目标的格式（共享库仅支持 jpeg/png/webp 编码） */
const OUTPUT_FORMATS: FormatKey[] = ['jpeg', 'png', 'webp']

/** 将输出格式键转为库的 ImageFormat 类型 */
function outputMime(key: FormatKey): ImageFormat {
  return FORMAT_INFO[key].mime as ImageFormat
}

/* =========================================================================
 * 状态
 * ========================================================================= */

interface ConvertItem {
  id: number
  file: File
  name: string
  size: number
  type: string
  formatKey: FormatKey
  thumbUrl: string
  imgWidth: number
  imgHeight: number
  status: 'pending' | 'converting' | 'success' | 'error'
  errorMsg: string
  convertedBlob: Blob | null
  convertedUrl: string | null
  convertedSize: number
  convertedExt: string
}

const files = ref<ConvertItem[]>([])
const targetFormat = ref<FormatKey>('jpeg')
const quality = ref(90)
const bgColor = ref('#ffffff')
const resizeEnabled = ref(false)
const resizeW = ref<number | null>(null)
const resizeH = ref<number | null>(null)
const keepRatio = ref(true)
const converting = ref(false)
const dragover = ref(false)
const rejectedNotice = ref('')

let nextId = 1

const fileInputRef = ref<HTMLInputElement | null>(null)

/** 单文件最大 50MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]

/* =========================================================================
 * 计算属性
 * ========================================================================= */

const targetInfo = computed(() => FORMAT_INFO[targetFormat.value])
const hasFiles = computed(() => files.value.length > 0)
const hasSuccess = computed(() =>
  files.value.some((f) => f.status === 'success'),
)
/** 质量设置仅对有损格式（JPG/WebP）显示 */
const showQuality = computed(() => targetInfo.value.hasQuality)
/** 背景色仅对不支持透明的输出格式（JPG）显示 */
const showBgRow = computed(() => !targetInfo.value.hasAlpha)
/**
 * PNG/WebP/GIF → JPG 透明背景丢失警告（SubTask 18.2）
 * 当目标为 JPG 且源文件中存在支持透明的格式时提示。
 */
const showTransparencyWarning = computed(
  () =>
    targetFormat.value === 'jpeg' &&
    files.value.some(
      (f) => f.formatKey === 'png' || f.formatKey === 'webp' || f.formatKey === 'gif',
    ),
)

const fileCountLabel = computed(() => `${files.value.length} 个文件`)

/* =========================================================================
 * 工具函数
 * ========================================================================= */

/** 从文件名提取小写扩展名 */
function getExtFromName(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

/** 检测文件原始格式键 */
function detectFormatKey(file: File): FormatKey {
  const ext = getExtFromName(file.name)
  if (file.type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (file.type === 'image/png' || ext === 'png') return 'png'
  if (file.type === 'image/webp' || ext === 'webp') return 'webp'
  if (file.type === 'image/gif' || ext === 'gif') return 'gif'
  if (file.type === 'image/bmp' || ext === 'bmp') return 'bmp'
  return 'png'
}

/* =========================================================================
 * 上传处理
 * ========================================================================= */

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFiles(target.files)
    target.value = ''
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
  const list = e.dataTransfer?.files
  if (list && list.length > 0) handleFiles(list)
}

async function handleFiles(fileList: FileList) {
  if (import.meta.server) return

  const pending: File[] = []
  let rejected = 0
  for (const f of Array.from(fileList)) {
    if (ACCEPTED_TYPES.indexOf(f.type) === -1) {
      rejected++
      continue
    }
    if (f.size > MAX_FILE_SIZE) {
      rejected++
      continue
    }
    pending.push(f)
  }

  if (rejected > 0) {
    rejectedNotice.value = `已跳过 ${rejected} 个不支持的文件（格式不支持或超过 50MB）。`
  } else {
    rejectedNotice.value = ''
  }
  if (pending.length === 0) return

  for (const f of pending) {
    const thumbUrl = URL.createObjectURL(f)
    const item: ConvertItem = {
      id: nextId++,
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      formatKey: detectFormatKey(f),
      thumbUrl,
      imgWidth: 0,
      imgHeight: 0,
      status: 'pending',
      errorMsg: '',
      convertedBlob: null,
      convertedUrl: null,
      convertedSize: 0,
      convertedExt: '',
    }
    // 预加载图片以获取原始尺寸（用于调整尺寸默认值）
    const img = new Image()
    img.onload = () => {
      item.imgWidth = img.naturalWidth
      item.imgHeight = img.naturalHeight
      maybePrefillResize()
    }
    img.src = thumbUrl
    files.value.push(item)
  }
}

/** 调整尺寸开启且未填写时，用首个文件尺寸预填 */
function maybePrefillResize() {
  if (
    resizeEnabled.value &&
    !resizeW.value &&
    files.value.length > 0 &&
    files.value[0].imgWidth
  ) {
    resizeW.value = files.value[0].imgWidth
    resizeH.value = files.value[0].imgHeight
  }
}

/* =========================================================================
 * 格式选择
 * ========================================================================= */

function setTargetFormat(fmt: FormatKey) {
  if (targetFormat.value === fmt) return
  targetFormat.value = fmt
}

/* =========================================================================
 * 调整尺寸
 * ========================================================================= */

function onResizeEnableChange() {
  if (resizeEnabled.value) {
    maybePrefillResize()
  }
}

/** 宽度变化时按比例同步高度（仅用户输入触发，避免循环） */
function syncHeightFromWidth() {
  const v = Number(resizeW.value)
  if (!v || v < 1) return
  if (keepRatio.value && files.value.length > 0) {
    const f = files.value[0]
    if (f.imgWidth && f.imgHeight) {
      const ratio = f.imgWidth / f.imgHeight
      resizeH.value = Math.round(v / ratio)
    }
  }
}

/** 高度变化时按比例同步宽度 */
function syncWidthFromHeight() {
  const v = Number(resizeH.value)
  if (!v || v < 1) return
  if (keepRatio.value && files.value.length > 0) {
    const f = files.value[0]
    if (f.imgWidth && f.imgHeight) {
      const ratio = f.imgWidth / f.imgHeight
      resizeW.value = Math.round(v * ratio)
    }
  }
}

/* =========================================================================
 * 移除 / 清空
 * ========================================================================= */

function revokeItemUrls(item: ConvertItem) {
  if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl)
  if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl)
}

function removeFile(id: number) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx < 0) return
  revokeItemUrls(files.value[idx])
  files.value.splice(idx, 1)
}

function clearAll() {
  if (converting.value) return
  files.value.forEach(revokeItemUrls)
  files.value = []
  rejectedNotice.value = ''
}

/* =========================================================================
 * 转换逻辑（SubTask 18.1 / 18.2）
 * ========================================================================= */

async function startConvert() {
  if (import.meta.server) return
  if (converting.value || files.value.length === 0) return

  converting.value = true
  // 上报 tool_use 事件
  reportEvent('tool_use', effectiveSlug.value)

  // 顺序转换，避免大图并发导致内存峰值
  for (const item of files.value) {
    item.status = 'converting'
    item.errorMsg = ''
    await convertFile(item)
  }

  converting.value = false
}

async function convertFile(item: ConvertItem) {
  try {
    // 1. EXIF 方向修正加载 → canvas（自动读取并修正 EXIF Orientation）
    const sourceCanvas = await loadImageWithOrientation(item.file)
    const srcW = sourceCanvas.width
    const srcH = sourceCanvas.height

    // 2. 计算输出尺寸（开启调整尺寸且宽高有效时使用目标尺寸）
    let outW = srcW
    let outH = srcH
    if (
      resizeEnabled.value &&
      Number(resizeW.value) > 0 &&
      Number(resizeH.value) > 0
    ) {
      outW = Number(resizeW.value)
      outH = Number(resizeH.value)
    }

    // 3. 创建输出 canvas
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文')

    // 4. 不支持透明的格式（JPG）填充背景色，避免透明区域变黑
    if (!targetInfo.value.hasAlpha) {
      ctx.fillStyle = bgColor.value
      ctx.fillRect(0, 0, outW, outH)
    }

    // 5. 绘制源 canvas（按目标尺寸缩放）
    ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, 0, 0, outW, outH)

    // 6. Canvas 转 Blob（按目标 MIME 与质量）
    const mime = outputMime(targetFormat.value)
    const q = targetInfo.value.hasQuality ? quality.value / 100 : undefined
    const blob = await canvasToBlob(canvas, mime, q)
    if (!blob) throw new Error('转换失败，浏览器可能不支持该格式编码')

    // 7. 存储转换结果
    if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl)
    item.convertedBlob = blob
    item.convertedUrl = URL.createObjectURL(blob)
    item.convertedSize = blob.size
    item.convertedExt = targetInfo.value.ext
    item.status = 'success'
  } catch (err) {
    item.status = 'error'
    item.errorMsg = err instanceof Error ? err.message : '转换异常'
  }
}

/* =========================================================================
 * 下载（SubTask 18.3：下载触发 download 事件）
 * ========================================================================= */

function downloadItem(id: number) {
  const item = files.value.find((f) => f.id === id)
  if (!item || !item.convertedBlob) return
  const filename = getOutputFilename(item.name, outputMime(targetFormat.value))
  downloadBlob(item.convertedBlob, filename)
  reportEvent('download', effectiveSlug.value)
}

function downloadAll() {
  const successFiles = files.value.filter(
    (f) => f.status === 'success' && f.convertedBlob,
  )
  if (successFiles.length === 0) return

  const mime = outputMime(targetFormat.value)
  let i = 0
  const downloadNext = () => {
    if (i >= successFiles.length) return
    const f = successFiles[i]
    if (f.convertedBlob) {
      downloadBlob(f.convertedBlob, getOutputFilename(f.name, mime))
    }
    i++
    if (i < successFiles.length) setTimeout(downloadNext, 300)
  }
  downloadNext()
  reportEvent('download', effectiveSlug.value)
}

/* =========================================================================
 * 生命周期：组件卸载时回收对象 URL
 * ========================================================================= */

onBeforeUnmount(() => {
  files.value.forEach(revokeItemUrls)
})

/* =========================================================================
 * 格式参考表数据
 * ========================================================================= */

interface RefRow {
  format: string
  full: string
  compress: string
  alpha: string
  anim: string
  scene: string
}

const refRows: RefRow[] = [
  { format: 'JPG', full: 'JPEG', compress: '有损', alpha: '✕', anim: '✕', scene: '照片、复杂色彩图像' },
  { format: 'PNG', full: 'Portable Network Graphics', compress: '无损', alpha: '✓', anim: '✕', scene: '图标、截图、需要透明' },
  { format: 'WebP', full: 'Web Picture', compress: '有损/无损', alpha: '✓', anim: '✓', scene: '网页图片、替代 JPG/PNG' },
  { format: 'GIF', full: 'Graphics Interchange Format', compress: '无损', alpha: '✓', anim: '✓', scene: '简单动画、表情图' },
  { format: 'BMP', full: 'Bitmap', compress: '无压缩', alpha: '✕', anim: '✕', scene: 'Windows 原生位图' },
]
</script>

<template>
  <div>
    <!-- 1. 上传区 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-4">
        <UploadCloud
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
        multiple
        aria-hidden="true"
        @change="onFileChange"
      />
      <div
        class="pz-conv-upload-zone pz-conv-upload"
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
          <UploadCloud
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
            支持 JPG、PNG、WebP、GIF、BMP 格式，可批量上传
          </div>
        </div>
      </div>
      <p class="text-xs mt-3" style="color: var(--pz-color-text-tertiary)">
        图片不会上传到服务器，所有转换在浏览器本地完成。
      </p>
      <!-- 跳过文件提示 -->
      <div
        v-if="rejectedNotice"
        class="pz-conv-notice mt-3"
        role="status"
      >
        <AlertTriangle
          class="w-4 h-4 shrink-0"
          aria-hidden="true"
        />
        <span>{{ rejectedNotice }}</span>
      </div>
    </div>

    <!-- 2. 转换设置（上传文件后显示） -->
    <div v-if="hasFiles" class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-4">
        <SlidersHorizontal
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          转换设置
        </h2>
      </div>
      <div class="pz-conv-settings">
        <!-- 目标格式 -->
        <div class="pz-conv-settings-section">
          <div class="pz-conv-settings-label">目标格式</div>
          <div class="pz-conv-format-grid">
            <button
              v-for="fmt in OUTPUT_FORMATS"
              :key="fmt"
              type="button"
              class="pz-conv-format-btn"
              :class="{ 'pz-conv-format-btn--active': targetFormat === fmt }"
              @click="setTargetFormat(fmt)"
            >
              {{ FORMAT_INFO[fmt].label }}
            </button>
          </div>
          <div class="pz-conv-format-desc">{{ targetInfo.desc }}</div>
        </div>

        <!-- PNG/WebP → JPG 透明背景丢失警告 -->
        <div
          v-if="showTransparencyWarning"
          class="pz-conv-warning"
          role="alert"
        >
          <AlertTriangle
            class="w-4 h-4 shrink-0 mt-0.5"
            style="color: var(--pz-state-warning)"
            aria-hidden="true"
          />
          <div>
            <div class="pz-conv-warning-title">
              透明背景将丢失
            </div>
            <div class="pz-conv-warning-text">
              PNG/WebP 转 JPG 时透明通道会丢失，透明区域将填充为下方设置的背景色（默认白色）。如需保留透明背景，请将目标格式选择为 PNG 或 WebP。
            </div>
          </div>
        </div>

        <!-- 质量设置（仅 JPG/WebP） -->
        <div v-if="showQuality" class="pz-conv-settings-section">
          <div class="pz-conv-settings-label">质量设置</div>
          <div class="pz-conv-quality">
            <div class="pz-conv-quality-row">
              <input
                v-model.number="quality"
                type="range"
                class="pz-conv-slider"
                min="1"
                max="100"
              />
              <span class="pz-conv-quality-value">{{ quality }}%</span>
            </div>
            <div class="pz-conv-quality-hint">质量越高文件越大，推荐 80%-95%</div>
          </div>
        </div>

        <!-- 调整选项 -->
        <div class="pz-conv-settings-section">
          <div class="pz-conv-settings-label">调整选项</div>
          <div class="pz-conv-options">
            <!-- 背景色（仅 JPG） -->
            <div v-if="showBgRow" class="pz-conv-option-row">
              <span class="pz-conv-option-label">背景色</span>
              <input
                v-model="bgColor"
                type="color"
                class="pz-conv-color-picker"
                aria-label="背景颜色"
              />
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
                透明区域将填充此颜色（JPG 不支持透明）
              </span>
            </div>
            <!-- 调整尺寸 -->
            <div class="pz-conv-option-row">
              <label class="pz-conv-checkbox-label">
                <input v-model="resizeEnabled" type="checkbox" @change="onResizeEnableChange" />
                <span>调整尺寸</span>
              </label>
              <div v-if="resizeEnabled" class="pz-conv-resize">
                <input
                  :value="resizeW"
                  type="number"
                  placeholder="宽"
                  min="1"
                  @input="(e: Event) => { resizeW = Number((e.target as HTMLInputElement).value) || null; syncHeightFromWidth() }"
                />
                <span class="pz-conv-resize-x">x</span>
                <input
                  :value="resizeH"
                  type="number"
                  placeholder="高"
                  min="1"
                  @input="(e: Event) => { resizeH = Number((e.target as HTMLInputElement).value) || null; syncWidthFromHeight() }"
                />
                <label class="pz-conv-checkbox-label">
                  <input v-model="keepRatio" type="checkbox" />
                  <span>保持比例</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作 -->
        <div class="pz-conv-settings-section">
          <div class="pz-conv-settings-label">操作</div>
          <div class="pz-conv-actions">
            <button
              type="button"
              class="pz-btn-primary whitespace-nowrap"
              :disabled="converting"
              :style="converting ? 'opacity: 0.6' : ''"
              @click="startConvert"
            >
              <Zap class="w-4 h-4" aria-hidden="true" />
              <span>{{ converting ? '转换中...' : '开始转换' }}</span>
            </button>
            <button
              v-if="hasSuccess"
              type="button"
              class="pz-btn-secondary whitespace-nowrap"
              @click="downloadAll"
            >
              <Download class="w-4 h-4" aria-hidden="true" />
              <span>全部下载</span>
            </button>
            <button
              type="button"
              class="pz-btn-secondary whitespace-nowrap"
              :disabled="converting"
              @click="clearAll"
            >
              <Trash2 class="w-4 h-4" aria-hidden="true" />
              <span>清空列表</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 文件列表与转换结果（上传文件后显示） -->
    <div v-if="hasFiles" class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-4">
        <FileImage
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          文件列表
        </h2>
        <span class="pz-badge pz-badge-neutral">{{ fileCountLabel }}</span>
      </div>
      <div class="pz-conv-file-list">
        <div
          v-for="item in files"
          :key="item.id"
          class="pz-conv-file-item"
        >
          <!-- 缩略图 -->
          <img class="pz-conv-thumb" :src="item.thumbUrl" alt="预览" />
          <!-- 文件信息 -->
          <div class="pz-conv-file-info">
            <div class="pz-conv-file-name" :title="item.name">{{ item.name }}</div>
            <div class="pz-conv-file-meta">
              <span class="pz-conv-format-badge pz-conv-format-badge--original">
                {{ FORMAT_INFO[item.formatKey].label }}
              </span>
              <span class="pz-conv-file-size">{{ formatFileSize(item.size) }}</span>
              <span class="pz-conv-arrow">
                <ArrowRight class="w-[14px] h-[14px]" aria-hidden="true" />
              </span>
              <span
                class="pz-conv-format-badge pz-conv-format-badge--converted"
                :style="item.status === 'success' ? '' : 'opacity: 0.4'"
              >
                {{ targetInfo.label }}
              </span>
              <span class="pz-conv-file-size">
                {{ item.status === 'success' ? formatFileSize(item.convertedSize) : '-' }}
              </span>
            </div>
            <div v-if="item.status === 'error' && item.errorMsg" class="pz-conv-file-item-error">
              {{ item.errorMsg }}
            </div>
          </div>
          <!-- 状态 -->
          <div class="pz-conv-file-meta" style="gap: 0.5rem">
            <span
              v-if="item.status === 'pending'"
              class="pz-conv-status pz-conv-status--pending"
            >等待中</span>
            <span
              v-else-if="item.status === 'converting'"
              class="pz-conv-status pz-conv-status--converting"
            >转换中...</span>
            <span
              v-else-if="item.status === 'success'"
              class="pz-conv-status pz-conv-status--success"
            >
              <Check class="w-3 h-3" aria-hidden="true" />
              成功
            </span>
            <span
              v-else
              class="pz-conv-status pz-conv-status--error"
            >
              <X class="w-3 h-3" aria-hidden="true" />
              失败
            </span>
          </div>
          <!-- 操作 -->
          <div class="pz-conv-file-actions">
            <button
              v-if="item.status === 'success'"
              type="button"
              class="pz-conv-download-btn"
              title="下载"
              aria-label="下载转换后的图片"
              @click="downloadItem(item.id)"
            >
              <Download class="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="pz-conv-remove-btn"
              title="移除"
              aria-label="移除文件"
              :disabled="converting"
              @click="removeFile(item.id)"
            >
              <Trash2 class="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 隐私提示 -->
    <div class="pz-conv-privacy">
      <div class="pz-conv-privacy-icon" aria-hidden="true">
        <Lock class="w-[18px] h-[18px]" />
      </div>
      <div>
        <div class="pz-conv-privacy-title">本地处理保障</div>
        <div class="pz-conv-privacy-text">
          所有图片格式转换在浏览器本地完成，图片不会上传到服务器，确保您的隐私安全。
        </div>
      </div>
    </div>

    <!-- ============ 广告位（本地处理保障和格式参考表之间） ============ -->
    <div class="my-6">
      <AdSlot slot-key="imageConvertMiddle" />
    </div>

    <!-- 5. 格式参考表 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-4">
        <Table
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          格式参考表
        </h2>
      </div>
      <div style="overflow-x: auto">
        <table class="pz-conv-ref-table">
          <thead>
            <tr>
              <th>格式</th>
              <th>全称</th>
              <th>压缩方式</th>
              <th>透明支持</th>
              <th>动画支持</th>
              <th>适用场景</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in refRows" :key="idx">
              <td class="pz-conv-ref-format">{{ row.format }}</td>
              <td>{{ row.full }}</td>
              <td>{{ row.compress }}</td>
              <td>{{ row.alpha }}</td>
              <td>{{ row.anim }}</td>
              <td>{{ row.scene }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. FAQ -->
    <section class="py-8">
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
            >支持哪些图片格式互转？</span>
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
            支持 JPG、PNG、WebP、GIF、BMP 五种常见格式作为输入，输出目标格式为 JPG、PNG、WebP 三种。例如将 PNG 转为 JPG 以减小文件体积，或将 JPG 转为 WebP 以获得更好的网页加载性能。所有转换均在浏览器本地通过 Canvas API 完成。
          </p>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >转换后图片质量会下降吗？</span>
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
            <p>取决于目标格式和压缩设置。JPG 和 WebP 为有损格式，可通过质量滑块控制压缩率（1% - 100%），推荐设置在 80%-95% 之间以平衡质量与体积。</p>
            <p><strong style="color: var(--pz-color-text-primary)">PNG：</strong>无损格式，转换后不会损失画质，但文件体积可能较大。</p>
            <p><strong style="color: var(--pz-color-text-primary)">WebP：</strong>同时支持有损和无损压缩，是现代网页的最佳选择。</p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >为什么转 JPG 后背景变白了？</span>
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
            <p>JPG 格式不支持透明通道（Alpha 通道），转换时透明区域会填充为背景色（默认白色）。</p>
            <p>如果您希望保留透明背景，请将目标格式选择为 <strong style="color: var(--pz-color-primary)">PNG</strong> 或 <strong style="color: var(--pz-color-primary)">WebP</strong>，这两种格式均支持透明通道。</p>
            <p>如需自定义背景色，可在"调整选项"中通过颜色选择器设置任意颜色，透明区域将填充为您选择的颜色。</p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >可以批量转换吗？</span>
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
            <p>可以。支持一次上传多张图片，统一设置目标格式和质量，批量转换并分别下载。</p>
            <p>上传时可在文件选择对话框中按住 Ctrl（Windows）或 Cmd（Mac）多选文件，也可直接拖拽多个文件到上传区域。转换完成后，可点击"全部下载"依次下载所有转换后的图片，或点击每个文件右侧的下载按钮单独下载。</p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >会保留照片的拍摄方向吗？</span>
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
            <p>会。工具会自动读取 JPEG 照片的 EXIF Orientation 方向标签，并在转换时通过 Canvas 修正旋转方向，确保转换后的图片方向与拍摄时一致，不会出现横倒或翻转。</p>
            <p>对于不含 EXIF 方向信息或非 JPEG 源文件，将按原始方向处理。</p>
          </div>
        </details>
        <details class="pz-faq pz-card pz-card-hover p-4">
          <summary class="flex items-center justify-between cursor-pointer">
            <span
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >WebP 格式有什么优势？</span>
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
            <p>WebP 是 Google 推出的现代图片格式，相比 JPG 体积更小，同时支持有损/无损压缩和透明通道，是目前网页图片的最优选择。</p>
            <p><strong style="color: var(--pz-color-text-primary)">体积更小：</strong>同等画质下，WebP 比 JPG 小 25%-35%，能显著提升网页加载速度。</p>
            <p><strong style="color: var(--pz-color-text-primary)">功能更全：</strong>支持透明通道（替代 PNG）和动画（替代 GIF），一种格式满足多种需求。</p>
            <p><strong style="color: var(--pz-color-text-primary)">兼容性好：</strong>所有现代浏览器（Chrome、Firefox、Edge、Safari 14+）均已支持。</p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* === Upload zone === */
.pz-conv-upload {
  width: 100%;
}
.pz-conv-upload-zone {
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
.pz-conv-upload-zone:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-conv-upload-zone.pz-dragover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}

/* === Inline notice (rejected files) === */
.pz-conv-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-state-warning);
  background-color: var(--pz-state-warning-bg);
  border: 1px solid var(--pz-state-warning-border);
  border-radius: var(--pz-radius-md);
  padding: 0.5rem 0.75rem;
}

/* === Conversion settings panel === */
.pz-conv-settings {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.pz-conv-settings-section {
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}
.pz-conv-settings-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.pz-conv-settings-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  margin-bottom: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* === Target format grid === */
.pz-conv-format-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.pz-conv-format-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.5rem 0.875rem;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
  user-select: none;
}
.pz-conv-format-btn:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}
.pz-conv-format-btn--active {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
  border-color: var(--pz-color-primary);
}
.pz-conv-format-btn--active:hover {
  background-color: var(--pz-color-primary-hover);
  color: var(--pz-color-text-inverse);
}
.pz-conv-format-desc {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
  margin-top: 0.5rem;
  line-height: var(--pz-leading-normal);
}

/* === Transparency warning === */
.pz-conv-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  background-color: var(--pz-state-warning-bg);
  border: 1px solid var(--pz-state-warning-border);
  border-radius: var(--pz-radius-md);
}
.pz-conv-warning-title {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-state-warning);
  margin-bottom: 0.25rem;
}
.pz-conv-warning-text {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-secondary);
  line-height: var(--pz-leading-normal);
}

/* === Quality slider === */
.pz-conv-quality {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.pz-conv-quality-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.pz-conv-slider {
  flex: 1;
  max-width: 280px;
  accent-color: var(--pz-color-primary);
  cursor: pointer;
}
.pz-conv-quality-value {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-primary);
  min-width: 44px;
  text-align: right;
}
.pz-conv-quality-hint {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
}

/* === Adjust options === */
.pz-conv-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pz-conv-option-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.pz-conv-option-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  font-weight: var(--pz-weight-medium);
}
.pz-conv-color-picker {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  background-color: var(--pz-color-surface);
  cursor: pointer;
  outline: none;
}
.pz-conv-color-picker:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}
.pz-conv-resize {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pz-conv-resize input[type='number'] {
  width: 80px;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.375rem 0.5rem;
  outline: none;
  transition: border-color 0.15s ease;
}
.pz-conv-resize input[type='number']:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}
.pz-conv-resize-x {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-tertiary);
}
.pz-conv-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-secondary);
  cursor: pointer;
  user-select: none;
}
.pz-conv-checkbox-label input {
  accent-color: var(--pz-color-primary);
  cursor: pointer;
}

/* === Action buttons === */
.pz-conv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

/* === File list === */
.pz-conv-file-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
.pz-conv-file-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem;
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  transition: border-color 0.15s ease;
}
.pz-conv-file-item:hover {
  border-color: var(--pz-color-border-strong);
}
.pz-conv-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: var(--pz-radius-md);
  border: 1px solid var(--pz-color-border);
  background-color: var(--pz-color-bg-tertiary);
  object-fit: contain;
}
.pz-conv-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pz-conv-file-name {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pz-conv-file-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pz-conv-format-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  padding: 0.125rem 0.5rem;
  border-radius: var(--pz-radius-full);
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-secondary);
  white-space: nowrap;
}
.pz-conv-format-badge--original {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-secondary);
}
.pz-conv-format-badge--converted {
  background-color: var(--pz-color-primary-light);
  color: var(--pz-color-primary);
}
.pz-conv-file-size {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
}
.pz-conv-arrow {
  flex-shrink: 0;
  color: var(--pz-color-text-tertiary);
  display: inline-flex;
  align-items: center;
}
.pz-conv-status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  padding: 0.125rem 0.5rem;
  border-radius: var(--pz-radius-full);
  white-space: nowrap;
}
.pz-conv-status--pending {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-secondary);
}
.pz-conv-status--converting {
  background-color: var(--pz-state-info-bg);
  color: var(--pz-state-info);
}
.pz-conv-status--success {
  background-color: var(--pz-state-success-bg);
  color: var(--pz-state-success);
}
.pz-conv-status--error {
  background-color: var(--pz-state-error-bg);
  color: var(--pz-state-error);
}
.pz-conv-file-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}
.pz-conv-download-btn,
.pz-conv-remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--pz-radius-md);
  border: 1px solid var(--pz-color-border);
  background-color: var(--pz-color-surface);
  color: var(--pz-color-text-secondary);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}
.pz-conv-download-btn:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-conv-remove-btn:hover {
  border-color: var(--pz-state-error);
  color: var(--pz-state-error);
  background-color: var(--pz-state-error-bg);
}
.pz-conv-remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pz-conv-file-item-error {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-state-error);
  margin-top: 0.25rem;
}

/* === Privacy callout === */
.pz-conv-privacy {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background-color: var(--pz-state-info-bg);
  border: 1px solid var(--pz-state-info-border);
  border-radius: var(--pz-radius-lg);
}
.pz-conv-privacy-icon {
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
.pz-conv-privacy-title {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-primary);
  margin-bottom: 0.25rem;
}
.pz-conv-privacy-text {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
  line-height: var(--pz-leading-normal);
}

/* === Reference table === */
.pz-conv-ref-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
}
.pz-conv-ref-table thead th {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-primary);
  font-weight: var(--pz-weight-semibold);
  font-size: var(--pz-text-xs);
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--pz-color-border);
  white-space: nowrap;
}
.pz-conv-ref-table thead th:first-child {
  border-top-left-radius: var(--pz-radius-md);
}
.pz-conv-ref-table thead th:last-child {
  border-top-right-radius: var(--pz-radius-md);
}
.pz-conv-ref-table tbody td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--pz-color-border-light);
  color: var(--pz-color-text-secondary);
  vertical-align: middle;
}
.pz-conv-ref-table tbody tr:last-child td {
  border-bottom: none;
}
.pz-conv-ref-table tbody tr:hover td {
  background-color: var(--pz-color-bg-secondary);
}
.pz-conv-ref-table .pz-conv-ref-format {
  font-family: var(--pz-font-mono);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-primary);
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
  .pz-conv-upload-zone,
  .pz-conv-format-btn,
  .pz-conv-download-btn,
  .pz-conv-remove-btn,
  .pz-faq-chevron {
    transition: none;
  }
}
</style>
