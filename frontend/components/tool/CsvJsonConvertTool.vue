<script setup lang="ts">
/**
 * CsvJsonConvertTool.vue - CSV ↔ JSON 互转工具组件
 *
 * 逻辑忠实移植自 panziui/tools/csv-json-convert.html 的内联脚本。
 * 桌面端结构参照 JsonFormatterTool.vue：方向切换 + 双栏输入/输出 + 操作工具栏。
 *
 * 交互（通过 useAnalytics 上报）：
 * - 转换 → tool_use 事件
 * - 复制结果 → copy 事件
 * - Ctrl/Cmd + Enter 触发转换
 */
import { AlertCircle, ArrowLeftRight } from 'lucide-vue-next'
import {
  csvToJson,
  jsonToCsv,
  type Delimiter,
} from '~/utils/tools/csvJson'
import ClearButton from '~/components/ui/ClearButton.vue'
import CopyButton from '~/components/ui/CopyButton.vue'

useHead({
  titleTemplate: null,
  title: 'CSV ↔ JSON转换 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content:
        '免费在线CSV与JSON互转工具，表格数据与JSON数组互转，支持逗号/分号/Tab分隔符，正确处理引号内转义，测试数据导入导出利器，本地浏览器处理免登录即用。',
    },
    {
      name: 'keywords',
      content: 'CSV转JSON,JSON转CSV,CSV转换,表格数据转换,Excel导入导出',
    },
    {
      property: 'og:title',
      content: 'CSV ↔ JSON转换 | 盘子工具站',
    },
    {
      property: 'og:description',
      content:
        '免费在线CSV与JSON互转工具，表格数据与JSON数组互转，支持逗号/分号/Tab分隔符，正确处理引号内转义，测试数据导入导出利器，本地浏览器处理免登录即用。',
    },
  ],
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
  () => props.slug || (route.params.slug as string) || 'csv-json-convert',
)

type Mode = 'csv2json' | 'json2csv'

// === 示例数据 ===
const SAMPLE_CSV =
  'name,age,city\n张三,25,北京\n李四,30,"上海, 浦东"\n王五,28,"他说""今天天气不错"""\n赵六,,"杭州"'
const SAMPLE_JSON =
  '[\n  { "name": "张三", "age": 25, "city": "北京" },\n  { "name": "李四", "age": 30, "city": "上海" },\n  { "name": "王五", "age": 28, "city": "杭州" }\n]'

// === 状态 ===
const mode = ref<Mode>('csv2json')
const delimiter = ref<Delimiter>(',')
// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const input = ref(SAMPLE_CSV)
const output = ref(csvToJson(SAMPLE_CSV, ',').output ?? '')
const recordCount = ref<number | undefined>(undefined)
const errorMsg = ref('')

// 初始化示例记录数（与预填输出保持一致）
try {
  const arr = JSON.parse(output.value)
  if (Array.isArray(arr)) recordCount.value = arr.length
} catch {
  recordCount.value = undefined
}

// === 大输入防护：1MB ===
const LARGE_INPUT_THRESHOLD = 1024 * 1024
const isLargeInput = computed(() => input.value.length > LARGE_INPUT_THRESHOLD)

const inputLabel = computed(() =>
  mode.value === 'csv2json' ? '输入 CSV' : '输入 JSON',
)
const outputLabel = computed(() => {
  const base = mode.value === 'csv2json' ? '输出 JSON' : '输出 CSV'
  return recordCount.value !== undefined
    ? `${base}（${recordCount.value} 条记录）`
    : base
})
const inputPlaceholder = computed(() =>
  mode.value === 'csv2json'
    ? '粘贴 CSV 内容，第一行为表头...'
    : '粘贴 JSON 数组，如 [{"name":"张三","age":25}]',
)

function resetFeedback() {
  errorMsg.value = ''
}

function setMode(next: Mode) {
  if (mode.value === next) return
  mode.value = next
  output.value = ''
  recordCount.value = undefined
  resetFeedback()
}

function handleConvert() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result =
    mode.value === 'csv2json'
      ? csvToJson(input.value, delimiter.value)
      : jsonToCsv(input.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
    // 统计记录数
    if (mode.value === 'csv2json') {
      try {
        const arr = JSON.parse(result.output)
        recordCount.value = Array.isArray(arr) ? arr.length : undefined
      } catch {
        recordCount.value = undefined
      }
    } else {
      const lineCount = result.output.split(/\r?\n/).length
      recordCount.value = lineCount > 0 ? lineCount - 1 : 0
    }
  } else {
    output.value = ''
    recordCount.value = undefined
    errorMsg.value = result.error || '转换失败'
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  recordCount.value = undefined
  resetFeedback()
}

function handleLoadSample() {
  input.value = mode.value === 'csv2json' ? SAMPLE_CSV : SAMPLE_JSON
  output.value = ''
  recordCount.value = undefined
  resetFeedback()
}

function handleCopy() {
  reportEvent('copy', effectiveSlug.value)
}

/** Ctrl/Cmd + Enter 触发转换 */
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleConvert()
  }
}
</script>

<template>
  <!-- ===== 方向切换 ===== -->
  <div class="flex items-center gap-2 mb-4 flex-wrap">
    <div class="pz-mode-toggle" role="tablist" aria-label="转换方向">
      <button
        type="button"
        class="pz-mode-btn"
        :data-active="mode === 'csv2json'"
        role="tab"
        :aria-selected="mode === 'csv2json'"
        @click="setMode('csv2json')"
      >
        CSV → JSON
      </button>
      <button
        type="button"
        class="pz-mode-btn"
        :data-active="mode === 'json2csv'"
        role="tab"
        :aria-selected="mode === 'json2csv'"
        @click="setMode('json2csv')"
      >
        JSON → CSV
      </button>
    </div>
  </div>

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
          {{ inputLabel }}
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
          aria-label="加载示例数据"
          @click="handleLoadSample"
        >
          示例
        </button>
      </div>
      <textarea
        v-model="input"
        class="pz-textarea flex-1 w-full"
        :placeholder="inputPlaceholder"
        aria-label="转换输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        @keydown="onInputKeydown"
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
          {{ outputLabel }}
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
      aria-label="转换"
      @click="handleConvert"
    >
      <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
      <span>转换</span>
    </button>
    <ClearButton @clear="handleClear" />
    <div
      v-if="mode === 'csv2json'"
      class="flex items-center gap-2 whitespace-nowrap"
    >
      <span class="text-sm" style="color: var(--pz-color-text-secondary)">
        分隔符
      </span>
      <select
        v-model="delimiter"
        class="pz-input"
        aria-label="CSV 分隔符"
      >
        <option value=",">逗号 ,</option>
        <option value=";">分号 ;</option>
        <option value="	">Tab</option>
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
    <AlertCircle
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-warning)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p class="text-sm font-semibold" style="color: var(--pz-state-warning)">
        输入过大
      </p>
      <p class="text-sm mt-1" style="color: var(--pz-color-text-secondary)">
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
      <p class="text-sm font-semibold" style="color: var(--pz-state-error)">
        转换失败
      </p>
      <p
        class="text-sm mt-1"
        style="
          font-family: var(--pz-font-mono);
          color: var(--pz-color-text-secondary);
        "
      >
        {{ errorMsg }}
      </p>
    </div>
  </div>
</template>
