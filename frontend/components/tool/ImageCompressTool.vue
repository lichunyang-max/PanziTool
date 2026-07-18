<script setup lang="ts">
/**
 * ImageCompressTool.vue - 图片压缩工具组件
 *
 * 严格参照 ui/pages/图片压缩工具.html 交互区结构:
 * 1. 隐私提示卡片(本地处理,不上传服务器)
 * 2. 拖拽上传区(支持多文件,JPG / PNG / WEBP,单文件最大 10MB)
 * 3. 压缩参数卡片(质量滑块 / 最大宽度 / 最大高度 / 输出格式 / 重新压缩)
 * 4. 文件列表(每个文件:原图预览 + 压缩后预览 + 原大小 + 压缩后大小 + 压缩率 + 下载)
 * 5. 全部下载 / 清空工具栏
 *
 * 所有处理在浏览器本地完成(Canvas API),包含 EXIF 方向修正,不上传服务器。
 * 交互事件(通过 useAnalytics 上报):
 * - 压缩 → tool_use 事件
 * - 下载 → download 事件
 */
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import {
  AlertCircle,
  Download,
  Image,
  Images,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import { useAnalytics } from '~/composables/useAnalytics'
import {
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  getOutputFilename,
  loadImageWithOrientation,
  resizeCanvas,
  type ImageFormat,
} from '~/utils/tools/image'

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

/** 单文件最大 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 输出格式下拉值 → MIME 映射 */
const FORMAT_MIME: Record<string, ImageFormat> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

type ItemStatus = 'pending' | 'processing' | 'done' | 'error'

interface CompressItem {
  id: string
  file: File
  originalSize: number
  originalUrl: string
  originalWidth: number
  originalHeight: number
  status: ItemStatus
  blob: Blob | null
  resultUrl: string
  resultSize: number
  resultWidth: number
  resultHeight: number
  error: string
}

// === 压缩参数 ===
const quality = ref(75)
const maxWidth = ref(1920)
const maxHeight = ref(1080)
const format = ref<'jpg' | 'png' | 'webp'>('jpg')

// === 文件列表 ===
const items = ref<CompressItem[]>([])
const isDragover = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)
const isCompressing = ref(false)
const rejectedCount = ref(0)

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `img-${Date.now()}-${idCounter}`
}

const hasItems = computed(() => items.value.length > 0)
const doneItems = computed(() => items.value.filter((i) => i.status === 'done'))

/** 已完成项的总原始大小与总结果大小 */
const totalStats = computed(() => {
  const done = doneItems.value
  const original = done.reduce((sum, i) => sum + i.originalSize, 0)
  const result = done.reduce((sum, i) => sum + i.resultSize, 0)
  return { original, result }
})

/** 总节省百分比 */
const totalSavings = computed(() => {
  const { original, result } = totalStats.value
  if (original <= 0) return 0
  return Math.round((1 - result / original) * 100)
})

/**
 * 计算单个文件的节省百分比(正值表示减小,负值表示增大)。
 */
function savingsPercent(item: CompressItem): number {
  if (item.originalSize <= 0) return 0
  return Math.round((1 - item.resultSize / item.originalSize) * 100)
}

/** 压缩后体积占原图比例(用于进度条宽度) */
function resultRatio(item: CompressItem): number {
  if (item.originalSize <= 0) return 100
  return Math.max(0, Math.min(100, Math.round((item.resultSize / item.originalSize) * 100)))
}

/** 节省百分比展示文案 */
function savingsLabel(item: CompressItem): string {
  const s = savingsPercent(item)
  if (s > 0) return `节省 ${s}%`
  if (s === 0) return '无变化'
  return `增大 ${Math.abs(s)}%`
}

/** 判断文件是否为受支持的图片 */
function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true
  // 兜底:按扩展名判断(部分系统 MIME 缺失)
  return /\.(jpe?g|png|webp)$/i.test(file.name)
}

/**
 * 创建压缩项并立即压缩。
 */
function addFiles(files: FileList | File[]): void {
  const list = Array.from(files)
  const newItems: CompressItem[] = []
  for (const file of list) {
    if (!isAcceptedFile(file) || file.size > MAX_FILE_SIZE) {
      rejectedCount.value += 1
      continue
    }
    const item: CompressItem = {
      id: nextId(),
      file,
      originalSize: file.size,
      originalUrl: URL.createObjectURL(file),
      originalWidth: 0,
      originalHeight: 0,
      status: 'pending',
      blob: null,
      resultUrl: '',
      resultSize: 0,
      resultWidth: 0,
      resultHeight: 0,
      error: '',
    }
    newItems.push(item)
  }
  items.value = [...items.value, ...newItems]
  nextTick(() => {
    for (const item of newItems) {
      void compressItem(item)
    }
  })
}

async function compressItem(item: CompressItem): Promise<void> {
  const w = Number(maxWidth.value) || 1920
  const h = Number(maxHeight.value) || 1080
  item.status = 'processing'
  item.error = ''
  if (item.resultUrl) {
    URL.revokeObjectURL(item.resultUrl)
    item.resultUrl = ''
  }

  try {
    console.log('[compressItem] step 1: start loadImageWithOrientation')
    const canvas = await loadImageWithOrientation(item.file)
    console.log('[compressItem] step 2: loadImageWithOrientation done, canvas:', canvas.width, 'x', canvas.height)
    item.originalWidth = canvas.width
    item.originalHeight = canvas.height

    console.log('[compressItem] step 3: start resizeCanvas, max:', w, 'x', h)
    const resized = resizeCanvas(canvas, w, h)
    console.log('[compressItem] step 4: resizeCanvas done, resized:', resized.width, 'x', resized.height)

    const mime = FORMAT_MIME[format.value] ?? 'image/jpeg'
    const qualityArg =
      mime === 'image/png' ? undefined : Math.min(1, Math.max(0, quality.value / 100))

    console.log('[compressItem] step 5: start canvasToBlob, mime:', mime, 'quality:', qualityArg)
    const blob = await canvasToBlob(resized, mime, qualityArg)
    console.log('[compressItem] step 6: canvasToBlob done, blob size:', blob.size)

    item.blob = blob
    item.resultUrl = URL.createObjectURL(blob)
    item.resultSize = blob.size
    item.resultWidth = resized.width
    item.resultHeight = resized.height
    item.status = 'done'

    reportEvent('tool_use', props.slug)
  } catch (e) {
    console.error('[compressItem] error:', e)
    item.status = 'error'
    item.error = '图片处理失败,请重试: ' + (e as Error).message
  }
}

/** 使用当前参数重新压缩全部文件 */
async function recompressAll(): Promise<void> {
  if (isCompressing.value || items.value.length === 0) return
  isCompressing.value = true
  for (const item of items.value) {
    await compressItem(item)
  }
  isCompressing.value = false
}

/** 下载单个压缩结果 */
function downloadOne(item: CompressItem): void {
  if (!item.blob) return
  const mime = FORMAT_MIME[format.value] ?? 'image/jpeg'
  downloadBlob(item.blob, getOutputFilename(item.file.name, mime))
  reportEvent('download', props.slug)
}

/** 下载全部已完成的压缩结果(顺序触发,间隔 300ms 避免浏览器拦截) */
async function downloadAll(): Promise<void> {
  const done = doneItems.value
  if (done.length === 0) return
  const mime = FORMAT_MIME[format.value] ?? 'image/jpeg'
  for (let i = 0; i < done.length; i++) {
    const item = done[i]
    if (item.blob) {
      downloadBlob(item.blob, getOutputFilename(item.file.name, mime))
    }
    if (i < done.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
  reportEvent('download', props.slug)
}

/** 移除单个文件并回收其对象 URL */
function removeItem(item: CompressItem): void {
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  items.value = items.value.filter((i) => i.id !== item.id)
}

/** 清空全部文件并回收对象 URL */
function clearAll(): void {
  for (const item of items.value) {
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  }
  items.value = []
  rejectedCount.value = 0
}

// === 文件选择与拖拽 ===
function triggerFileInput(): void {
  fileInputEl.value?.click()
}

function onUploadKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    triggerFileInput()
  }
}

function onFileChange(e: Event): void {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    addFiles(target.files)
    target.value = '' // 允许重复选择同一文件
  }
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragover.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addFiles(e.dataTransfer.files)
  }
}

function onDragover(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragover.value = true
}

function onDragleave(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  isDragover.value = false
}

// 组件卸载前回收所有对象 URL,避免内存泄漏
onBeforeUnmount(() => {
  for (const item of items.value) {
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  }
})
</script>

<template>
  <div>
    <!-- 1. 隐私提示 -->
    <div
      class="pz-card p-3 flex items-center gap-2 mb-6"
      style="
        background-color: var(--pz-state-info-bg);
        border-color: var(--pz-state-info-border);
      "
    >
      <ShieldCheck
        class="w-4 h-4 shrink-0"
        style="color: var(--pz-state-info)"
        aria-hidden="true"
      />
      <p
        class="text-sm"
        style="color: var(--pz-color-text-primary); line-height: 1.5"
      >
        所有图片在浏览器本地处理,不会上传到服务器,保护您的隐私。
      </p>
    </div>

    <!-- 2. 拖拽上传区 -->
    <div
      class="pz-card pz-dropzone p-8 text-center mb-6"
      :class="{ 'pz-dragover': isDragover }"
      role="button"
      tabindex="0"
      aria-label="选择图片"
      @click="triggerFileInput"
      @keydown="onUploadKeydown"
      @dragover="onDragover"
      @dragenter="onDragover"
      @dragleave="onDragleave"
      @drop="onDrop"
    >
      <div class="flex flex-col items-center gap-3">
        <UploadCloud
          class="w-12 h-12"
          style="color: var(--pz-color-text-tertiary)"
          aria-hidden="true"
        />
        <p class="text-base" style="color: var(--pz-color-text-secondary)">
          拖拽图片到此处或点击上传
        </p>
        <p class="text-xs" style="color: var(--pz-color-text-tertiary)">
          支持 JPG / PNG / WEBP,单文件最大 10MB
        </p>
        <button
          type="button"
          class="pz-btn-primary mt-2"
          @click.stop="triggerFileInput"
        >
          <Upload class="w-4 h-4" aria-hidden="true" />
          选择图片
        </button>
      </div>
      <input
        ref="fileInputEl"
        type="file"
        class="hidden"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-hidden="true"
        @change="onFileChange"
      />
    </div>

    <!-- 被拒绝文件提示 -->
    <div
      v-if="rejectedCount > 0"
      class="pz-card p-3 flex items-center gap-2 mb-6"
      style="
        background-color: var(--pz-state-warning-bg);
        border-color: var(--pz-state-warning-border);
      "
    >
      <AlertCircle
        class="w-4 h-4 shrink-0"
        style="color: var(--pz-state-warning)"
        aria-hidden="true"
      />
      <p class="text-sm" style="color: var(--pz-color-text-primary)">
        已跳过 {{ rejectedCount }} 个不支持的文件(格式不符或超过 10MB)。
      </p>
    </div>

    <!-- 3 & 4. 压缩参数 + 文件列表(有文件时显示) -->
    <template v-if="hasItems">
      <!-- 压缩参数面板 -->
      <div class="pz-card p-4 mb-6">
        <h3
          class="text-sm font-medium mb-4"
          style="color: var(--pz-color-text-primary)"
        >
          压缩参数
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 质量滑块 -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label
                for="quality-slider"
                class="text-sm"
                style="color: var(--pz-color-text-secondary)"
              >
                质量
              </label>
              <span
                class="text-sm"
                style="
                  color: var(--pz-color-text-primary);
                  font-family: var(--pz-font-mono);
                "
              >
                {{ quality }}%
              </span>
            </div>
            <input
              id="quality-slider"
              v-model.number="quality"
              type="range"
              min="0"
              max="100"
              class="pz-range w-full"
              aria-label="压缩质量"
            />
          </div>

          <!-- 最大宽度 -->
          <div class="flex flex-col gap-2">
            <label
              for="max-width"
              class="text-sm"
              style="color: var(--pz-color-text-secondary)"
            >
              最大宽度
            </label>
            <div class="flex items-center gap-2">
              <input
                id="max-width"
                v-model.number="maxWidth"
                type="number"
                min="1"
                class="pz-input flex-1 min-w-0"
                aria-label="最大宽度"
              />
              <span
                class="text-sm shrink-0"
                style="color: var(--pz-color-text-tertiary)"
              >
                px
              </span>
            </div>
          </div>

          <!-- 最大高度 -->
          <div class="flex flex-col gap-2">
            <label
              for="max-height"
              class="text-sm"
              style="color: var(--pz-color-text-secondary)"
            >
              最大高度
            </label>
            <div class="flex items-center gap-2">
              <input
                id="max-height"
                v-model.number="maxHeight"
                type="number"
                min="1"
                class="pz-input flex-1 min-w-0"
                aria-label="最大高度"
              />
              <span
                class="text-sm shrink-0"
                style="color: var(--pz-color-text-tertiary)"
              >
                px
              </span>
            </div>
          </div>

          <!-- 输出格式 -->
          <div class="flex flex-col gap-2">
            <label
              for="output-format"
              class="text-sm"
              style="color: var(--pz-color-text-secondary)"
            >
              输出格式
            </label>
            <select
              id="output-format"
              v-model="format"
              class="pz-input w-full"
              style="cursor: pointer"
              aria-label="输出格式"
            >
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 文件列表工具栏:全部下载 / 清空 -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 mb-6"
      >
        <div
          class="flex items-center gap-2 text-sm"
          style="color: var(--pz-color-text-secondary)"
        >
          <Images class="w-4 h-4" aria-hidden="true" />
          <span>共 {{ items.length }} 个文件</span>
          <span
            v-if="doneItems.length > 0 && totalSavings > 0"
            class="pz-badge whitespace-nowrap"
            style="
              background-color: var(--pz-state-success-bg);
              color: var(--pz-state-success);
              border-radius: var(--pz-radius-md);
            "
          >
            总计节省 {{ totalSavings }}%
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            :disabled="isCompressing"
            @click="recompressAll"
          >
            <Layers
              class="w-4 h-4"
              :class="{ 'animate-spin': isCompressing }"
              aria-hidden="true"
            />
            批量压缩
          </button>
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            :disabled="doneItems.length === 0"
            @click="downloadAll"
          >
            <Download class="w-4 h-4" aria-hidden="true" />
            全部下载
          </button>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="clearAll"
          >
            <Trash2 class="w-4 h-4" aria-hidden="true" />
            清空
          </button>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="flex flex-col gap-6 mb-6">
        <div v-for="item in items" :key="item.id">
          <!-- 文件项头部:文件名 + 操作按钮 -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span
              class="text-xs truncate"
              style="
                color: var(--pz-color-text-secondary);
                font-family: var(--pz-font-mono);
              "
            >
              {{ item.file.name }}
            </span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="pz-btn-secondary pz-icon-btn"
                style="padding: 0.25rem 0.5rem"
                :disabled="item.status === 'processing'"
                :title="item.status === 'processing' ? '压缩中...' : '图片压缩'"
                aria-label="重新压缩该图片"
                @click="compressItem(item)"
              >
                <Image
                  class="w-3.5 h-3.5"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                class="pz-btn-secondary pz-icon-btn"
                style="padding: 0.25rem 0.5rem"
                title="删除"
                aria-label="移除该文件"
                @click="removeItem(item)"
              >
                <X class="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <!-- 前后预览对比 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <!-- 原图预览 -->
            <div class="pz-card p-4 flex flex-col">
              <span
                class="text-sm mb-3 shrink-0"
                style="color: var(--pz-color-text-secondary)"
              >
                原图
              </span>
              <div
                class="flex-1 flex items-center justify-center min-h-[160px]"
                style="
                  background-color: var(--pz-color-bg-tertiary);
                  border-radius: var(--pz-radius-md);
                "
              >
                <img
                  v-if="item.originalUrl"
                  :src="item.originalUrl"
                  class="pz-preview-img"
                  alt="原图预览"
                />
                <span
                  v-else
                  class="text-sm"
                  style="color: var(--pz-color-text-tertiary)"
                >
                  预览图
                </span>
              </div>
              <div class="mt-3 shrink-0 flex flex-col gap-1">
                <span
                  class="text-xs truncate"
                  style="
                    color: var(--pz-color-text-secondary);
                    font-family: var(--pz-font-mono);
                  "
                >
                  {{ item.file.name }}
                </span>
                <div
                  class="flex items-center gap-3 text-xs"
                  style="
                    color: var(--pz-color-text-secondary);
                    font-family: var(--pz-font-mono);
                  "
                >
                  <span>{{ formatFileSize(item.originalSize) }}</span>
                  <span v-if="item.originalWidth">
                    {{ item.originalWidth }}×{{ item.originalHeight }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 压缩后预览 -->
            <div class="pz-card p-4 flex flex-col">
              <div
                class="flex items-center justify-between mb-3 shrink-0"
              >
                <span
                  class="text-sm"
                  style="color: var(--pz-color-text-secondary)"
                >
                  压缩后
                </span>
                <span
                  v-if="item.status === 'done'"
                  class="pz-badge whitespace-nowrap"
                  :style="{
                    backgroundColor:
                      savingsPercent(item) > 0
                        ? 'var(--pz-state-success-bg)'
                        : 'var(--pz-state-warning-bg)',
                    color:
                      savingsPercent(item) > 0
                        ? 'var(--pz-state-success)'
                        : 'var(--pz-state-warning)',
                    borderRadius: 'var(--pz-radius-md)',
                  }"
                >
                  {{ savingsLabel(item) }}
                </span>
                <Loader2
                  v-else-if="item.status === 'processing'"
                  class="w-4 h-4 animate-spin"
                  style="color: var(--pz-color-text-tertiary)"
                  aria-hidden="true"
                />
              </div>
              <div
                class="flex-1 flex items-center justify-center min-h-[160px]"
                style="
                  background-color: var(--pz-color-bg-tertiary);
                  border-radius: var(--pz-radius-md);
                "
              >
                <img
                  v-if="item.resultUrl"
                  :src="item.resultUrl"
                  class="pz-preview-img"
                  alt="压缩后预览"
                />
                <Loader2
                  v-else-if="item.status === 'processing'"
                  class="w-6 h-6 animate-spin"
                  style="color: var(--pz-color-text-tertiary)"
                  aria-hidden="true"
                />
                <span
                  v-else-if="item.status === 'error'"
                  class="text-sm flex items-center gap-1"
                  style="color: var(--pz-state-error)"
                >
                  <AlertCircle class="w-4 h-4" aria-hidden="true" />
                  处理失败
                </span>
                <span
                  v-else
                  class="text-sm"
                  style="color: var(--pz-color-text-tertiary)"
                >
                  预览图
                </span>
              </div>
              <div class="mt-3 shrink-0 flex flex-col gap-1">
                <span
                  class="text-xs truncate"
                  style="
                    color: var(--pz-color-text-secondary);
                    font-family: var(--pz-font-mono);
                  "
                >
                  {{ item.file.name }}
                </span>
                <div
                  class="flex items-center gap-3 text-xs"
                  style="
                    color: var(--pz-color-text-secondary);
                    font-family: var(--pz-font-mono);
                  "
                >
                  <span v-if="item.status === 'done'">
                    {{ formatFileSize(item.resultSize) }}
                  </span>
                  <span v-else-if="item.status === 'processing'">压缩中...</span>
                  <span v-else-if="item.status === 'error'">—</span>
                  <span v-if="item.status === 'done' && item.resultWidth">
                    {{ item.resultWidth }}×{{ item.resultHeight }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 体积对比条 + 下载 -->
          <div
            class="pz-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-2">
                <span
                  class="text-sm whitespace-nowrap"
                  style="
                    color: var(--pz-color-text-secondary);
                    font-family: var(--pz-font-mono);
                  "
                >
                  <template v-if="item.status === 'done'">
                    {{ formatFileSize(item.originalSize) }} →
                    {{ formatFileSize(item.resultSize) }}
                  </template>
                  <template v-else-if="item.status === 'processing'">
                    正在压缩...
                  </template>
                  <template v-else>{{ formatFileSize(item.originalSize) }}</template>
                </span>
                <span
                  v-if="item.status === 'done'"
                  class="text-sm font-medium whitespace-nowrap"
                  :style="{
                    color:
                      savingsPercent(item) > 0
                        ? 'var(--pz-state-success)'
                        : 'var(--pz-state-warning)',
                  }"
                >
                  {{ savingsLabel(item) }}
                </span>
              </div>
              <div
                class="w-full h-2.5 rounded-full"
                style="background-color: var(--pz-color-bg-tertiary)"
              >
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: item.status === 'done' ? resultRatio(item) + '%' : '0%',
                    backgroundColor:
                      savingsPercent(item) > 0
                        ? 'var(--pz-state-success)'
                        : 'var(--pz-state-warning)',
                  }"
                />
              </div>
            </div>
            <button
              type="button"
              class="pz-btn-primary shrink-0"
              :disabled="item.status !== 'done'"
              aria-label="下载压缩后的图片"
              @click="downloadOne(item)"
            >
              <Download class="w-4 h-4" aria-hidden="true" />
              下载
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* === 上传拖拽区(参照 HTML .pz-dropzone) === */
.pz-dropzone {
  border: 2px dashed var(--pz-color-border-strong);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.pz-dropzone:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-dropzone.pz-dragover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}
.pz-dropzone:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}

/* === 质量滑块(参照 HTML .pz-range) === */
.pz-range {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-full);
  outline: none;
  cursor: pointer;
}
.pz-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background-color: var(--pz-color-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
.pz-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background-color: var(--pz-color-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
.pz-range:focus-visible {
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}

/* === 预览图约束 === */
.pz-preview-img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  border-radius: var(--pz-radius-md);
}

/* === 图标按钮(移除文件) === */
.pz-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (prefers-reduced-motion: reduce) {
  .pz-dropzone,
  .pz-range,
  .h-full {
    transition: none;
  }
}
</style>
