<script setup lang="ts">
/**
 * HexEncodeTool.vue - Hex 十六进制编解码工具组件
 *
 * 严格参照 panziui/tools/hex-encode.html 交互区结构：
 * 1. 模式切换（文本 → Hex / Hex → 文本）— pz-mode-toggle
 * 2. 输入输出双栏（同卡片上下排列）+ 操作按钮（转换/清空/复制结果/交换）+ 错误展示区
 * 3. 编码选项卡片：分隔格式 radio（无分隔 / 空格 / 0x 前缀 / \x 前缀），仅编码模式可见
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
  Settings,
  Trash2,
} from 'lucide-vue-next'
import {
  decodeHex,
  encodeHex,
  type HexSeparator,
} from '~/utils/tools/hex'

useHead({
  titleTemplate: null,
  title: 'Hex十六进制编解码 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线Hex十六进制编解码工具，支持字符串与十六进制互转、多种分隔符格式、字节调试，本地运算保障数据安全。'
    },
    {
      name: 'keywords',
      content: 'Hex编码,十六进制编码,Hex解码,十六进制转换,字节调试'
    },
    {
      property: 'og:title',
      content: 'Hex十六进制编解码 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线Hex十六进制编解码工具，支持字符串与十六进制互转、多种分隔符格式、字节调试，本地运算保障数据安全。'
    }
  ]
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'hex-encode',
)

type Mode = 'encode' | 'decode'

const mode = ref<Mode>('encode')
const separator = ref<HexSeparator>('space')

// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const SAMPLE_TEXT = 'Hello 盘子工具站'
const input = ref(SAMPLE_TEXT)
const output = ref(encodeHex(SAMPLE_TEXT, 'space').output ?? '')
const errorMsg = ref('')
const resultMeta = ref('')

// 复制按钮闪烁态
const copied = ref(false)

const inputLabel = computed(() =>
  mode.value === 'encode' ? '输入文本' : '输入十六进制字符串',
)
const outputLabel = computed(() => '转换结果')
const inputPlaceholder = computed(() =>
  mode.value === 'encode'
    ? '请输入要编码的文本，例如：Hello 盘子工具站'
    : '请输入要解码的十六进制字符串，例如：48 65 6C 6C 6F',
)
const outputPlaceholder = computed(() => '转换结果将显示在这里')
const modeHint = computed(() =>
  mode.value === 'encode'
    ? '将文本按 UTF-8 编码为十六进制字节序列'
    : '将十六进制字节序列解码为文本',
)

const inputCount = computed(() => `${input.value.length} 字符`)
const outputCount = computed(() => `${output.value.length} 字符`)

function setMode(next: Mode) {
  if (mode.value === next) return
  mode.value = next
  errorMsg.value = ''
  resultMeta.value = ''
}

/** 执行编码/解码转换 */
function doConvert() {
  errorMsg.value = ''
  resultMeta.value = ''
  const raw = input.value
  if (raw === '') {
    output.value = ''
    return
  }

  let result
  if (mode.value === 'encode') {
    result = encodeHex(raw, separator.value)
    if (result.success && result.output) {
      const byteLen = new TextEncoder().encode(raw).length
      resultMeta.value = `共 ${raw.length} 个字符，${byteLen} 个字节，输出 ${result.output.length} 个字符`
    }
  } else {
    result = decodeHex(raw)
    if (result.success && result.output) {
      const cleaned = raw
        .replace(/0[xX]/g, '')
        .replace(/\\x/gi, '')
        .replace(/[\s,;:.\-_]/g, '')
      resultMeta.value = `共 ${cleaned.length / 2} 个字节解码为文本`
    }
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
  resultMeta.value = ''
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
  resultMeta.value = ''
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

// 切换分隔符时，若编码模式已有输入则自动刷新结果（与源页 hexAutoConvert 一致）
watch(separator, () => {
  if (mode.value === 'encode' && input.value) {
    doConvert()
  }
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
          文本 → Hex
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          :data-active="mode === 'decode'"
          role="tab"
          :aria-selected="mode === 'decode'"
          @click="setMode('decode')"
        >
          Hex → 文本
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
            for="pz-hex-input"
          >
            {{ inputLabel }}
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ inputCount }}
          </span>
        </div>
        <textarea
          id="pz-hex-input"
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
            for="pz-hex-output"
          >
            {{ outputLabel }}
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ outputCount }}
          </span>
        </div>
        <textarea
          id="pz-hex-output"
          v-model="output"
          class="pz-b64-textarea"
          rows="5"
          readonly
          :placeholder="outputPlaceholder"
        />
        <p
          v-if="resultMeta"
          class="text-xs"
          style="color: var(--pz-color-text-tertiary)"
        >
          {{ resultMeta }}
        </p>
      </div>
    </div>

    <!-- 3. 分隔格式（仅编码模式） -->
    <div v-if="mode === 'encode'" class="pz-card p-4 mb-6">
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
          分隔格式
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label class="pz-option-row">
          <input
            v-model="separator"
            type="radio"
            name="pz-hex-separator"
            value="none"
            class="pz-option-radio"
          />
          <span class="pz-option-label">无分隔（连续）</span>
        </label>
        <label class="pz-option-row">
          <input
            v-model="separator"
            type="radio"
            name="pz-hex-separator"
            value="space"
            class="pz-option-radio"
          />
          <span class="pz-option-label">空格分隔</span>
        </label>
        <label class="pz-option-row">
          <input
            v-model="separator"
            type="radio"
            name="pz-hex-separator"
            value="0x"
            class="pz-option-radio"
          />
          <span class="pz-option-label">0x 前缀</span>
        </label>
        <label class="pz-option-row">
          <input
            v-model="separator"
            type="radio"
            name="pz-hex-separator"
            value="backslash-x"
            class="pz-option-radio"
          />
          <span class="pz-option-label">\x 前缀</span>
        </label>
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
