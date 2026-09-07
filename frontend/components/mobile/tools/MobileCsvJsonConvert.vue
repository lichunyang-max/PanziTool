<script setup lang="ts">
/**
 * MobileCsvJsonConvert.vue - 移动端 CSV ↔ JSON 互转工具
 *
 * 逻辑忠实移植自 panziui/tools/csv-json-convert.html 的内联脚本。
 * 单列布局：输入框在上，输出框在下。
 * 方向切换：CSV → JSON / JSON → CSV（select）。
 * 操作按钮：转换/清空 + 复制 + 分隔符选择（仅 CSV → JSON）。
 */
import {
  csvToJson,
  jsonToCsv,
  type Delimiter,
} from '~/utils/tools/csvJson'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'csv-json-convert',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

type Mode = 'csv2json' | 'json2csv'

const SAMPLE_CSV =
  'name,age,city\n张三,25,北京\n李四,30,"上海, 浦东"\n王五,28,"他说""今天天气不错"""\n赵六,,"杭州"'
const SAMPLE_JSON =
  '[\n  { "name": "张三", "age": 25, "city": "北京" },\n  { "name": "李四", "age": 30, "city": "上海" },\n  { "name": "王五", "age": 28, "city": "杭州" }\n]'

const mode = ref<Mode>('csv2json')
const delimiter = ref<Delimiter>(',')
const input = ref(SAMPLE_CSV)
const output = ref(csvToJson(SAMPLE_CSV, ',').output ?? '')
const errorMsg = ref('')
const copied = ref(false)

const inputLabel = computed(() =>
  mode.value === 'csv2json' ? '输入 CSV' : '输入 JSON',
)
const inputPlaceholder = computed(() =>
  mode.value === 'csv2json'
    ? '粘贴 CSV 内容，第一行为表头...'
    : '粘贴 JSON 数组，如 [{"name":"张三","age":25}]',
)

function resetFeedback() {
  errorMsg.value = ''
}

function onModeChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const next = target.value as Mode
  if (mode.value === next) return
  mode.value = next
  output.value = ''
  resetFeedback()
}

function handleConvert() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  const result =
    mode.value === 'csv2json'
      ? csvToJson(input.value, delimiter.value)
      : jsonToCsv(input.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    output.value = ''
    errorMsg.value = result.error || '转换失败'
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  resetFeedback()
}

function handleLoadSample() {
  input.value = mode.value === 'csv2json' ? SAMPLE_CSV : SAMPLE_JSON
  output.value = ''
  resetFeedback()
}

async function handleCopy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">{{ inputLabel }}</span>
        <button type="button" class="m-tool__link" @click="handleLoadSample">示例</button>
      </div>
      <textarea
        v-model="input"
        class="m-tool__textarea"
        :placeholder="inputPlaceholder"
        aria-label="转换输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 方向切换 -->
    <div class="m-tool__row">
      <span class="m-tool__label">方向</span>
      <select :value="mode" class="m-tool__select" @change="onModeChange">
        <option value="csv2json">CSV → JSON</option>
        <option value="json2csv">JSON → CSV</option>
      </select>
    </div>

    <!-- 分隔符选择（仅 CSV → JSON） -->
    <div v-if="mode === 'csv2json'" class="m-tool__row">
      <span class="m-tool__label">分隔符</span>
      <select v-model="delimiter" class="m-tool__select">
        <option value=",">逗号 ,</option>
        <option value=";">分号 ;</option>
        <option value="	">Tab</option>
      </select>
    </div>

    <!-- 操作按钮区 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleConvert">转换</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 输出区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输出</span>
        <button
          type="button"
          class="m-tool__link"
          :disabled="!output"
          @click="handleCopy"
        >{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <pre class="m-tool__code"><code>{{ output }}</code></pre>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">转换失败</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.m-tool {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #ede9fe;
  --m-color-primary-lighter: #ddd6fe;
  --m-color-surface: #ffffff;
  --m-color-bg: #f9fafb;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-error: #ef4444;
  --m-color-error-bg: #fef2f2;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-tool__card {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-tool__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.m-tool__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
}

.m-tool__link {
  background: none;
  border: none;
  color: var(--m-color-primary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__link:active {
  opacity: 0.7;
}

.m-tool__link:disabled {
  color: var(--m-color-text-tertiary);
  cursor: not-allowed;
}

.m-tool__textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
}

.m-tool__textarea:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-tool__file-input {
  display: none;
}

.m-tool__file-btn {
  min-height: 44px;
  border: 1px dashed var(--m-color-border);
  border-radius: 10px;
  background: var(--m-color-bg);
  color: var(--m-color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__file-btn:active {
  border-color: var(--m-color-primary);
  color: var(--m-color-primary);
}

.m-tool__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.m-tool__select {
  flex: 1;
  max-width: 200px;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
}

.m-tool__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-btn {
  flex: 1;
  min-width: 72px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-btn:active {
  transform: scale(0.97);
}

.m-btn--primary {
  background: var(--m-color-primary);
  color: #ffffff;
}

.m-btn--primary:active {
  background: #6d28d9;
}

.m-btn--secondary {
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
}

.m-btn--secondary:active {
  background: var(--m-color-primary-lighter);
}

.m-btn--ghost {
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  border: 1px solid var(--m-color-border);
}

.m-btn--ghost:active {
  background: var(--m-color-bg);
}

.m-tool__code {
  margin: 0;
  min-height: 80px;
  max-height: 240px;
  overflow: auto;
  padding: 10px 12px;
  background: var(--m-color-bg);
  border-radius: 10px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.m-tool__code code {
  font-family: inherit;
}

.m-tool__alert {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.m-tool__alert--error {
  background: var(--m-color-error-bg);
  border-color: #fecaca;
}

.m-tool__alert--error .m-tool__alert-title {
  color: var(--m-color-error);
}

.m-tool__alert-title {
  font-size: 14px;
  font-weight: 600;
}

.m-tool__alert-desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
