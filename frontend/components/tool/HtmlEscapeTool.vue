<script setup lang="ts">
/**
 * HtmlEscapeTool.vue - HTML 转义/反转义工具组件
 *
 * 严格参照 ui/pages/html-escape.html 的交互区结构：
 * 1. 模式切换（HTML 转义 / HTML 反转义）— pz-mode-toggle
 * 2. 输入输出双栏（同卡片上下排列）+ 操作按钮（转换/清空/复制结果/交换）+ 错误展示区
 * 3. 转义模式选择卡片：basic / attributes / entities radio（仅在转义模式下显示）
 * 4. 常见字符转义对照表
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
} from 'lucide-vue-next'
import {
  escapeHtmlSafe,
  unescapeHtmlSafe,
  type EscapeMode,
} from '~/utils/tools/htmlEscape'

useHead({
  titleTemplate: null,
  title: 'HTML转义反转义 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线HTML实体转义反转义工具，支持 basic/attributes/entities 三档模式，识别命名与数字实体，兼容 HTML 属性上下文，免登录打开即用，本地处理保障数据安全。',
    },
    {
      name: 'keywords',
      content: 'HTML转义,HTML反转义,HTML实体,escapeHtml,unescapeHtml,XSS防护',
    },
    {
      property: 'og:title',
      content: 'HTML转义反转义 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线HTML实体转义反转义工具，支持 basic/attributes/entities 三档模式，识别命名与数字实体，兼容 HTML 属性上下文，免登录打开即用，本地处理保障数据安全。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'html-escape',
)

type Mode = 'escape' | 'unescape'

const mode = ref<Mode>('escape')
const escapeMode = ref<EscapeMode>('basic')

// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const SAMPLE_INPUT = '<a href="/path?q=1&n=2">点击"这里"</a>'
const SAMPLE_OUTPUT = escapeHtmlSafe(SAMPLE_INPUT, 'basic').output ?? ''

const input = ref(SAMPLE_INPUT)
const output = ref(SAMPLE_OUTPUT)
const errorMsg = ref('')
const copied = ref(false)

const modeHint = computed(() =>
  mode.value === 'escape'
    ? '将 HTML 文本中的特殊字符转换为实体'
    : '将 HTML 实体还原为原始字符',
)
const inputLabel = computed(() =>
  mode.value === 'escape' ? '输入 HTML 文本' : '输入 HTML 实体文本',
)
const outputLabel = computed(() =>
  mode.value === 'escape' ? '转义结果' : '反转义结果',
)
const inputPlaceholder = computed(() =>
  mode.value === 'escape'
    ? '输入要转义的 HTML，如 <a href="/x?q=1">链接</a>'
    : '输入要反转义的 HTML 实体，如 &lt;a href=&quot;/x?q=1&quot;&gt;链接&lt;/a&gt;',
)
const outputPlaceholder = computed(() =>
  mode.value === 'escape' ? '转义结果将显示在这里' : '反转义结果将显示在这里',
)
const inputCount = computed(() => `${input.value.length} 字符`)
const outputCount = computed(() => `${output.value.length} 字符`)

const modeOptions: ReadonlyArray<{ value: EscapeMode; label: string; hint: string }> = [
  { value: 'basic', label: 'basic', hint: '仅 < > &（HTML 文本节点）' },
  { value: 'attributes', label: 'attributes', hint: 'basic + " ` \'（HTML 属性上下文）' },
  { value: 'entities', label: 'entities', hint: 'attributes + /（最严格，JS 模板字符串）' },
]

// 对照表数据
interface RefRow {
  char: string
  desc: string
  entity: string
  numEntity: string
}
const referenceRows: RefRow[] = [
  { char: '<', desc: '小于号', entity: '&lt;', numEntity: '&#60;' },
  { char: '>', desc: '大于号', entity: '&gt;', numEntity: '&#62;' },
  { char: '&', desc: '与号', entity: '&amp;', numEntity: '&#38;' },
  { char: '"', desc: '双引号', entity: '&quot;', numEntity: '&#34;' },
  { char: "'", desc: '单引号', entity: '&apos; / &#39;', numEntity: '&#39;' },
  { char: '`', desc: '反引号', entity: '&#96;', numEntity: '&#96;' },
  { char: '/', desc: '斜杠', entity: '&#47;', numEntity: '&#47;' },
  { char: '空格', desc: '不间断空格', entity: '&nbsp;', numEntity: '&#160;' },
]

function setMode(m: Mode) {
  if (mode.value === m) return
  mode.value = m
  errorMsg.value = ''
}

function doConvert() {
  errorMsg.value = ''
  if (input.value === '') {
    output.value = ''
    return
  }
  reportEvent('tool_use', effectiveSlug.value)

  const result =
    mode.value === 'escape'
      ? escapeHtmlSafe(input.value, escapeMode.value)
      : unescapeHtmlSafe(input.value)

  if (result.success) {
    output.value = result.output ?? ''
  } else {
    output.value = ''
    errorMsg.value = result.error ?? '转换失败'
  }
}

function doClear() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (import.meta.server) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 降级
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

async function doCopy() {
  if (!output.value) return
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(output.value)
  if (ok) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
}

function doSwap() {
  const tmp = input.value
  input.value = output.value
  output.value = tmp
  errorMsg.value = ''
}

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
      <div class="pz-mode-toggle" role="tablist" aria-label="转义/反转义模式">
        <button
          type="button"
          class="pz-mode-btn"
          role="tab"
          :data-active="mode === 'escape' ? 'true' : undefined"
          :aria-selected="mode === 'escape'"
          @click="setMode('escape')"
        >
          HTML 转义
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          role="tab"
          :data-active="mode === 'unescape' ? 'true' : undefined"
          :aria-selected="mode === 'unescape'"
          @click="setMode('unescape')"
        >
          HTML 反转义
        </button>
      </div>
      <span
        class="text-xs whitespace-nowrap"
        style="color: var(--pz-color-text-tertiary)"
      >
        {{ modeHint }}
      </span>
    </div>

    <!-- 2. 输入输出双栏 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <!-- 输入 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-html-input"
          >
            {{ inputLabel }}
          </label>
          <span
            class="text-xs"
            style="color: var(--pz-color-text-tertiary)"
          >
            {{ inputCount }}
          </span>
        </div>
        <textarea
          id="pz-html-input"
          v-model="input"
          class="pz-url-textarea"
          rows="5"
          :placeholder="inputPlaceholder"
          @keydown="onInputKeydown"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="doConvert"
        >
          <RefreshCw class="w-4 h-4" aria-hidden="true" />
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
          <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
          交换
        </button>
      </div>

      <!-- 错误展示区 -->
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
            for="pz-html-output"
          >
            {{ outputLabel }}
          </label>
          <span
            class="text-xs"
            style="color: var(--pz-color-text-tertiary)"
          >
            {{ outputCount }}
          </span>
        </div>
        <textarea
          id="pz-html-output"
          v-model="output"
          class="pz-url-textarea"
          rows="5"
          readonly
          :placeholder="outputPlaceholder"
        />
      </div>
    </div>

    <!-- 3. 转义模式选择（仅转义模式显示） -->
    <div v-if="mode === 'escape'" class="pz-card p-4 mb-6">
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
          转义模式
        </h2>
      </div>
      <div class="flex flex-col gap-1">
        <label
          v-for="opt in modeOptions"
          :key="opt.value"
          class="pz-option-row"
        >
          <input
            v-model="escapeMode"
            type="radio"
            name="pz-escape-mode"
            :value="opt.value"
            class="pz-option-radio"
          />
          <span class="pz-option-label">
            <strong style="font-family: var(--pz-font-mono)">{{ opt.label }}</strong>
            <span style="color: var(--pz-color-text-tertiary)"> — {{ opt.hint }}</span>
          </span>
        </label>
      </div>
    </div>

    <!-- 4. 转义对照表 -->
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
          常见字符转义对照表
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-encode-table">
          <thead>
            <tr>
              <th>原字符</th>
              <th>说明</th>
              <th>命名实体</th>
              <th>数字实体</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in referenceRows" :key="i">
              <td style="font-family: var(--pz-font-mono)">{{ row.char }}</td>
              <td style="color: var(--pz-color-text-secondary)">{{ row.desc }}</td>
              <td class="pz-mono-cell">{{ row.entity }}</td>
              <td class="pz-mono-cell">{{ row.numEntity }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
