<script setup lang="ts">
/**
 * MobileTimestamp.vue - 移动端时间戳转换工具
 *
 * 时间戳输入 + 时间选择器
 * 常用时间戳快捷按钮（今天、昨天、本周一、本月一日）
 * 时区选择
 * 格式化输出
 */
import {
  timestampToDate,
  dateToTimestamp,
  nowTimestamp,
  detectUnit,
  type TimestampUnit,
  type COMMON_TIMESTAMPS,
} from '~/utils/tools/timestamp'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'timestamp',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

// 模式：'ts2date' 时间戳转日期 | 'date2ts' 日期转时间戳
const mode = ref<'ts2date' | 'date2ts'>('ts2date')

// 时间戳输入
const tsInput = ref(String(Date.now()))
const tsUnit = ref<TimestampUnit>('ms')

// 日期时间输入
const dateInput = ref('')

// 时区
const tzOffset = ref(8)

// 输出结果
const result = ref<{
  seconds: number
  millis: number
  datetime: string
  iso: string
  relative: string
} | null>(null)

const errorMsg = ref('')
const copied = ref(false)

const TIMEZONES = [
  { label: 'UTC (UTC+0)', offset: 0 },
  { label: '北京时间 (UTC+8)', offset: 8 },
  { label: '东京时间 (UTC+9)', offset: 9 },
  { label: '纽约时间 (UTC-5)', offset: -5 },
  { label: '伦敦时间 (UTC+0)', offset: 0 },
]

// 常用时间戳快捷
const QUICK_TIMES = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  // 本周一
  const dayOfWeek = now.getDay() || 7 // 0=Sun -> 7
  const monday = new Date(today.getTime() - (dayOfWeek - 1) * 86400000)

  // 本月一日
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return [
    { label: '当前时间', ts: Math.floor(Date.now() / 1000) },
    { label: '今天', ts: Math.floor(today.getTime() / 1000) },
    { label: '昨天', ts: Math.floor(yesterday.getTime() / 1000) },
    { label: '本周一', ts: Math.floor(monday.getTime() / 1000) },
    { label: '本月一日', ts: Math.floor(firstOfMonth.getTime() / 1000) },
  ]
})

// TS -> Date 转换
function handleTsToDate() {
  errorMsg.value = ''
  result.value = null
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  const ts = Number(tsInput.value)
  if (!Number.isFinite(ts)) {
    errorMsg.value = '请输入有效的时间戳数字'
    return
  }

  const unit = tsUnit.value
  try {
    const r = timestampToDate(ts, unit, tzOffset.value)
    const ms = unit === 's' ? ts * 1000 : ts
    const seconds = unit === 's' ? ts : Math.floor(ts / 1000)
    result.value = {
      seconds,
      millis: ms,
      datetime: r.datetime,
      iso: r.iso,
      relative: r.relative,
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '转换失败'
  }
}

// Date -> TS 转换
function handleDateToTs() {
  errorMsg.value = ''
  result.value = null
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  const input = dateInput.value
  if (!input) {
    errorMsg.value = '请选择日期时间'
    return
  }

  // HTML datetime-local 格式: YYYY-MM-DDTHH:mm
  const dateStr = input.replace('T', ' ') + ':00'

  try {
    const r = dateToTimestamp(dateStr, tzOffset.value)
    const ms = r.millis
    const seconds = r.seconds
    const date = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    const datetime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    result.value = {
      seconds,
      millis: ms,
      datetime,
      iso: r.iso,
      relative: '',
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '转换失败'
  }
}

function handleConvert() {
  if (mode.value === 'ts2date') {
    handleTsToDate()
  } else {
    handleDateToTs()
  }
}

function handleNow() {
  const n = nowTimestamp()
  if (mode.value === 'ts2date') {
    tsInput.value = String(n.millis)
    tsUnit.value = 'ms'
  } else {
    const d = new Date(n.millis)
    const pad = (x: number) => String(x).padStart(2, '0')
    dateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  errorMsg.value = ''
}

function handleQuickTs(ts: number) {
  mode.value = 'ts2date'
  tsInput.value = String(ts)
  tsUnit.value = 's'
  handleTsToDate()
}

function handleClear() {
  tsInput.value = ''
  dateInput.value = ''
  result.value = null
  errorMsg.value = ''
}

async function handleCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 静默忽略
  }
}

// 初始化默认日期
onMounted(() => {
  const now = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
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
          :class="{ 'is-active': mode === 'ts2date' }"
          @click="mode = 'ts2date'"
        >时间戳转日期</button>
        <button
          type="button"
          class="m-tool__tab"
          :class="{ 'is-active': mode === 'date2ts' }"
          @click="mode = 'date2ts'"
        >日期转时间戳</button>
      </div>
    </div>

    <!-- 输入区：时间戳转日期 -->
    <div v-if="mode === 'ts2date'" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">时间戳</span>
        <button type="button" class="m-tool__link" @click="handleNow">当前时间</button>
      </div>
      <div class="m-tool__input-row">
        <input
          v-model="tsInput"
          type="text"
          class="m-tool__input"
          placeholder="输入时间戳..."
          aria-label="时间戳输入"
        />
        <select v-model="tsUnit" class="m-tool__select--sm">
          <option value="s">秒</option>
          <option value="ms">毫秒</option>
        </select>
      </div>
    </div>

    <!-- 输入区：日期转时间戳 -->
    <div v-else class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">日期时间</span>
        <button type="button" class="m-tool__link" @click="handleNow">当前时间</button>
      </div>
      <input
        v-model="dateInput"
        type="datetime-local"
        class="m-tool__input"
        aria-label="日期时间输入"
      />
    </div>

    <!-- 时区选择 -->
    <div class="m-tool__card">
      <div class="m-tool__row">
        <span class="m-tool__label">时区</span>
        <select v-model="tzOffset" class="m-tool__select">
          <option v-for="tz in TIMEZONES" :key="tz.label" :value="tz.offset">
            {{ tz.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 快捷按钮 -->
    <div v-if="mode === 'ts2date'" class="m-tool__card">
      <span class="m-tool__label">常用时间</span>
      <div class="m-tool__quick">
        <button
          v-for="q in QUICK_TIMES"
          :key="q.label"
          type="button"
          class="m-tool__chip"
          @click="handleQuickTs(q.ts)"
        >{{ q.label }}</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleConvert">转换</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 结果展示 -->
    <div v-if="result" class="m-tool__card">
      <div class="m-tool__result-row">
        <span class="m-tool__result-label">秒级时间戳</span>
        <div class="m-tool__result-value">
          <code>{{ result.seconds }}</code>
          <button
            type="button"
            class="m-tool__copy-btn"
            @click="handleCopy(String(result.seconds))"
          >{{ copied ? '已复制' : '复制' }}</button>
        </div>
      </div>
      <div class="m-tool__result-row">
        <span class="m-tool__result-label">毫秒时间戳</span>
        <div class="m-tool__result-value">
          <code>{{ result.millis }}</code>
          <button
            type="button"
            class="m-tool__copy-btn"
            @click="handleCopy(String(result.millis))"
          >复制</button>
        </div>
      </div>
      <div class="m-tool__result-row">
        <span class="m-tool__result-label">日期时间</span>
        <div class="m-tool__result-value">
          <code>{{ result.datetime }}</code>
          <button
            type="button"
            class="m-tool__copy-btn"
            @click="handleCopy(result.datetime)"
          >复制</button>
        </div>
      </div>
      <div class="m-tool__result-row">
        <span class="m-tool__result-label">ISO 8601</span>
        <div class="m-tool__result-value">
          <code>{{ result.iso }}</code>
          <button
            type="button"
            class="m-tool__copy-btn"
            @click="handleCopy(result.iso)"
          >复制</button>
        </div>
      </div>
      <div v-if="result.relative" class="m-tool__result-row">
        <span class="m-tool__result-label">相对时间</span>
        <div class="m-tool__result-value">
          <span class="m-tool__relative">{{ result.relative }}</span>
        </div>
      </div>
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
  font-size: 14px;
  color: var(--m-color-text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__tab.is-active {
  background: var(--m-color-surface);
  color: var(--m-color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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

.m-tool__input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.m-tool__input {
  flex: 1;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
  box-sizing: border-box;
}

.m-tool__input:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-tool__select--sm {
  min-height: 44px;
  width: 80px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 8px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
}

.m-tool__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.m-tool__select {
  flex: 1;
  max-width: 240px;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
}

.m-tool__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-tool__chip {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--m-color-border);
  border-radius: 18px;
  background: var(--m-color-surface);
  font-size: 13px;
  color: var(--m-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__chip:active {
  background: var(--m-color-primary-light);
  border-color: var(--m-color-primary);
  color: var(--m-color-primary);
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

.m-btn--ghost {
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  border: 1px solid var(--m-color-border);
}

.m-btn--ghost:active {
  background: var(--m-color-bg);
}

.m-tool__result-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--m-color-border-light);
}

.m-tool__result-row:last-child {
  border-bottom: none;
}

.m-tool__result-label {
  font-size: 13px;
  color: var(--m-color-text-tertiary);
}

.m-tool__result-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.m-tool__result-value code {
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  word-break: break-all;
  flex: 1;
}

.m-tool__copy-btn {
  background: none;
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  min-height: 32px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--m-color-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__copy-btn:active {
  background: var(--m-color-primary-light);
}

.m-tool__relative {
  font-size: 14px;
  color: var(--m-color-primary);
  font-weight: 500;
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