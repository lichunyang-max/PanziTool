<script setup lang="ts">
/**
 * MobileCron.vue - 移动端 Cron 表达式工具
 *
 * 支持功能：
 * - 5 段 / 6 段格式切换
 * - 表达式校验与错误提示
 * - 中文解释展示
 * - 未来触发时间预览（默认 10 次，可配置）
 * - 常用模板一键填入
 *
 * 复用 PC 端 utils/tools/cron.ts 业务逻辑
 */
import { ref, computed, watch, onMounted } from 'vue'
import {
  validateCron,
  explainCron,
  getNextTriggerTimes,
  getFieldInfos,
  type CronMode,
  type CronValidationResult,
} from '~/utils/tools/cron'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'cron',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

// === 模式切换 ===
const mode = ref<CronMode>('6-field')

const fieldInfos = computed(() => getFieldInfos(mode.value))

const fieldLabels = computed(() =>
  fieldInfos.value.map((f) => f.label),
)

// === 表达式输入 ===
const expression = ref('0 30 9 ? * MON-FRI')

const validationResult = ref<CronValidationResult>({ valid: true })

// === 中文解释 ===
const explanation = ref('')

// === 触发时间预览 ===
const previewCount = ref(10)
const triggerTimes = ref<Date[]>([])

function formatTriggerTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function validate() {
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  validationResult.value = validateCron(expression.value, mode.value)
  if (validationResult.value.valid) {
    computeDerived()
  } else {
    explanation.value = ''
    triggerTimes.value = []
  }
}

function computeDerived() {
  if (!validationResult.value.valid) {
    explanation.value = ''
    triggerTimes.value = []
    return
  }
  explanation.value = explainCron(expression.value, mode.value)
  triggerTimes.value = getNextTriggerTimes(
    expression.value,
    mode.value,
    previewCount.value,
  )
}

// 次数变化时重新计算
watch(previewCount, () => {
  if (validationResult.value.valid) {
    triggerTimes.value = getNextTriggerTimes(
      expression.value,
      mode.value,
      previewCount.value,
    )
  }
})

// 模式切换时重新校验与计算
watch(mode, () => {
  validate()
})

// === 常用模板 ===
interface CronTemplate {
  label: string
  expression: string
  mode: CronMode
}

const TEMPLATES: CronTemplate[] = [
  { label: '每分钟', expression: '* * * * *', mode: '5-field' },
  { label: '每小时整点', expression: '0 0 * * * ?', mode: '6-field' },
  { label: '每天 8 点', expression: '0 0 8 * * ?', mode: '6-field' },
  { label: '每天凌晨', expression: '0 0 0 * * ?', mode: '6-field' },
  { label: '工作日 9:30', expression: '0 30 9 ? * MON-FRI', mode: '6-field' },
  { label: '每月 1 日 0 点', expression: '0 0 0 1 * ?', mode: '6-field' },
  { label: '每 5 分钟', expression: '0 */5 * * * ?', mode: '6-field' },
  { label: '每 10 分钟', expression: '*/10 * * * *', mode: '5-field' },
  { label: '每周一 0 点', expression: '0 0 0 ? * MON', mode: '6-field' },
]

function applyTemplate(t: CronTemplate) {
  mode.value = t.mode
  expression.value = t.expression
  validate()
}

// === 复制 ===
const copiedKey = ref<string | null>(null)

async function copyToClipboard(text: string, key: string) {
  reportEvent('copy', effectiveSlug.value)
  emit('copy', effectiveSlug.value)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copiedKey.value = key
    setTimeout(() => {
      copiedKey.value = null
    }, 1500)
  } catch {
    // 静默忽略
  }
}

function copyTriggerTimes() {
  const text = triggerTimes.value
    .map((t, i) => `${i + 1}. ${formatTriggerTime(t)}`)
    .join('\n')
  copyToClipboard(text, 'trigger-times')
}

function copyExplanation() {
  copyToClipboard(explanation.value, 'explanation')
}

function copyExpression() {
  copyToClipboard(expression.value, 'expression')
}

onMounted(() => {
  validate()
})
</script>

<template>
  <div class="m-tool">
    <!-- 模式切换 -->
    <div class="m-tool__card">
      <div class="m-tool__tabs">
        <button
          type="button"
          class="m-tool__tab"
          :class="{ 'is-active': mode === '6-field' }"
          @click="mode = '6-field'"
        >6 段 秒-分-时-日-月-周</button>
        <button
          type="button"
          class="m-tool__tab"
          :class="{ 'is-active': mode === '5-field' }"
          @click="mode = '5-field'"
        >5 段 分-时-日-月-周</button>
      </div>
      <!-- 字段含义提示 -->
      <div class="m-tool__fields">
        <span
          v-for="(label, i) in fieldLabels"
          :key="i"
          class="m-tool__field-pill"
        >{{ label }}</span>
      </div>
    </div>

    <!-- 表达式输入 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">Cron 表达式</span>
        <button
          type="button"
          class="m-tool__link"
          @click="copyExpression"
        >{{ copiedKey === 'expression' ? '已复制' : '复制' }}</button>
      </div>
      <input
        v-model="expression"
        type="text"
        class="m-tool__input"
        placeholder="例如：0 30 9 ? * MON-FRI"
        aria-label="Cron 表达式输入"
        spellcheck="false"
        @keydown.enter.prevent="validate"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button
        type="button"
        class="m-btn m-btn--primary"
        @click="validate"
      >校验并解释</button>
    </div>

    <!-- 校验结果 -->
    <div
      v-if="!validationResult.valid && validationResult.error"
      class="m-tool__alert m-tool__alert--error"
      role="alert"
    >
      <span class="m-tool__alert-title">校验失败</span>
      <span class="m-tool__alert-desc">{{ validationResult.error }}</span>
    </div>
    <div
      v-else-if="validationResult.valid && expression"
      class="m-tool__alert m-tool__alert--success"
    >
      <span class="m-tool__alert-title">表达式合法</span>
    </div>

    <!-- 中文解释 -->
    <div v-if="explanation" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">中文解释</span>
        <button
          type="button"
          class="m-tool__link"
          @click="copyExplanation"
        >{{ copiedKey === 'explanation' ? '已复制' : '复制' }}</button>
      </div>
      <p class="m-tool__explain">{{ explanation }}</p>
    </div>

    <!-- 触发时间预览 -->
    <div v-if="triggerTimes.length > 0" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">未来 {{ previewCount }} 次触发</span>
        <button
          type="button"
          class="m-tool__link"
          @click="copyTriggerTimes"
        >{{ copiedKey === 'trigger-times' ? '已复制' : '复制' }}</button>
      </div>
      <div class="m-tool__count-row">
        <label class="m-tool__count-label" for="m-cron-count">次数</label>
        <input
          id="m-cron-count"
          v-model.number="previewCount"
          type="number"
          min="1"
          max="50"
          class="m-tool__count-input"
        />
      </div>
      <div class="m-tool__triggers">
        <div
          v-for="(t, i) in triggerTimes"
          :key="i"
          class="m-tool__trigger-row"
        >
          <span class="m-tool__trigger-idx">{{ i + 1 }}</span>
          <code class="m-tool__trigger-time">{{ formatTriggerTime(t) }}</code>
        </div>
      </div>
    </div>

    <!-- 常用模板 -->
    <div class="m-tool__card">
      <span class="m-tool__label">常用模板</span>
      <div class="m-tool__templates">
        <button
          v-for="t in TEMPLATES"
          :key="t.label"
          type="button"
          class="m-tool__template"
          @click="applyTemplate(t)"
        >
          <span class="m-tool__template-label">{{ t.label }}</span>
          <code class="m-tool__template-code">{{ t.expression }}</code>
        </button>
      </div>
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

.m-tool__tabs {
  display: flex;
  gap: 0;
  background: var(--m-color-bg);
  border-radius: 10px;
  padding: 4px;
}

.m-tool__tab {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  color: var(--m-color-text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.m-tool__tab.is-active {
  background: var(--m-color-surface);
  color: var(--m-color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.m-tool__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.m-tool__field-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
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
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  min-height: 32px;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__link:active {
  opacity: 0.7;
}

.m-tool__input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
}

.m-tool__input:focus {
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

.m-tool__alert-title {
  font-size: 14px;
  font-weight: 600;
}

.m-tool__alert-desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.m-tool__explain {
  margin: 0;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-bg);
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 1.5;
}

.m-tool__count-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.m-tool__count-label {
  font-size: 13px;
  color: var(--m-color-text-secondary);
}

.m-tool__count-input {
  width: 60px;
  min-height: 36px;
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  text-align: center;
  outline: none;
}

.m-tool__count-input:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 2px var(--m-color-primary-light);
}

.m-tool__triggers {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-tool__trigger-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--m-color-bg);
  border-radius: 8px;
}

.m-tool__trigger-idx {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.m-tool__trigger-time {
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  word-break: break-all;
}

.m-tool__templates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.m-tool__template {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  background: var(--m-color-surface);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
}

.m-tool__template:active {
  border-color: var(--m-color-primary);
  background: var(--m-color-primary-light);
}

.m-tool__template-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--m-color-text-primary);
}

.m-tool__template-code {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-secondary);
  word-break: break-all;
}
</style>
