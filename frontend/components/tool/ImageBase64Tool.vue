<script setup lang="ts">
/**
 * ImageBase64Tool.vue - 图片 Base64 互转工具组件
 *
 * 严格参照 panziui/tools/image-base64.html 交互区结构：
 * 1. 模式切换（图片 → Base64 / Base64 → 图片）— pz-mode-toggle
 * 2. 图片 → Base64：拖拽上传区 + 文件信息缩略图（pz-upload-area）
 * 3. Base64 → 图片：粘贴 Base64 输入框 + 实时预览
 * 4. 结果卡片：Data URI 输出 + 复制 + 元信息
 * 5. 图片预览卡片（Base64 → 图片）：还原图片 + 尺寸 + 下载链接
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 选择图片 / 输入 Base64 触发转换 → tool_use 事件
 * - 复制结果 → copy 事件
 */
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Trash2,
  UploadCloud,
} from 'lucide-vue-next'
import {
  fileToImageBase64,
  normalizeBase64ToImageSrc,
} from '~/utils/tools/imageBase64'

useHead({
  titleTemplate: null,
  title: '图片Base64互转 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线图片Base64转换工具，图片转Base64字符串、Base64还原图片预览，支持PNG/JPG/GIF/WebP/SVG，纯本地处理不上传。'
    },
    {
      name: 'keywords',
      content: '图片Base64,图片转Base64,Base64转图片,Data URI,图片编码'
    },
    {
      property: 'og:title',
      content: '图片Base64互转 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线图片Base64转换工具，图片转Base64字符串、Base64还原图片预览，支持PNG/JPG/GIF/WebP/SVG，纯本地处理不上传。'
    }
  ]
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'image-base64',
)

type Mode = 'to-base64' | 'to-image'

// 1x1 透明 PNG Data URI，用于 SSR 预填示例（保证预渲染页面有可渲染内容）
const SAMPLE_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const mode = ref<Mode>('to-image')

// ===== 图片 → Base64 状态 =====
const fileName = ref('')
const fileSizeText = ref('')
const fileTypeText = ref('')
const fileThumbSrc = ref('')
const fileError = ref('')
const dragover = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// ===== Base64 → 图片状态 =====
const base64Input = ref(SAMPLE_DATA_URI)
const toImageError = ref('')

// ===== 共享结果 / 预览状态 =====
const output = ref(normalizeBase64ToImageSrc(SAMPLE_DATA_URI).output ?? '')
const resultMeta = ref('')
const previewSrc = ref(output.value)
const downloadName = ref('decoded-image.png')
const imgRef = ref<HTMLImageElement | null>(null)

// 复制按钮闪烁态
const copied = ref(false)

const modeHint = computed(() =>
  mode.value === 'to-base64'
    ? '将图片文件转换为 Base64 Data URI'
    : '将 Base64 字符串还原为图片并预览',
)

function setMode(next: Mode) {
  if (mode.value === next) return
  mode.value = next
  // 切换模式时清空另一模式的结果与预览
  output.value = ''
  resultMeta.value = ''
  previewSrc.value = ''
  fileError.value = ''
  toImageError.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ===== 图片 → Base64 =====
async function handleFile(file: File) {
  fileError.value = ''
  if (!file) return

  const result = await fileToImageBase64(file)
  if (!result.success || !result.output) {
    fileError.value = result.error || '读取文件失败'
    fileName.value = ''
    fileSizeText.value = ''
    fileTypeText.value = ''
    fileThumbSrc.value = ''
    output.value = ''
    resultMeta.value = ''
    previewSrc.value = ''
    return
  }

  fileName.value = file.name
  fileSizeText.value = formatFileSize(file.size)
  fileTypeText.value = file.type || '未知类型'
  fileThumbSrc.value = result.output
  output.value = result.output
  resultMeta.value = `Base64 字符串长度：${result.output.length} 个字符（约为原文件的 ${Math.round(
    (result.output.length / Math.max(file.size, 1)) * 100,
  )}%）`
  previewSrc.value = ''

  reportEvent('tool_use', effectiveSlug.value)
}

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

function clearFile() {
  if (fileInputRef.value) fileInputRef.value.value = ''
  fileName.value = ''
  fileSizeText.value = ''
  fileTypeText.value = ''
  fileThumbSrc.value = ''
  fileError.value = ''
  output.value = ''
  resultMeta.value = ''
  previewSrc.value = ''
}

// ===== Base64 → 图片 =====
function decodeBase64Input() {
  toImageError.value = ''
  const raw = base64Input.value.trim()
  if (!raw) {
    output.value = ''
    resultMeta.value = ''
    previewSrc.value = ''
    return
  }

  const result = normalizeBase64ToImageSrc(raw)
  if (!result.success || !result.output) {
    toImageError.value = result.error || '格式错误'
    output.value = ''
    resultMeta.value = ''
    previewSrc.value = ''
    return
  }

  output.value = result.output
  previewSrc.value = result.output
  // 尺寸与类型在 <img> @load 后读取

  reportEvent('tool_use', effectiveSlug.value)
}

function onImgLoad() {
  const img = imgRef.value
  if (!img) return
  const typeMatch = output.value.match(/^data:(image\/[a-z+]+);/i)
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'image/png'
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  downloadName.value = 'decoded-image.' + (extMap[type] || 'png')
  resultMeta.value = `图片加载成功：宽 ${img.naturalWidth} × 高 ${img.naturalHeight}，类型 ${type}，Base64 长度 ${output.value.length} 个字符`
}

function onImgError() {
  toImageError.value =
    'Base64 内容无法解析为图片，请检查字符串是否完整（可能存在截断或换行错误）'
  previewSrc.value = ''
}

function clearBase64() {
  base64Input.value = ''
  output.value = ''
  resultMeta.value = ''
  previewSrc.value = ''
  toImageError.value = ''
}

/** Ctrl/Cmd + Enter 触发解析（实时预览模式下重新校验） */
function onBase64Keydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    decodeBase64Input()
  }
}

// ===== 复制 =====
async function copyOutput() {
  if (!output.value) return
  await copyToClipboard(output.value)
  flashCopied()
  reportEvent('copy', effectiveSlug.value)
}

async function copyToClipboard(text: string): Promise<void> {
  if (import.meta.server) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // 降级到 execCommand
  }
  fallbackCopy(text)
}

function fallbackCopy(text: string) {
  if (import.meta.server) return
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } catch {
    // 忽略复制失败
  }
  document.body.removeChild(ta)
}

function flashCopied() {
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <div>
    <!-- 1. 模式切换 -->
    <div class="flex items-center gap-3 mb-4">
      <div class="pz-mode-toggle" role="tablist" aria-label="转换方向">
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'to-base64'"
          role="tab"
          :aria-selected="mode === 'to-base64'"
          @click="setMode('to-base64')"
        >
          图片 → Base64
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'to-image'"
          role="tab"
          :aria-selected="mode === 'to-image'"
          @click="setMode('to-image')"
        >
          Base64 → 图片
        </button>
      </div>
      <span
        class="text-xs whitespace-nowrap"
        style="color: var(--pz-color-text-tertiary)"
      >
        {{ modeHint }}
      </span>
    </div>

    <!-- 2. 操作区 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <!-- 图片 → Base64 -->
      <div v-if="mode === 'to-base64'" class="flex flex-col gap-3">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          aria-hidden="true"
          @change="onFileChange"
        />
        <div
          class="pz-upload-area"
          :class="{ 'pz-dragover': dragover }"
          role="button"
          tabindex="0"
          aria-label="选择图片"
          @click="triggerFileInput"
          @keydown.enter.prevent="triggerFileInput"
          @keydown.space.prevent="triggerFileInput"
          @dragover="onDragOver"
          @dragenter="onDragEnter"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <div class="flex flex-col items-center gap-2">
            <UploadCloud
              class="w-8 h-8"
              style="color: var(--pz-color-text-tertiary)"
              aria-hidden="true"
            />
            <div
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary)"
            >
              点击选择图片，或将图片拖拽到此处
            </div>
            <div class="text-xs" style="color: var(--pz-color-text-tertiary)">
              支持 PNG / JPG / GIF / WebP / SVG，最大 5MB
            </div>
          </div>
        </div>

        <div
          v-if="fileError"
          class="pz-error-text flex items-start gap-2"
          role="alert"
        >
          <AlertCircle
            class="w-4 h-4 shrink-0 mt-0.5"
            style="color: var(--pz-state-error)"
            aria-hidden="true"
          />
          <span>{{ fileError }}</span>
        </div>

        <!-- 文件信息 + 缩略图 -->
        <div
          v-if="fileName"
          class="flex items-center gap-3 flex-wrap"
        >
          <img
            :src="fileThumbSrc"
            alt="预览"
            style="
              width: 64px;
              height: 64px;
              object-fit: cover;
              border-radius: var(--pz-radius-md);
              border: 1px solid var(--pz-color-border);
            "
          />
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium"
              style="color: var(--pz-color-text-primary); word-break: break-all"
            >
              {{ fileName }}
            </p>
            <p class="text-xs" style="color: var(--pz-color-text-tertiary)">
              {{ fileSizeText }} · {{ fileTypeText }}
            </p>
          </div>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            @click="clearFile"
          >
            <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />
            <span>移除</span>
          </button>
        </div>
      </div>

      <!-- Base64 → 图片 -->
      <div v-else class="flex flex-col gap-2">
        <label
          class="text-xs font-semibold"
          style="color: var(--pz-color-text-secondary)"
          for="pz-ib-input"
        >
          粘贴 Base64 字符串
        </label>
        <textarea
          id="pz-ib-input"
          v-model="base64Input"
          class="pz-b64-textarea"
          rows="6"
          placeholder="粘贴 Data URI（data:image/png;base64,...）或纯 Base64 字符串，实时预览"
          @input="decodeBase64Input"
          @keydown="onBase64Keydown"
        />
        <div
          v-if="toImageError"
          class="pz-error-text flex items-start gap-2"
          role="alert"
        >
          <AlertCircle
            class="w-4 h-4 shrink-0 mt-0.5"
            style="color: var(--pz-state-error)"
            aria-hidden="true"
          />
          <span>{{ toImageError }}</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="clearBase64"
          >
            <Trash2 class="w-4 h-4" aria-hidden="true" />
            <span>清空</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 3. 结果区 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center justify-between gap-2 mb-3">
        <h2
          class="text-sm font-semibold"
          style="color: var(--pz-color-text-secondary)"
        >
          结果
        </h2>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          style="padding: 0.25rem 0.75rem"
          :disabled="!output"
          @click="copyOutput"
        >
          <component
            :is="copied ? Check : Copy"
            class="w-[14px] h-[14px]"
            aria-hidden="true"
          />
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>
      </div>
      <pre class="pz-file-output">{{ output || '结果将显示在这里' }}</pre>
      <p
        v-if="resultMeta"
        class="text-xs mt-2"
        style="color: var(--pz-color-text-tertiary)"
      >
        {{ resultMeta }}
      </p>
    </div>

    <!-- 4. 图片预览（Base64 → 图片模式） -->
    <div
      v-if="mode === 'to-image' && previewSrc"
      class="pz-card p-4 mb-6"
    >
      <div class="flex items-center justify-between gap-2 mb-3">
        <h2
          class="text-sm font-semibold"
          style="color: var(--pz-color-text-secondary)"
        >
          图片预览
        </h2>
        <a
          class="pz-btn-secondary whitespace-nowrap"
          style="padding: 0.25rem 0.75rem; text-decoration: none"
          :href="previewSrc"
          :download="downloadName"
          @click.stop
        >
          <Download class="w-[14px] h-[14px]" aria-hidden="true" />
          <span>下载图片</span>
        </a>
      </div>
      <div
        style="
          text-align: center;
          padding: 0.5rem;
          background-color: var(--pz-color-bg-secondary);
          border-radius: var(--pz-radius-md);
        "
      >
        <img
          ref="imgRef"
          :src="previewSrc"
          alt="还原的图片预览"
          style="max-width: 100%; max-height: 400px"
          @load="onImgLoad"
          @error="onImgError"
        />
      </div>
    </div>

    <!-- 5. 文件提示图标（占位说明，与 Base64 工具风格一致） -->
    <div v-if="mode === 'to-base64' && !fileName" class="pz-card p-4">
      <div class="flex items-center gap-2">
        <FileText
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <span
          class="text-sm"
          style="color: var(--pz-color-text-secondary)"
        >
          选择图片后将自动生成 Base64 Data URI，可直接用于 CSS / HTML。
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === Mode toggle pills === */
.pz-mode-toggle {
  display: inline-flex;
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-full);
  padding: 0.25rem;
  gap: 0.25rem;
}
.pz-mode-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 1rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
  border-radius: var(--pz-radius-full);
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  background: transparent;
  white-space: nowrap;
}
.pz-mode-btn:hover {
  color: var(--pz-color-text-primary);
}
.pz-mode-btn[data-active='true'] {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
}

/* === Large textarea for input/output === */
.pz-b64-textarea {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  line-height: var(--pz-leading-relaxed);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem;
  outline: none;
  resize: vertical;
  width: 100%;
  min-height: 120px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.pz-b64-textarea:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}
.pz-b64-textarea[readonly] {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-secondary);
}

/* === Encoding option row === */
.pz-option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--pz-radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.pz-option-row:hover {
  background-color: var(--pz-color-bg-secondary);
}
.pz-option-radio {
  width: 16px;
  height: 16px;
  accent-color: var(--pz-color-primary);
  cursor: pointer;
}
.pz-option-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--pz-color-primary);
  cursor: pointer;
}
.pz-option-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
}

/* === File upload area === */
.pz-upload-area {
  border: 2px dashed var(--pz-color-border-strong);
  border-radius: var(--pz-radius-lg);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  background-color: var(--pz-color-bg-secondary);
}
.pz-upload-area:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-upload-area.pz-dragover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}

/* === File Base64 output === */
.pz-file-output {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  line-height: var(--pz-leading-normal);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem;
  overflow: auto;
  white-space: pre;
  margin: 0;
  max-height: 200px;
  word-break: break-all;
}

/* === Error display === */
.pz-error-text {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-state-error);
  background-color: var(--pz-state-error-bg);
  border: 1px solid var(--pz-state-error-border);
  border-radius: var(--pz-radius-md);
  padding: 0.5rem 0.75rem;
}

@media (prefers-reduced-motion: reduce) {
  .pz-mode-btn,
  .pz-option-row,
  .pz-upload-area,
  .pz-b64-textarea {
    transition: none;
  }
}
</style>
