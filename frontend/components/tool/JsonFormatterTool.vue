<script setup lang="ts">
/**
 * JsonFormatterTool.vue - JSON 格式化工具组件
 *
 * 严格参照 ui/pages/JSON格式化工具.html 的交互区结构：
 * - 双栏布局：左输入区 + 右输出区（lg:grid-cols-2，高度 500px）
 * - 操作工具栏：格式化 / 压缩 / 校验 / 清空 + 缩进选择
 * - 错误展示区（红色背景卡片，显示错误信息和行列号）
 * - 大输入防护：输入超过 1MB 时显示警告
 *
 * 交互：
 * - 格式化：调用 formatJson，输出到右侧，触发 tool_use 事件
 * - 压缩：调用 compressJson，输出到右侧，触发 tool_use 事件
 * - 校验：调用 validateJson，显示校验结果，触发 tool_use 事件
 * - 清空：清空输入和输出
 * - 复制：复制输出结果，触发 copy 事件
 */
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Minimize2,
  Wand2,
} from 'lucide-vue-next'
import { compressJson, formatJson, validateJson } from '~/utils/tools/json'
import ClearButton from '~/components/ui/ClearButton.vue'
import CopyButton from '~/components/ui/CopyButton.vue'

useHead({
  titleTemplate: null,
  title: 'JSON格式化 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线JSON格式化工具，支持美化、压缩、语法校验、错误定位，免登录打开即用，代码本地处理安全可靠。'
    },
    {
      name: 'keywords',
      content: 'JSON格式化,JSON美化,JSON压缩,JSON校验'
    },
    {
      property: 'og:title',
      content: 'JSON格式化 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线JSON格式化工具，支持美化、压缩、语法校验、错误定位，免登录打开即用，代码本地处理安全可靠。'
    }
  ]
})

const props = withDefaults(
  defineProps<{
    /** 工具 slug，用于事件上报；未传入时从路由参数获取 */
    slug?: string
  }>(),
  {
    slug: '',
  },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

/** 用于事件上报的 slug：优先使用 prop，其次路由参数 */
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'json-formatter',
)

// === 示例数据 ===
const SAMPLE_JSON = '{"name":"PanziPool","tools":["json","regex"],"count":7}'

// === 状态 ===
// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const input = ref(SAMPLE_JSON)
const output = ref(
  formatJson(SAMPLE_JSON, 2).output ?? '',
)
const errorMsg = ref('')
const errorLine = ref<number | undefined>(undefined)
const errorColumn = ref<number | undefined>(undefined)
/** null = 未校验；true = 校验通过；false = 校验失败 */
const validateStatus = ref<boolean | null>(null)
const indent = ref<number>(2)

// === 大输入防护：1MB ===
const LARGE_INPUT_THRESHOLD = 1024 * 1024
const isLargeInput = computed(() => input.value.length > LARGE_INPUT_THRESHOLD)

// === 清除错误 / 校验状态 ===
function resetFeedback() {
  errorMsg.value = ''
  errorLine.value = undefined
  errorColumn.value = undefined
  validateStatus.value = null
}

// === 操作处理 ===
function handleFormat() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result = formatJson(input.value, indent.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    errorMsg.value = result.error || '格式化失败'
    // 补充行列位置（formatJson 不返回位置，通过 validateJson 获取）
    const validation = validateJson(input.value)
    if (!validation.valid) {
      errorLine.value = validation.line
      errorColumn.value = validation.column
    }
  }
}

function handleCompress() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result = compressJson(input.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    errorMsg.value = result.error || '压缩失败'
    const validation = validateJson(input.value)
    if (!validation.valid) {
      errorLine.value = validation.line
      errorColumn.value = validation.column
    }
  }
}

function handleValidate() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result = validateJson(input.value)
  validateStatus.value = result.valid
  if (!result.valid) {
    errorMsg.value = result.error || 'JSON 格式错误'
    errorLine.value = result.line
    errorColumn.value = result.column
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  resetFeedback()
}

function handleLoadSample() {
  input.value = SAMPLE_JSON
  resetFeedback()
}

function handleCopy() {
  reportEvent('copy', effectiveSlug.value)
}

// === 错误位置文本 ===
const errorPositionText = computed(() => {
  if (errorLine.value !== undefined && errorColumn.value !== undefined) {
    return ` at line ${errorLine.value}, column ${errorColumn.value}`
  }
  return ''
})
</script>

<template>
  <!-- ===== 双栏布局：输入 + 输出 ===== -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- 输入区 -->
    <div
      class="pz-card p-4 flex flex-col gap-3 h-[360px] lg:h-[500px] min-w-0"
    >
      <div class="flex items-center justify-between">
        <span
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
        >
          输入
        </span>
        <button
          type="button"
          class="text-sm whitespace-nowrap hover:underline"
          style="
            color: var(--pz-color-primary);
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          "
          aria-label="加载示例 JSON"
          @click="handleLoadSample"
        >
          示例
        </button>
      </div>
      <textarea
        v-model="input"
        class="pz-textarea flex-1 w-full"
        placeholder="在此输入JSON..."
        aria-label="JSON 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 输出区 -->
    <div
      class="pz-card p-4 flex flex-col gap-3 h-[360px] lg:h-[500px] min-w-0"
    >
      <div class="flex items-center justify-between">
        <span
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
        >
          输出
        </span>
        <CopyButton :text="output" @copy="handleCopy" />
      </div>
      <pre class="pz-code flex-1"><code>{{ output }}</code></pre>
    </div>
  </div>

  <!-- ===== 操作工具栏 ===== -->
  <div class="flex flex-wrap items-center justify-center gap-3 py-4">
    <button
      type="button"
      class="pz-btn-primary whitespace-nowrap"
      aria-label="格式化 JSON"
      @click="handleFormat"
    >
      <Wand2 class="w-4 h-4" aria-hidden="true" />
      <span>格式化</span>
    </button>
    <button
      type="button"
      class="pz-btn-secondary whitespace-nowrap"
      aria-label="压缩 JSON"
      @click="handleCompress"
    >
      <Minimize2 class="w-4 h-4" aria-hidden="true" />
      <span>压缩</span>
    </button>
    <button
      type="button"
      class="pz-btn-secondary whitespace-nowrap"
      aria-label="校验 JSON"
      @click="handleValidate"
    >
      <Check class="w-4 h-4" aria-hidden="true" />
      <span>校验</span>
    </button>
    <ClearButton @clear="handleClear" />
    <div class="flex items-center gap-2 whitespace-nowrap">
      <span class="text-sm" style="color: var(--pz-color-text-secondary)">
        缩进
      </span>
      <select
        v-model="indent"
        class="pz-input"
        aria-label="缩进空格数"
      >
        <option :value="2">2 空格</option>
        <option :value="4">4 空格</option>
      </select>
    </div>
  </div>

  <!-- ===== 大输入警告 ===== -->
  <div
    v-if="isLargeInput"
    class="pz-card p-4 flex items-start gap-3 mb-4"
    style="
      background-color: var(--pz-state-warning-bg);
      border-color: var(--pz-state-warning-border);
    "
    role="alert"
  >
    <AlertTriangle
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-warning)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p
        class="text-sm font-semibold"
        style="color: var(--pz-state-warning)"
      >
        输入过大
      </p>
      <p
        class="text-sm mt-1"
        style="color: var(--pz-color-text-secondary)"
      >
        当前输入超过 1MB，处理可能较慢，建议缩减输入。
      </p>
    </div>
  </div>

  <!-- ===== 错误展示区 ===== -->
  <div
    v-if="errorMsg"
    class="pz-card p-4 flex items-start gap-3"
    style="
      background-color: var(--pz-state-error-bg);
      border-color: var(--pz-state-error-border);
    "
    role="alert"
  >
    <AlertCircle
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-error)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p
        class="text-sm font-semibold"
        style="color: var(--pz-state-error)"
      >
        JSON 解析错误
      </p>
      <p
        class="text-sm mt-1"
        style="
          font-family: var(--pz-font-mono);
          color: var(--pz-color-text-secondary);
        "
      >
        {{ errorMsg }}{{ errorPositionText }}
      </p>
    </div>
  </div>

  <!-- ===== 校验成功提示 ===== -->
  <div
    v-if="validateStatus === true"
    class="pz-card p-4 flex items-start gap-3"
    style="
      background-color: var(--pz-state-success-bg);
      border-color: var(--pz-state-success-border);
    "
    role="status"
  >
    <CheckCircle2
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-success)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p
        class="text-sm font-semibold"
        style="color: var(--pz-state-success)"
      >
        JSON 校验通过
      </p>
      <p
        class="text-sm mt-1"
        style="color: var(--pz-color-text-secondary)"
      >
        输入是合法的 JSON 格式。
      </p>
    </div>

    <!-- ============ 页面底部广告位 ============ -->
    <AdSlot slot-key="jsonBottom" />
  </div>
</template>
