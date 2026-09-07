<script setup lang="ts">
/**
 * MobileStringToolkit.vue - 移动端字符串工具箱
 *
 * 单列布局：
 * 1. 输入框 + 实时统计栏（字符/字数/行数/字节）
 * 2. 按分组的操作按钮（case/naming/lines/other），select 下拉选择
 * 3. 输出框 + 复制 + 应用到输入
 */
import {
  analyzeString,
  applyStringOperation,
  STRING_OPERATIONS,
  type StringOperation,
} from '~/utils/tools/stringToolkit'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'string-toolkit',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const SAMPLE_INPUT = 'hello world\nfoo bar baz\nhello world\n  trim me  '
const input = ref(SAMPLE_INPUT)
const output = ref('')
const errorMsg = ref('')
const copied = ref(false)
const selectedOp = ref<StringOperation>('upper')

const analysis = computed(() => analyzeString(input.value))

// 分组操作列表
const groupOptions = computed(() => {
  const groups: Record<string, { value: StringOperation; label: string }[]> = {
    case: [],
    naming: [],
    lines: [],
    other: [],
  }
  for (const op of STRING_OPERATIONS) {
    groups[op.group]!.push({ value: op.value, label: op.label })
  }
  return groups
})

const groupLabels: Record<string, string> = {
  case: '大小写转换',
  naming: '命名风格',
  lines: '行级处理',
  other: '其他',
}

function handleApply() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  const result = applyStringOperation(input.value, selectedOp.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    output.value = ''
    errorMsg.value = result.error || '操作失败'
  }
}

function handleApplyToInput() {
  if (!output.value) return
  input.value = output.value
  output.value = ''
}

function handleClearInput() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}

function handleClearOutput() {
  output.value = ''
  errorMsg.value = ''
}

async function handleCopy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 输入区 + 统计 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输入</span>
        <button type="button" class="m-tool__link" @click="handleClearInput">清空</button>
      </div>
      <textarea
        v-model="input"
        class="m-tool__textarea"
        placeholder="输入要处理的文本，支持多行..."
        aria-label="文本输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
      <div class="m-tool__stats">
        <div class="m-tool__stat">
          <span class="m-tool__stat-label">字符</span>
          <span class="m-tool__stat-val">{{ analysis.chars }}</span>
        </div>
        <div class="m-tool__stat">
          <span class="m-tool__stat-label">字数</span>
          <span class="m-tool__stat-val">{{ analysis.words }}</span>
        </div>
        <div class="m-tool__stat">
          <span class="m-tool__stat-label">行数</span>
          <span class="m-tool__stat-val">{{ analysis.lines }}</span>
        </div>
        <div class="m-tool__stat">
          <span class="m-tool__stat-label">字节</span>
          <span class="m-tool__stat-val">{{ analysis.bytes }}</span>
        </div>
      </div>
    </div>

    <!-- 操作选择 + 应用 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">选择操作</span>
      </div>
      <select v-model="selectedOp" class="m-tool__select">
        <optgroup
          v-for="(opts, group) in groupOptions"
          :key="group"
          :label="groupLabels[group]"
        >
          <option v-for="op in opts" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </optgroup>
      </select>
    </div>

    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleApply">执行</button>
    </div>

    <!-- 输出区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">结果</span>
        <div class="m-tool__header-actions">
          <button
            type="button"
            class="m-tool__link"
            :disabled="!output"
            @click="handleApplyToInput"
          >应用到输入</button>
          <button
            type="button"
            class="m-tool__link"
            :disabled="!output"
            @click="handleCopy"
          >{{ copied ? '已复制' : '复制' }}</button>
          <button type="button" class="m-tool__link" @click="handleClearOutput">清空</button>
        </div>
      </div>
      <pre class="m-tool__code"><code>{{ output || '// 点击执行按钮查看结果' }}</code></pre>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">操作失败</span>
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

.m-tool__header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
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

.m-tool__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px;
  background: var(--m-color-bg);
  border-radius: 8px;
  border: 1px solid var(--m-color-border-light);
}

.m-tool__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.m-tool__stat-label {
  font-size: 11px;
  color: var(--m-color-text-tertiary);
}

.m-tool__stat-val {
  font-size: 14px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
}

.m-tool__select {
  width: 100%;
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

.m-tool__code {
  margin: 0;
  min-height: 100px;
  max-height: 320px;
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
