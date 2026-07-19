<script setup lang="ts">
/**
 * Base64Tool.vue - Base64 编码/解码工具组件
 *
 * 严格参照 ui/pages/Base64编码.html 交互区结构：
 * 1. 模式切换（Base64 编码 / Base64 解码）— pz-mode-toggle
 * 2. 输入输出双栏（同卡片上下排列）+ 操作按钮（转换/清空/复制结果/交换）+ 错误展示区
 * 3. 编码选项卡片：字符编码方式 radio（UTF-8 / ASCII）+ 输出格式 checkbox（每 76 字符换行）
 * 4. 文件转 Base64 卡片：拖拽上传区 + 文件信息展示
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 转换按钮 → tool_use 事件
 * - 复制结果 → copy 事件
 */
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  Copy,
  FileText,
  RefreshCw,
  Settings,
  Trash2,
  UploadCloud,
} from 'lucide-vue-next'
import {
  addLineBreaks,
  decodeBase64,
  encodeBase64,
  fileToBase64,
} from '~/utils/tools/base64'
import type { Base64Charset } from '~/utils/tools/base64'

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'base64',
)

type Mode = 'encode' | 'decode'

const mode = ref<Mode>('encode')
const charset = ref<Base64Charset>('utf8')
const linebreak = ref(false)

const input = ref('')
const output = ref('')
const errorMsg = ref('')

// 文件上传状态
const fileName = ref('')
const fileSize = ref('')
const fileBase64 = ref('')
const fileError = ref('')
const dragover = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 复制按钮闪烁态
const copied = ref(false)
const fileCopied = ref(false)

const inputLabel = computed(() =>
  mode.value === 'encode' ? '输入文本' : '输入 Base64 字符串',
)
const outputLabel = computed(() =>
  mode.value === 'encode' ? '编码结果' : '解码结果',
)
const inputPlaceholder = computed(() =>
  mode.value === 'encode'
    ? '输入要编码的文本，如 Hello World 或 中文测试'
    : '输入要解码的 Base64 字符串，如 SGVsbG8gV29ybGQ= 或 5Lit5paH',
)
const outputPlaceholder = computed(() =>
  mode.value === 'encode' ? '编码结果将显示在这里' : '解码结果将显示在这里',
)
const modeHint = computed(() =>
  mode.value === 'encode'
    ? '将普通文本转换为 Base64 编码格式'
    : '将 Base64 编码文本还原为普通文本',
)

const inputCount = computed(() => `${input.value.length} 字符`)
const outputCount = computed(() => `${output.value.length} 字符`)
const hasFileResult = computed(() => !!fileBase64.value || !!fileError.value)

function setMode(next: Mode) {
  if (mode.value === next) return
  mode.value = next
  errorMsg.value = ''
}

/** 执行编码/解码转换 */
function doConvert() {
  errorMsg.value = ''
  const raw = input.value
  if (raw === '') {
    output.value = ''
    return
  }

  let result
  if (mode.value === 'encode') {
    result = encodeBase64(raw, charset.value)
    if (result.success && result.output && linebreak.value) {
      result.output = addLineBreaks(result.output, 76)
    }
  } else {
    result = decodeBase64(raw, charset.value)
  }

  if (result.success) {
    output.value = result.output ?? ''
  } else {
    output.value = ''
    errorMsg.value = result.error || '转换失败'
  }

  // 上报 tool_use 事件
  reportEvent('tool_use', effectiveSlug.value)
}

function doClear() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}

async function copyOutput() {
  if (!output.value) return
  await copyToClipboard(output.value)
  flashCopied()
  reportEvent('copy', effectiveSlug.value)
}

function doSwap() {
  const tmp = input.value
  input.value = output.value
  output.value = tmp
  errorMsg.value = ''
}

/** 复制到剪贴板，带 execCommand 降级 */
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

function flashFileCopied() {
  fileCopied.value = true
  setTimeout(() => {
    fileCopied.value = false
  }, 1500)
}

/** Ctrl/Cmd + Enter 触发转换 */
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    doConvert()
  }
}

// ===== 文件转 Base64 =====
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

async function handleFile(file: File) {
  if (!file) return
  fileName.value = file.name
  fileSize.value = `(${formatFileSize(file.size)})`
  fileError.value = ''
  fileBase64.value = ''
  try {
    fileBase64.value = await fileToBase64(file)
  } catch {
    fileError.value = '读取文件失败，请重试。'
  }
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

async function copyFileBase64() {
  if (!fileBase64.value) return
  await copyToClipboard(fileBase64.value)
  flashFileCopied()
  reportEvent('copy', effectiveSlug.value)
}

function clearFile() {
  if (fileInputRef.value) fileInputRef.value.value = ''
  fileName.value = ''
  fileSize.value = ''
  fileBase64.value = ''
  fileError.value = ''
}

useHead({
  titleTemplate: null,
  title: 'Base64编码解码 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线Base64编码解码工具，支持文本与图片文件互转，兼容UTF-8编码，免登录打开即用，本地浏览器处理保障数据安全。'
    },
    {
      name: 'keywords',
      content: 'Base64编码,Base64解码,Base64转换,图片Base64'
    },
    {
      property: 'og:title',
      content: 'Base64编码解码 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线Base64编码解码工具，支持文本与图片文件互转，兼容UTF-8编码，免登录打开即用，本地浏览器处理保障数据安全。'
    }
  ]
})
</script>

<template>
  <div>
    <!-- 1. 模式切换 -->
    <div class="flex items-center gap-3 mb-4">
      <div class="pz-mode-toggle" role="tablist" aria-label="编码/解码模式">
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'encode'"
          role="tab"
          :aria-selected="mode === 'encode'"
          @click="setMode('encode')"
        >
          Base64 编码
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'decode'"
          role="tab"
          :aria-selected="mode === 'decode'"
          @click="setMode('decode')"
        >
          Base64 解码
        </button>
      </div>
      <span
        class="text-xs whitespace-nowrap"
        style="color: var(--pz-color-text-tertiary)"
      >
        {{ modeHint }}
      </span>
    </div>

    <!-- 2. 输入/输出双栏 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <!-- 输入 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-b64-input"
          >
            {{ inputLabel }}
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ inputCount }}
          </span>
        </div>
        <textarea
          id="pz-b64-input"
          v-model="input"
          class="pz-b64-textarea"
          rows="5"
          :placeholder="inputPlaceholder"
          @keydown="onInputKeydown"
        />
      </div>

      <!-- 操作栏 -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="doConvert"
        >
          <RefreshCw class="w-4 h-4" aria-hidden="true" />
          <span>转换</span>
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doClear"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          <span>清空</span>
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="copyOutput"
        >
          <component
            :is="copied ? Check : Copy"
            class="w-4 h-4"
            aria-hidden="true"
          />
          <span>{{ copied ? '已复制' : '复制结果' }}</span>
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doSwap"
        >
          <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
          <span>交换</span>
        </button>
      </div>

      <!-- 错误展示 -->
      <div
        v-if="errorMsg"
        class="pz-error-text flex items-start gap-2"
        role="alert"
      >
        <AlertCircle
          class="w-4 h-4 shrink-0 mt-0.5"
          style="color: var(--pz-state-error)"
          aria-hidden="true"
        />
        <span>{{ errorMsg }}</span>
      </div>

      <!-- 输出 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-b64-output"
          >
            {{ outputLabel }}
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ outputCount }}
          </span>
        </div>
        <textarea
          id="pz-b64-output"
          v-model="output"
          class="pz-b64-textarea"
          rows="5"
          readonly
          :placeholder="outputPlaceholder"
        />
      </div>
    </div>

    <!-- 3. 编码选项 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Settings
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          编码选项
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 字符编码方式 -->
        <div class="flex flex-col gap-1">
          <div
            class="text-xs font-semibold mb-1"
            style="color: var(--pz-color-text-secondary)"
          >
            字符编码方式
          </div>
          <label class="pz-option-row">
            <input
              v-model="charset"
              type="radio"
              name="pz-b64-charset"
              value="utf8"
              class="pz-option-radio"
            />
            <span class="pz-option-label">
              UTF-8 编码（支持中文等多字节字符）
            </span>
          </label>
          <label class="pz-option-row">
            <input
              v-model="charset"
              type="radio"
              name="pz-b64-charset"
              value="ascii"
              class="pz-option-radio"
            />
            <span class="pz-option-label">
              ASCII 编码（仅支持英文和基本符号）
            </span>
          </label>
        </div>
        <!-- 输出格式 -->
        <div class="flex flex-col gap-1">
          <div
            class="text-xs font-semibold mb-1"
            style="color: var(--pz-color-text-secondary)"
          >
            输出格式
          </div>
          <label class="pz-option-row">
            <input
              v-model="linebreak"
              type="checkbox"
              class="pz-option-checkbox"
            />
            <span class="pz-option-label">
              添加换行（每76字符，RFC 2045 风格）
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- 4. 文件转 Base64 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <FileText
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          文件转 Base64
        </h2>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        aria-hidden="true"
        @change="onFileChange"
      />
      <div
        class="pz-upload-area"
        :class="{ 'pz-dragover': dragover }"
        role="button"
        tabindex="0"
        aria-label="选择文件"
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
            拖拽文件到此处或点击选择文件
          </div>
          <div class="text-xs" style="color: var(--pz-color-text-tertiary)">
            支持图片、文本等任意文件类型，大文件可能需要较长时间处理
          </div>
        </div>
      </div>

      <!-- 文件结果（选择文件后显示） -->
      <div v-if="hasFileResult" class="mt-4 flex flex-col gap-3">
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
        <template v-else>
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div
              class="flex items-center gap-2 text-sm"
              style="color: var(--pz-color-text-primary)"
            >
              <FileText
                class="w-4 h-4"
                style="color: var(--pz-color-primary)"
                aria-hidden="true"
              />
              <span class="font-medium">{{ fileName }}</span>
              <span
                class="text-xs"
                style="color: var(--pz-color-text-tertiary)"
              >
                {{ fileSize }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="pz-btn-secondary whitespace-nowrap"
                style="padding: 0.25rem 0.75rem"
                @click="copyFileBase64"
              >
                <component
                  :is="fileCopied ? Check : Copy"
                  class="w-[14px] h-[14px]"
                  aria-hidden="true"
                />
                <span>{{ fileCopied ? '已复制' : '复制 Base64' }}</span>
              </button>
              <button
                type="button"
                class="pz-btn-secondary whitespace-nowrap"
                style="padding: 0.25rem 0.75rem"
                @click="clearFile"
              >
                <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />
                <span>清除</span>
              </button>
            </div>
          </div>
          <pre class="pz-file-output">{{ fileBase64 }}</pre>
        </template>
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
