<script setup lang="ts">
/**
 * MobileHtmlEscape.vue - 移动端 HTML 转义/反转义工具
 *
 * 单列布局：
 * 1. 模式切换（转义 / 反转义）select
 * 2. 转义模式下显示转义模式 select（basic / attributes / entities）
 * 3. 输入框 + 操作按钮（转换 / 清空 / 交换）
 * 4. 输出框 + 复制
 */
import {
  escapeHtmlSafe,
  unescapeHtmlSafe,
  type EscapeMode,
} from '~/utils/tools/htmlEscape'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'html-escape',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const mode = ref<'escape' | 'unescape'>('escape')
const escapeMode = ref<EscapeMode>('basic')

const SAMPLE_INPUT = '<a href="/path?q=1&n=2">点击"这里"</a>'
const SAMPLE_OUTPUT = escapeHtmlSafe(SAMPLE_INPUT, 'basic').output ?? ''

const input = ref(SAMPLE_INPUT)
const output = ref(SAMPLE_OUTPUT)
const errorMsg = ref('')
const copied = ref(false)

function handleConvert() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  if (input.value === '') {
    output.value = ''
    return
  }

  const result =
    mode.value === 'escape'
      ? escapeHtmlSafe(input.value, escapeMode.value)
      : unescapeHtmlSafe(input.value)

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
  errorMsg.value = ''
}

function handleSwap() {
  const tmp = input.value
  input.value = output.value
  output.value = tmp
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
    <!-- 选项区 -->
    <div class="m-tool__card">
      <div class="m-tool__row">
        <span class="m-tool__label">模式</span>
        <select v-model="mode" class="m-tool__select">
          <option value="escape">HTML 转义</option>
          <option value="unescape">HTML 反转义</option>
        </select>
      </div>
      <div v-if="mode === 'escape'" class="m-tool__row">
        <span class="m-tool__label">转义模式</span>
        <select v-model="escapeMode" class="m-tool__select">
          <option value="basic">basic（&lt; &gt; &amp;）</option>
          <option value="attributes">attributes（含引号）</option>
          <option value="entities">entities（最严格）</option>
        </select>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输入</span>
      </div>
      <textarea
        v-model="input"
        class="m-tool__textarea"
        :placeholder="mode === 'escape' ? '输入要转义的 HTML 文本' : '输入要反转义的 HTML 实体'"
        aria-label="HTML 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleConvert">转换</button>
      <button type="button" class="m-btn m-btn--secondary" @click="handleSwap">交换</button>
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
