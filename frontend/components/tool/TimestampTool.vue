<script setup lang="ts">
/**
 * TimestampTool.vue - 时间戳转换工具组件
 *
 * 严格参照 ui/pages/时间戳转换.html 的交互区结构：
 * 1. 实时时间戳卡片（秒/毫秒/当前时间，每秒更新）
 * 2. 双栏转换区（时间戳→日期时间 / 日期时间→时间戳）
 * 3. 时区选择卡片（pills：UTC/北京/东京/纽约/伦敦/洛杉矶）
 * 4. 常用时间戳参考表（动态：今天/本周/本月/今年/Unix纪元）
 *
 * - 所有转换调用 ~/utils/tools/timestamp 中的纯函数
 * - SSR 安全：动态时间内容初始为占位值，onMounted 后填充
 * - 转换触发 reportEvent('tool_use', slug)
 */
import {
  Clock,
  Calendar,
  CalendarDays,
  Globe,
  BarChart3,
  RotateCcw,
  AlertCircle,
} from 'lucide-vue-next'
import {
  timestampToDate,
  dateToTimestamp,
  nowTimestamp,
  type TimestampUnit,
} from '~/utils/tools/timestamp'
import { useAnalytics } from '~/composables/useAnalytics'

useHead({
  titleTemplate: null,
  title: '时间戳转换 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线Unix时间戳转换工具，支持秒/毫秒级互转、多时区切换、常用时间参考，免登录打开即用，本地计算精准高效。'
    },
    {
      name: 'keywords',
      content: '时间戳转换,Unix时间戳,时间转换,在线时间戳'
    },
    {
      property: 'og:title',
      content: '时间戳转换 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线Unix时间戳转换工具，支持秒/毫秒级互转、多时区切换、常用时间参考，免登录打开即用，本地计算精准高效。'
    }
  ]
})

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

// === 时区定义 ===
interface Timezone {
  label: string
  offset: number
  display: string
}

const TIMEZONES: Timezone[] = [
  { label: 'UTC', offset: 0, display: 'UTC' },
  { label: '北京时间', offset: 8, display: '北京时间 (UTC+8)' },
  { label: '东京', offset: 9, display: '东京 (UTC+9)' },
  { label: '纽约', offset: -5, display: '纽约 (UTC-5)' },
  { label: '伦敦', offset: 0, display: '伦敦 (UTC+0)' },
  { label: '洛杉矶', offset: -8, display: '洛杉矶 (UTC-8)' },
]

const tzOffset = ref(8) // 默认北京时间 UTC+8
const activeTzLabel = ref('北京时间')

function selectTz(tz: Timezone) {
  tzOffset.value = tz.offset
  activeTzLabel.value = tz.label
  // 重新渲染所有
  updateLive()
  if (lastTsMs.value !== null) {
    renderTsResult(new Date(lastTsMs.value))
  }
  if (lastDtValue.value) {
    try {
      const result = dateToTimestamp(lastDtValue.value, tzOffset.value)
      dtOutSeconds.value = String(result.seconds)
      dtOutMillis.value = String(result.millis)
      dtOutIso.value = result.iso
    } catch {
      dtOutSeconds.value = '—'
      dtOutMillis.value = '—'
      dtOutIso.value = '—'
    }
  }
  computeRefTable()
}

// === 1. 实时时间戳 ===
const liveSeconds = ref('—')
const liveMillis = ref('—')
const liveDatetime = ref('—')

function updateLive() {
  const now = nowTimestamp()
  liveSeconds.value = String(now.seconds)
  liveMillis.value = String(now.millis)
  liveDatetime.value = timestampToDate(
    now.millis,
    'ms',
    tzOffset.value,
  ).datetime
}

let liveTimer: ReturnType<typeof setInterval> | null = null

// === 2. 左栏：时间戳 → 日期时间 ===
const tsInput = ref('')
const tsUnit = ref<TimestampUnit>('s')
const tsError = ref('')
const tsOutDatetime = ref('—')
const tsOutIso = ref('—')
const tsOutRelative = ref('—')
const lastTsMs = ref<number | null>(null)

function renderTsResult(date: Date) {
  const result = timestampToDate(date.getTime(), 'ms', tzOffset.value)
  tsOutDatetime.value = result.datetime
  tsOutIso.value = result.iso
  tsOutRelative.value = result.relative
}

function convertTsToDateTime() {
  const raw = tsInput.value.trim()
  if (!raw) {
    tsError.value = '请输入时间戳'
    return
  }
  const num = Number(raw)
  if (Number.isNaN(num)) {
    tsError.value = '无效的时间戳输入：非数字'
    return
  }
  reportEvent('tool_use', props.slug)
  try {
    const ms = tsUnit.value === 's' ? num * 1000 : num
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) {
      tsError.value = '无效的时间戳：超出可表示范围'
      return
    }
    tsError.value = ''
    lastTsMs.value = ms
    renderTsResult(date)
  } catch (e) {
    tsError.value = e instanceof Error ? e.message : '转换失败'
  }
}

function onTsInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    convertTsToDateTime()
  }
}

// === 3. 右栏：日期时间 → 时间戳 ===
const dtInput = ref('')
const dtOutSeconds = ref('—')
const dtOutMillis = ref('—')
const dtOutIso = ref('—')
const lastDtValue = ref<string | null>(null)

/** 将 Date 转为 datetime-local 格式字符串（按指定时区） */
function toDatetimeLocalString(date: Date, offsetHours: number): string {
  const result = timestampToDate(date.getTime(), 'ms', offsetHours)
  return result.datetime.replace(' ', 'T')
}

function convertDtToTs() {
  const val = dtInput.value
  if (!val) {
    dtOutSeconds.value = '—'
    dtOutMillis.value = '—'
    dtOutIso.value = '—'
    return
  }
  reportEvent('tool_use', props.slug)
  lastDtValue.value = val
  try {
    const result = dateToTimestamp(val, tzOffset.value)
    dtOutSeconds.value = String(result.seconds)
    dtOutMillis.value = String(result.millis)
    dtOutIso.value = result.iso
  } catch {
    dtOutSeconds.value = '—'
    dtOutMillis.value = '—'
    dtOutIso.value = '—'
  }
}

function useNowForDt() {
  dtInput.value = toDatetimeLocalString(new Date(), tzOffset.value)
  convertDtToTs()
}

// === 4. 常用时间戳参考表 ===
interface RefRow {
  label: string
  date: Date
}

const refRows = ref<RefRow[]>([])

function computeRefTable() {
  const offset = tzOffset.value
  const now = new Date()

  // 获取当前时区下的日期各部分
  const nowParts = timestampToDate(now.getTime(), 'ms', offset).datetime
  const [datePart] = nowParts.split(' ')
  const [yStr, mStr, dStr] = datePart.split('-')
  const y = Number.parseInt(yStr!, 10)
  const m = Number.parseInt(mStr!, 10)
  const d = Number.parseInt(dStr!, 10)

  // 今天开始（00:00:00）按指定时区
  const dayStartMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offset * 3600000
  const dayStart = new Date(dayStartMs)
  const dayEnd = new Date(dayStartMs + 24 * 3600000 - 1000)

  // 本周开始（周一）
  const dayOfWeek = new Date(dayStartMs).getUTCDay() // 0=Sun, 1=Mon...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(dayStartMs - daysSinceMonday * 24 * 3600000)

  // 本月开始
  const monthStartMs = Date.UTC(y, m - 1, 1, 0, 0, 0) - offset * 3600000
  const monthStart = new Date(monthStartMs)

  // 今年开始
  const yearStartMs = Date.UTC(y, 0, 1, 0, 0, 0) - offset * 3600000
  const yearStart = new Date(yearStartMs)

  // Unix 纪元
  const epoch = new Date(0)

  refRows.value = [
    { label: '今天开始 (00:00:00)', date: dayStart },
    { label: '今天结束 (23:59:59)', date: dayEnd },
    { label: '本周开始 (周一)', date: weekStart },
    { label: '本月开始', date: monthStart },
    { label: '今年开始', date: yearStart },
    { label: 'Unix 纪元 (1970-01-01)', date: epoch },
  ]
}

function formatRefDate(date: Date): string {
  return timestampToDate(date.getTime(), 'ms', tzOffset.value).datetime
}

function formatRefSeconds(date: Date): string {
  return String(Math.floor(date.getTime() / 1000))
}

function formatRefMillis(date: Date): string {
  return String(date.getTime())
}

// === 生命周期 ===
onMounted(() => {
  updateLive()
  liveTimer = setInterval(updateLive, 1000)
  computeRefTable()
  // 右栏默认填充当前时间
  dtInput.value = toDatetimeLocalString(new Date(), tzOffset.value)
  convertDtToTs()
})

onBeforeUnmount(() => {
  if (liveTimer) {
    clearInterval(liveTimer)
    liveTimer = null
  }
})
</script>

<template>
  <div>
    <!-- ============ 1. 实时时间戳卡片 ============ -->
    <div
      class="pz-card mb-6"
      style="
        background-color: var(--pz-color-primary-light);
        border-color: var(--pz-color-primary-border);
        border-radius: var(--pz-radius-lg);
        padding: 1.5rem;
      "
    >
      <div class="flex items-center gap-2 mb-3">
        <span
          class="flex items-center justify-center"
          style="
            width: 32px;
            height: 32px;
            background-color: var(--pz-color-primary);
            border-radius: var(--pz-radius-md);
            color: var(--pz-color-text-inverse);
          "
        >
          <Clock class="w-[18px] h-[18px]" aria-hidden="true" />
        </span>
        <span
          class="text-sm font-semibold"
          style="color: var(--pz-color-primary)"
        >
          当前 Unix 时间戳
        </span>
        <span
          class="pz-badge pz-badge-primary"
          style="
            background-color: var(--pz-color-primary);
            color: var(--pz-color-text-inverse);
          "
        >
          实时
        </span>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
        <div>
          <div class="text-xs mb-1" style="color: var(--pz-color-text-secondary)">
            秒 (s)
          </div>
          <div class="pz-live-timestamp">{{ liveSeconds }}</div>
        </div>
        <div>
          <div class="text-xs mb-1" style="color: var(--pz-color-text-secondary)">
            毫秒 (ms)
          </div>
          <div class="pz-live-timestamp" style="font-size: var(--pz-text-xl)">
            {{ liveMillis }}
          </div>
        </div>
        <div class="sm:ml-auto">
          <div class="text-xs mb-1" style="color: var(--pz-color-text-secondary)">
            当前时间
          </div>
          <div
            style="
              font-family: var(--pz-font-mono);
              font-size: var(--pz-text-base);
              font-weight: var(--pz-weight-semibold);
              color: var(--pz-color-text-primary);
            "
          >
            {{ liveDatetime }}
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 2. 双栏转换区 ============ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <!-- 左栏：时间戳 → 日期时间 -->
      <div class="pz-conv-card flex flex-col gap-3">
        <div class="flex items-center gap-2 mb-1">
          <Calendar
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            时间戳 → 日期时间
          </h2>
        </div>
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-medium"
            style="color: var(--pz-color-text-secondary)"
            for="pz-ts-input"
          >
            输入时间戳
          </label>
          <input
            id="pz-ts-input"
            v-model="tsInput"
            type="text"
            class="pz-input w-full"
            placeholder="输入时间戳，如 1698765432"
            @keydown="onTsInputKeydown"
          />
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <label
              class="text-xs font-medium"
              style="color: var(--pz-color-text-secondary)"
              for="pz-ts-unit"
            >
              单位
            </label>
            <select
              id="pz-ts-unit"
              v-model="tsUnit"
              class="pz-input"
              aria-label="时间戳单位"
            >
              <option value="s">秒 (s)</option>
              <option value="ms">毫秒 (ms)</option>
            </select>
          </div>
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            @click="convertTsToDateTime"
          >
            <RotateCcw class="w-4 h-4" aria-hidden="true" />
            转换
          </button>
        </div>
        <!-- 错误提示 -->
        <div
          v-if="tsError"
          role="alert"
          class="pz-card p-3 flex items-start gap-2"
          style="
            background-color: var(--pz-state-error-bg);
            border-color: var(--pz-state-error-border);
          "
        >
          <AlertCircle
            class="w-4 h-4 shrink-0 mt-0.5"
            style="color: var(--pz-state-error)"
            aria-hidden="true"
          />
          <p class="text-sm" style="color: var(--pz-state-error)">
            {{ tsError }}
          </p>
        </div>
        <!-- 输出 -->
        <div class="flex flex-col gap-2 mt-1">
          <div>
            <div
              class="text-xs mb-1"
              style="color: var(--pz-color-text-secondary)"
            >
              日期时间 (YYYY-MM-DD HH:mm:ss)
            </div>
            <div class="pz-conv-output">{{ tsOutDatetime }}</div>
          </div>
          <div>
            <div
              class="text-xs mb-1"
              style="color: var(--pz-color-text-secondary)"
            >
              ISO 8601
            </div>
            <div class="pz-conv-output">{{ tsOutIso }}</div>
          </div>
          <div>
            <div
              class="text-xs mb-1"
              style="color: var(--pz-color-text-secondary)"
            >
              相对时间
            </div>
            <div class="pz-conv-output">{{ tsOutRelative }}</div>
          </div>
        </div>
      </div>

      <!-- 右栏：日期时间 → 时间戳 -->
      <div class="pz-conv-card flex flex-col gap-3">
        <div class="flex items-center gap-2 mb-1">
          <CalendarDays
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            日期时间 → 时间戳
          </h2>
        </div>
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-medium"
            style="color: var(--pz-color-text-secondary)"
            for="pz-dt-input"
          >
            选择日期时间
          </label>
          <input
            id="pz-dt-input"
            v-model="dtInput"
            type="datetime-local"
            class="pz-input w-full"
            step="1"
            @keydown.enter.prevent="convertDtToTs"
          />
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            @click="convertDtToTs"
          >
            <RotateCcw class="w-4 h-4" aria-hidden="true" />
            转换
          </button>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="useNowForDt"
          >
            <Clock class="w-4 h-4" aria-hidden="true" />
            使用当前时间
          </button>
        </div>
        <!-- 输出 -->
        <div class="flex flex-col gap-2 mt-1">
          <div>
            <div
              class="text-xs mb-1"
              style="color: var(--pz-color-text-secondary)"
            >
              时间戳 (秒)
            </div>
            <div class="pz-conv-output">{{ dtOutSeconds }}</div>
          </div>
          <div>
            <div
              class="text-xs mb-1"
              style="color: var(--pz-color-text-secondary)"
            >
              时间戳 (毫秒)
            </div>
            <div class="pz-conv-output">{{ dtOutMillis }}</div>
          </div>
          <div>
            <div
              class="text-xs mb-1"
              style="color: var(--pz-color-text-secondary)"
            >
              ISO 8601
            </div>
            <div class="pz-conv-output">{{ dtOutIso }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 3. 时区选择 ============ -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Globe
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          时区选择
        </h2>
        <span class="text-sm" style="color: var(--pz-color-text-secondary)">
          — 切换时区将重新计算所有显示的时间
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tz in TIMEZONES"
          :key="tz.label"
          type="button"
          class="pz-tz-pill"
          :data-active="activeTzLabel === tz.label ? 'true' : 'false'"
          :aria-pressed="activeTzLabel === tz.label ? 'true' : 'false'"
          :aria-label="`选择时区 ${tz.display}`"
          @click="selectTz(tz)"
        >
          {{ tz.display }}
        </button>
      </div>
    </div>

    <!-- ============ 4. 常用时间戳参考表 ============ -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <BarChart3
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          常用时间戳参考
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-ref-table">
          <thead>
            <tr>
              <th>参考点</th>
              <th>日期时间</th>
              <th>时间戳 (秒)</th>
              <th>时间戳 (毫秒)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in refRows" :key="row.label">
              <td style="font-weight: var(--pz-weight-medium); color: var(--pz-color-text-primary)">
                {{ row.label }}
              </td>
              <td class="pz-mono-cell">{{ formatRefDate(row.date) }}</td>
              <td class="pz-mono-cell">{{ formatRefSeconds(row.date) }}</td>
              <td class="pz-mono-cell">{{ formatRefMillis(row.date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === Live timestamp display === */
.pz-live-timestamp {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-3xl);
  font-weight: var(--pz-weight-bold);
  color: var(--pz-color-primary);
  letter-spacing: -0.02em;
}

/* === Conversion pane card === */
.pz-conv-card {
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-lg);
  padding: 1.5rem;
}

/* === Conversion output === */
.pz-conv-output {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-base);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem;
  word-break: break-all;
}

/* === Timezone pill === */
.pz-tz-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-full);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pz-tz-pill:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}

.pz-tz-pill[data-active='true'] {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
  border-color: var(--pz-color-primary);
}

/* === Reference table === */
.pz-ref-table {
  width: 100%;
  border-collapse: collapse;
}

.pz-ref-table :deep(th) {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  text-align: left;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border);
  white-space: nowrap;
}

.pz-ref-table :deep(td) {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}

.pz-ref-table .pz-mono-cell {
  font-family: var(--pz-font-mono);
  color: var(--pz-color-text-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .pz-tz-pill {
    transition: none;
  }
}
</style>
