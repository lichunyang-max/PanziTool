<script setup lang="ts">
/**
 * MobileJsonFormatter.vue - 移动端 JSON 格式化工具
 *
 * 单列布局：输入框在上，输出框在下
 * 操作按钮：格式化/压缩/校验/清空 + 复制
 * 缩进选择：2/4 空格
 * 错误展示：红色卡片显示错误信息
 */
import { compressJson, formatJson, validateJson } from '~/utils/tools/json'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'json-formatter',
)

const SAMPLE_JSON = '{"name":"PanziPool","tools":["json","regex"],"count":7}'

const input = ref(SAMPLE_JSON)
const output = ref(formatJson(SAMPLE_JSON, 2).output ?? '')
const errorMsg = ref('')
const errorLine = ref<number | undefined>(undefined)
const errorColumn = ref<number | undefined>(undefined)
const validateStatus = ref<boolean | null>(null)
const indent = ref<number>(2)

const LARGE_INPUT_THRESHOLD = 1024 * 1024
const isLargeInput = computed(() => input.value.length > LARGE_INPUT_THRESHOLD)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

function resetFeedback() {
  errorMsg.value = ''
  errorLine.value = undefined
  errorColumn.value = undefined
  validateStatus.value = null
}

function handleFormat() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  const result = formatJson(input.value, indent.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    errorMsg.value = result.error || '格式化失败'
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
  emit('tool_use', effectiveSlug.value)
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
  emit('tool_use', effectiveSlug.value)
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

const copied = ref(false)

const errorPositionText = computed(() => {
  if (errorLine.value !== undefined && errorColumn.value !== undefined) {
    return ` 第 ${errorLine.value} 行，第 ${errorColumn.value} 列`
  }
  return ''
})
</script>

<template>
  <div class="m-tool">
    <!-- 输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输入</span>
        <button
          type="button"
          class="m-tool__link"
          @click="handleLoadSample"
        >示例</button>
      </div>
      <textarea
        v-model="input"
        class="m-tool__textarea"
        placeholder="在此输入 JSON..."
        aria-label="JSON 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 操作按钮区 -->
    <div class="m-tool__actions">
      <button
        type="button"
        class="m-btn m-btn--primary"
        @click="handleFormat"
      >格式化</button>
      <button
        type="button"
        class="m-btn m-btn--secondary"
        @click="handleCompress"
      >压缩</button>
      <button
        type="button"
        class="m-btn m-btn--secondary"
        @click="handleValidate"
      >校验</button>
      <button
        type="button"
        class="m-btn m-btn--ghost"
        @click="handleClear"
      >清空</button>
    </div>

    <!-- 缩进选择 -->
    <div class="m-tool__row">
      <span class="m-tool__label">缩进</span>
      <select v-model="indent" class="m-tool__select">
        <option :value="2">2 空格</option>
        <option :value="4">4 空格</option>
      </select>
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

    <!-- 大输入警告 -->
    <div v-if="isLargeInput" class="m-tool__alert m-tool__alert--warning" role="alert">
      <span class="m-tool__alert-title">输入过大</span>
      <span class="m-tool__alert-desc">当前输入超过 1MB，处理可能较慢。</span>
    </div>

    <!-- 错误展示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">JSON 解析错误</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}{{ errorPositionText }}</span>
    </div>

    <!-- 校验成功 -->
    <div v-if="validateStatus === true" class="m-tool__alert m-tool__alert--success" role="status">
      <span class="m-tool__alert-title">JSON 校验通过</span>
      <span class="m-tool__alert-desc">输入是合法的 JSON 格式。</span>
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
  --m-color-success: #10b981;
  --m-color-success-bg: #ecfdf5;
  --m-color-warning: #f59e0b;
  --m-color-warning-bg: #fffbeb;

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

.m-tool__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.m-tool__select {
  flex: 1;
  max-width: 160px;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
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

.m-tool__alert--success {
  background: var(--m-color-success-bg);
  border-color: #a7f3d0;
}

.m-tool__alert--success .m-tool__alert-title {
  color: var(--m-color-success);
}

.m-tool__alert--warning {
  background: var(--m-color-warning-bg);
  border-color: #fde68a;
}

.m-tool__alert--warning .m-tool__alert-title {
  color: var(--m-color-warning);
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