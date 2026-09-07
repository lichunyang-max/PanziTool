<script setup lang="ts">
/**
 * UnicodeConvertTool.vue - Unicode 转中文 / 中文转 Unicode 工具组件
 *
 * 严格参照 panziui/tools/unicode-convert.html 交互区结构：
 * 1. 模式切换（Unicode → 中文 / 中文 → Unicode）— pz-mode-toggle
 * 2. 输入输出双栏（同卡片上下排列）+ 操作按钮（转换/清空/复制结果/交换）+ 错误展示区
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
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
import {
  decodeUnicode,
  encodeUnicode,
} from '~/utils/tools/unicode'

useHead({
  titleTemplate: null,
  title: 'Unicode转中文 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线Unicode编码转换工具，\\uXXXX转义与中文互转，支持\\u、\\u{}、&#x;格式，混合文本解析，快速还原日志乱码。'
    },
    {
      name: 'keywords',
      content: 'Unicode转中文,中文转Unicode,\\uXXXX转义,Unicode编码转换,日志乱码还原'
    },
    {
      property: 'og:title',
      content: 'Unicode转中文 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线Unicode编码转换工具，\\uXXXX转义与中文互转，支持\\u、\\u{}、&#x;格式，混合文本解析，快速还原日志乱码。'
    }
  ]
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'unicode-convert',
)

type Mode = 'decode' | 'encode'

const mode = ref<Mode>('decode')

// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const SAMPLE_DECODE = '\\u76d8\\u5b50\\u5de5\\u5177\\u7ad9 Hello!'
const input = ref(SAMPLE_DECODE)
const output = ref(decodeUnicode(SAMPLE_DECODE).output ?? '')
const errorMsg = ref('')

// 复制按钮闪烁态
const copied = ref(false)

const inputLabel = computed(() =>
  mode.value === 'decode' ? '输入内容（含 \\uXXXX 转义）' : '输入文本',
)
const outputLabel = computed(() => '转换结果')
const inputPlaceholder = computed(() =>
  mode.value === 'decode'
    ? '请输入包含 \\uXXXX 转义的文本，例如：\\u76d8\\u5b50\\u5de5\\u5177\\u7ad9'
    : '请输入要转换的文本，例如：盘子工具站',
)
const outputPlaceholder = computed(() => '转换结果将显示在这里')
const modeHint = computed(() =>
  mode.value === 'decode'
    ? '将 \\uXXXX、\\u{}、&#x; 等转义序列还原为中文'
    : '将中文等非 ASCII 字符转为 \\uXXXX 转义',
)

const inputCount = computed(() => `${input.value.length} 字符`)
const outputCount = computed(() => `${output.value.length} 字符`)

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

  const result =
    mode.value === 'decode' ? decodeUnicode(raw) : encodeUnicode(raw)

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

/** Ctrl/Cmd + Enter 触发转换 */
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    doConvert()
  }
}
</script>

<template>
  <div>
    <!-- 1. 模式切换 -->
    <div class="flex items-center gap-3 mb-4">
      <div class="pz-mode-toggle" role="tablist" aria-label="编码/解码模式">
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'decode'"
          role="tab"
          :aria-selected="mode === 'decode'"
          @click="setMode('decode')"
        >
          Unicode → 中文
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'encode'"
          role="tab"
          :aria-selected="mode === 'encode'"
          @click="setMode('encode')"
        >
          中文 → Unicode
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
            for="pz-uni-input"
          >
            {{ inputLabel }}
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ inputCount }}
          </span>
        </div>
        <textarea
          id="pz-uni-input"
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
            for="pz-uni-output"
          >
            {{ outputLabel }}
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ outputCount }}
          </span>
        </div>
        <textarea
          id="pz-uni-output"
          v-model="output"
          class="pz-b64-textarea"
          rows="5"
          readonly
          :placeholder="outputPlaceholder"
        />
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
