<script setup lang="ts">
/**
 * UrlEncodeTool.vue - URL 编码/解码工具组件
 *
 * 严格参照 ui/pages/URL编码解码.html 的交互区结构：
 * 1. 模式切换（URL 编码 / URL 解码）
 * 2. 输入输出双栏（同一卡片内上下排列）+ 操作按钮（转换/清空/复制/交换）+ 错误展示
 * 3. 编码选项卡片（编码函数 radio + 空格编码方式 radio）
 * 4. 批量处理卡片（批量输入/批量结果，双栏 lg:grid-cols-2）
 * 5. 常见特殊字符编码对照表
 *
 * 由 [slug].vue 通过 ToolLayout 默认插槽渲染。
 */
import {
  AlertCircle,
  ArrowDownUp,
  BarChart3,
  Check,
  Copy,
  FileText,
  RotateCcw,
  Settings,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import {
  batchDecode,
  batchEncode,
  decodeUrl,
  encodeUrl,
  type EncodeFunction,
  type SpaceMode,
} from '~/utils/tools/url'

useHead({
  titleTemplate: null,
  title: 'URL编码解码 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线URL编码解码工具，支持UrlEncode/Decode互转、批量处理、多种编码函数，附特殊字符对照表，免登录打开即用，本地处理数据安全。'
    },
    {
      name: 'keywords',
      content: 'URL编码解码,UrlEncode,UrlDecode,URL转换'
    },
    {
      property: 'og:title',
      content: 'URL编码解码 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线URL编码解码工具，支持UrlEncode/Decode互转、批量处理、多种编码函数，附特殊字符对照表，免登录打开即用，本地处理数据安全。'
    }
  ]
})

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

const { data: adData } = await useAsyncData<AdItem | null>(
  'dev-tool-middle-ad',
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
        params: { locationSymbol: 'dev_tool_middle' },
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

// === 状态 ===
const mode = ref<'encode' | 'decode'>('encode')
const batchMode = ref<'encode' | 'decode'>('encode')
const encodeFn = ref<EncodeFunction>('encodeURIComponent')
const spaceMode = ref<SpaceMode>('percent20')

// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const SAMPLE_URL = 'https://example.com/搜索?q=中文测试'
const input = ref(SAMPLE_URL)
const output = ref(
  encodeUrl(SAMPLE_URL, 'encodeURIComponent', 'percent20').output ?? '',
)
const error = ref('')

const batchInput = ref('')
const batchResults = ref<string[]>([])
const hasBatchResult = ref(false)

const copied = ref(false)
const batchCopied = ref(false)

// === 计算属性 ===
const inputCount = computed(() => input.value.length)
const outputCount = computed(() => output.value.length)

const inputLabel = computed(() =>
  mode.value === 'encode' ? '输入文本' : '输入 URL 编码文本',
)
const outputLabel = computed(() =>
  mode.value === 'encode' ? '编码结果' : '解码结果',
)
const modeHint = computed(() =>
  mode.value === 'encode'
    ? '将普通文本转换为 URL 安全的编码格式'
    : '将 URL 编码文本还原为普通文本',
)
const inputPlaceholder = computed(() =>
  mode.value === 'encode'
    ? '输入要编码的文本，如 https://example.com/搜索?q=中文测试'
    : '输入要解码的 URL 编码文本，如 https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2',
)
const outputPlaceholder = computed(() =>
  mode.value === 'encode' ? '编码结果将显示在这里' : '解码结果将显示在这里',
)

const batchInputPlaceholder = computed(() =>
  batchMode.value === 'encode'
    ? 'https://example.com/搜索?q=1\nhttps://example.com/路径?name=张三\nhttps://example.com/测试'
    : 'https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2\nhttps%3A%2F%2Fexample.com%2F%E8%B7%AF%E5%BE%84',
)

/** 批量结果带行号格式化 */
const batchOutputText = computed(() => {
  if (!hasBatchResult.value) return '// 处理结果将显示在这里'
  return batchResults.value
    .map((result, i) => {
      const lineNum = String(i + 1).padStart(3, ' ')
      if (result === '') return `${lineNum} | (空行)`
      return `${lineNum} | ${result}`
    })
    .join('\n')
})

/** 批量结果是否包含错误行 */
const batchHasError = computed(() =>
  batchResults.value.some((r) => r.startsWith('[错误]')),
)

/** 批量复制文本（去除行号前缀，仅保留结果） */
const batchCopyText = computed(() => batchResults.value.join('\n'))

// === 静态数据：常见特殊字符编码对照表 ===
interface RefPair {
  charA: string
  encodedA: string
  charB: string
  encodedB: string
}
const referencePairs: RefPair[] = [
  { charA: '空格', encodedA: '%20 或 +', charB: '+', encodedB: '%2B' },
  { charA: '!', encodedA: '%21', charB: ',', encodedB: '%2C' },
  { charA: '#', encodedA: '%23', charB: '/', encodedB: '%2F' },
  { charA: '$', encodedA: '%24', charB: ':', encodedB: '%3A' },
  { charA: '&', encodedA: '%26', charB: ';', encodedB: '%3B' },
  { charA: "'", encodedA: '%27', charB: '=', encodedB: '%3D' },
  { charA: '(', encodedA: '%28', charB: '?', encodedB: '%3F' },
  { charA: ')', encodedA: '%29', charB: '@', encodedB: '%40' },
  { charA: '*', encodedA: '%2A', charB: '[', encodedB: '%5B' },
  { charA: ']', encodedA: '%5D', charB: '中文', encodedB: '%E4%B8%AD%E6%96%87（示例）' },
]

// === 方法 ===
function setMode(m: 'encode' | 'decode') {
  mode.value = m
  error.value = ''
}

function setBatchMode(m: 'encode' | 'decode') {
  batchMode.value = m
}

/** 单条转换 */
function doConvert() {
  if (input.value === '') {
    output.value = ''
    error.value = ''
    return
  }
  reportEvent('tool_use', props.slug)

  const result =
    mode.value === 'encode'
      ? encodeUrl(input.value, encodeFn.value, spaceMode.value)
      : decodeUrl(input.value, spaceMode.value)

  if (result.success) {
    output.value = result.output ?? ''
    error.value = ''
  } else {
    output.value = ''
    error.value = result.error ?? '转换失败'
  }
}

/** 清空单条输入输出 */
function doClear() {
  input.value = ''
  output.value = ''
  error.value = ''
}

/** 复制到剪贴板（含降级方案） */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 降级到 execCommand
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

/** 复制单条结果 */
async function doCopy() {
  if (output.value === '') return
  reportEvent('copy', props.slug)
  const ok = await copyToClipboard(output.value)
  if (ok) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
}

/** 交换输入与输出 */
function doSwap() {
  const tmp = input.value
  input.value = output.value
  output.value = tmp
  error.value = ''
}

/** 批量处理 */
function doBatch() {
  if (batchInput.value === '') {
    batchResults.value = []
    hasBatchResult.value = false
    return
  }
  reportEvent('tool_use', props.slug)

  batchResults.value =
    batchMode.value === 'encode'
      ? batchEncode(batchInput.value, encodeFn.value, spaceMode.value)
      : batchDecode(batchInput.value, spaceMode.value)
  hasBatchResult.value = true
}

/** 清空批量输入输出 */
function doBatchClear() {
  batchInput.value = ''
  batchResults.value = []
  hasBatchResult.value = false
}

/** 复制全部批量结果 */
async function doBatchCopy() {
  if (!hasBatchResult.value) return
  reportEvent('copy', props.slug)
  const ok = await copyToClipboard(batchCopyText.value)
  if (ok) {
    batchCopied.value = true
    setTimeout(() => {
      batchCopied.value = false
    }, 1500)
  }
}

/** 输入框 Ctrl/Cmd + Enter 快捷转换 */
function handleInputKeydown(e: KeyboardEvent) {
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
          role="tab"
          :data-active="mode === 'encode' ? 'true' : undefined"
          :aria-selected="mode === 'encode' ? 'true' : 'false'"
          @click="setMode('encode')"
        >
          URL 编码
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          role="tab"
          :data-active="mode === 'decode' ? 'true' : undefined"
          :aria-selected="mode === 'decode' ? 'true' : 'false'"
          @click="setMode('decode')"
        >
          URL 解码
        </button>
      </div>
      <span
        class="text-xs"
        style="color: var(--pz-color-text-tertiary)"
      >
        {{ modeHint }}
      </span>
    </div>

    <!-- 2. 输入输出双栏（同一卡片内上下排列） -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <!-- 输入 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-url-input"
          >
            {{ inputLabel }}
          </label>
          <span
            class="text-xs"
            style="color: var(--pz-color-text-tertiary)"
          >
            {{ inputCount }} 字符
          </span>
        </div>
        <textarea
          id="pz-url-input"
          v-model="input"
          class="pz-url-textarea"
          rows="5"
          :placeholder="inputPlaceholder"
          @keydown="handleInputKeydown"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="doConvert"
        >
          <RotateCcw class="w-4 h-4" aria-hidden="true" />
          转换
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doClear"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          清空
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doCopy"
        >
          <component
            :is="copied ? Check : Copy"
            class="w-4 h-4"
            aria-hidden="true"
          />
          {{ copied ? '已复制' : '复制结果' }}
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doSwap"
        >
          <ArrowDownUp class="w-4 h-4" aria-hidden="true" />
          交换
        </button>
      </div>

      <!-- 错误展示区 -->
      <div
        v-if="error"
        class="pz-error-text flex items-start gap-2"
        role="alert"
      >
        <AlertCircle
          class="w-4 h-4 shrink-0 mt-0.5"
          style="color: var(--pz-state-error)"
          aria-hidden="true"
        />
        <span>{{ error }}</span>
      </div>

      <!-- 输出 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-url-output"
          >
            {{ outputLabel }}
          </label>
          <span
            class="text-xs"
            style="color: var(--pz-color-text-tertiary)"
          >
            {{ outputCount }} 字符
          </span>
        </div>
        <textarea
          id="pz-url-output"
          v-model="output"
          class="pz-url-textarea"
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
        <!-- 编码函数 -->
        <div class="flex flex-col gap-1">
          <div
            class="text-xs font-semibold mb-1"
            style="color: var(--pz-color-text-secondary)"
          >
            编码函数
          </div>
          <label class="pz-option-row">
            <input
              v-model="encodeFn"
              type="radio"
              name="pz-encode-fn"
              value="encodeURIComponent"
              class="pz-option-radio"
            >
            <span class="pz-option-label">使用 encodeURIComponent（编码所有特殊字符）</span>
          </label>
          <label class="pz-option-row">
            <input
              v-model="encodeFn"
              type="radio"
              name="pz-encode-fn"
              value="encodeURI"
              class="pz-option-radio"
            >
            <span class="pz-option-label">使用 encodeURI（保留 / : ? = &amp; # 等特殊字符）</span>
          </label>
        </div>
        <!-- 空格编码方式 -->
        <div class="flex flex-col gap-1">
          <div
            class="text-xs font-semibold mb-1"
            style="color: var(--pz-color-text-secondary)"
          >
            空格编码方式
          </div>
          <label class="pz-option-row">
            <input
              v-model="spaceMode"
              type="radio"
              name="pz-space-mode"
              value="percent20"
              class="pz-option-radio"
            >
            <span class="pz-option-label">编码空格为 %20</span>
          </label>
          <label class="pz-option-row">
            <input
              v-model="spaceMode"
              type="radio"
              name="pz-space-mode"
              value="plus"
              class="pz-option-radio"
            >
            <span class="pz-option-label">编码空格为 +</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 4. 批量处理 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <BarChart3
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            批量处理
          </h2>
          <span
            class="text-sm"
            style="color: var(--pz-color-text-secondary)"
          >
            — 每行一个 URL，使用上方的编码选项
          </span>
        </div>
        <div class="pz-mode-toggle" role="tablist" aria-label="批量编码/解码模式">
          <button
            type="button"
            class="pz-mode-btn"
            role="tab"
            :data-active="batchMode === 'encode' ? 'true' : undefined"
            :aria-selected="batchMode === 'encode' ? 'true' : 'false'"
            @click="setBatchMode('encode')"
          >
            批量编码
          </button>
          <button
            type="button"
            class="pz-mode-btn"
            role="tab"
            :data-active="batchMode === 'decode' ? 'true' : undefined"
            :aria-selected="batchMode === 'decode' ? 'true' : 'false'"
            @click="setBatchMode('decode')"
          >
            批量解码
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- 批量输入 -->
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-batch-input"
          >
            批量输入（每行一个）
          </label>
          <textarea
            id="pz-batch-input"
            v-model="batchInput"
            class="pz-url-textarea"
            rows="8"
            :placeholder="batchInputPlaceholder"
          />
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="pz-btn-primary whitespace-nowrap"
              @click="doBatch"
            >
              <Zap class="w-4 h-4" aria-hidden="true" />
              处理
            </button>
            <button
              type="button"
              class="pz-btn-secondary whitespace-nowrap"
              @click="doBatchClear"
            >
              <Trash2 class="w-4 h-4" aria-hidden="true" />
              清空
            </button>
          </div>
        </div>
        <!-- 批量结果 -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label
              class="text-xs font-semibold"
              style="color: var(--pz-color-text-secondary)"
              for="pz-batch-output"
            >
              批量结果（带行号）
            </label>
            <button
              type="button"
              class="pz-btn-secondary whitespace-nowrap"
              style="padding: 0.25rem 0.75rem"
              @click="doBatchCopy"
            >
              <component
                :is="batchCopied ? Check : Copy"
                class="w-[14px] h-[14px]"
                aria-hidden="true"
              />
              {{ batchCopied ? '已复制' : '复制全部' }}
            </button>
          </div>
          <pre
            id="pz-batch-output"
            class="pz-batch-output"
            :style="batchHasError ? { borderColor: 'var(--pz-state-error-border)' } : {}"
          >{{ batchOutputText }}</pre>
        </div>
      </div>
    </div>

    <!-- 5. 常见特殊字符编码对照表 -->
    <div class="pz-card p-4">
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
          常见特殊字符编码对照表
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-encode-table">
          <thead>
            <tr>
              <th>原字符</th>
              <th>编码后</th>
              <th>原字符</th>
              <th>编码后</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pair, i) in referencePairs" :key="i">
              <td style="font-family: var(--pz-font-mono)">{{ pair.charA }}</td>
              <td class="pz-mono-cell">{{ pair.encodedA }}</td>
              <td style="font-family: var(--pz-font-mono)">{{ pair.charB }}</td>
              <td class="pz-mono-cell">{{ pair.encodedB }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
