<script setup lang="ts">
/**
 * MobileMockData.vue - 移动端 Mock 随机数据生成工具
 *
 * 字段勾选 + 生成数量 + 输出格式切换
 * 生成结果展示
 */
import {
  MOCK_FIELD_OPTIONS,
  MOCK_FORMAT_OPTIONS,
  type MockField,
  type MockFormat,
  generateMockRows,
  renderMock,
} from '~/utils/tools/mockData'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'mock-data',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const checked = ref<Record<MockField, boolean>>(
  MOCK_FIELD_OPTIONS.reduce(
    (acc, o) => {
      acc[o.value] = o.checked
      return acc
    },
    {} as Record<MockField, boolean>,
  ),
)
const count = ref(10)
const format = ref<MockFormat>('json')
const output = ref('')
const errorMsg = ref('')
const copied = ref(false)

const lastRows = ref<Record<string, string>[]>([])
const lastFields = ref<MockField[]>([])

const selectedFields = computed(() =>
  MOCK_FIELD_OPTIONS.filter((o) => checked.value[o.value]).map((o) => o.value),
)

function toggleFormat(fmt: MockFormat) {
  format.value = fmt
  if (lastRows.value.length > 0) {
    output.value = renderMock(lastRows.value, lastFields.value, fmt)
  }
}

function handleGenerate() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  const fields = selectedFields.value
  if (fields.length === 0) {
    errorMsg.value = '请至少勾选一个字段'
    output.value = ''
    return
  }
  let c = count.value
  if (!Number.isFinite(c) || c < 1 || c > 500) {
    errorMsg.value = '生成数量必须在 1-500 之间'
    output.value = ''
    return
  }
  c = Math.floor(c)
  count.value = c

  const rows = generateMockRows(fields, c)
  lastRows.value = rows
  lastFields.value = fields
  output.value = renderMock(rows, fields, format.value)
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

onMounted(() => {
  handleGenerate()
})
</script>

<template>
  <div class="m-tool">
    <!-- 字段配置 -->
    <div class="m-tool__card">
      <span class="m-tool__label">字段类型</span>
      <div style="display: flex; flex-wrap: wrap; gap: 10px">
        <label
          v-for="opt in MOCK_FIELD_OPTIONS"
          :key="opt.value"
          style="display: flex; align-items: center; gap: 6px"
        >
          <input
            v-model="checked[opt.value]"
            type="checkbox"
            style="accent-color: var(--m-color-primary); width: 18px; height: 18px"
          />
          <span class="m-tool__label" style="font-weight: 400">{{ opt.label }}</span>
        </label>
      </div>
    </div>

    <!-- 生成数量 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">生成数量</span>
        <span style="font-size: 12px; color: var(--m-color-text-tertiary)">1-500</span>
      </div>
      <div class="m-tool__row">
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="500"
          class="m-tool__select"
          style="max-width: none"
          placeholder="如 10"
        />
      </div>
    </div>

    <!-- 输出格式 -->
    <div class="m-tool__card">
      <span class="m-tool__label">输出格式</span>
      <div class="m-tool__actions">
        <button
          v-for="opt in MOCK_FORMAT_OPTIONS"
          :key="opt.value"
          type="button"
          class="m-btn"
          :class="format === opt.value ? 'm-btn--primary' : 'm-btn--ghost'"
          @click="toggleFormat(opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleGenerate">生成</button>
      <button
        type="button"
        class="m-btn m-btn--secondary"
        :disabled="!output"
        @click="handleCopy"
      >{{ copied ? '已复制' : '复制' }}</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">生成失败</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}</span>
    </div>

    <!-- 结果区 -->
    <div v-if="output" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">生成结果</span>
        <span style="font-size: 12px; color: var(--m-color-text-tertiary)">{{ output.length }} 字符</span>
      </div>
      <pre class="m-tool__code"><code>{{ output }}</code></pre>
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
