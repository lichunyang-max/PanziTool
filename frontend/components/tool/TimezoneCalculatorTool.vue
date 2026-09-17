<script setup lang="ts">
/**
 * TimezoneCalculatorTool.vue - 时区时间计算器组件
 *
 * 严格参照 panziui/tools/timezone-calculator.html 交互区结构：
 * 1. 参考时间卡片（datetime-local + 参考时区 + 现在）
 * 2. 时区对照卡片（多时区本地时间 / UTC 偏移 / 与参考时差 + 添加/删除时区）
 * 3. 时间差计算卡片（时区 A/B + 各自时间 + 计算结果）
 *
 * 使用浏览器原生 Intl API 换算，自动处理夏令时，所有计算在本地完成。
 * 交互事件（通过 useAnalytics 上报）：
 * - 计算时间差 / Ctrl+Enter → tool_use 事件
 */
import { AlertCircle, Clock, Globe, Plus } from 'lucide-vue-next'
import {
  TZ_LIST,
  TZ_DEFAULT_SHOWN,
  calcTimeDiff,
  formatDiff,
  formatLocal,
  formatOffset,
  getOffsetMinutes,
  getZoneLabel,
  wallTimeToUtc,
} from '~/utils/tools/timezone'

useHead({
  titleTemplate: null,
  title: '时区时间计算器 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线时区换算工具，多时区时间对照、时间差计算，基于Intl API自动处理夏令时，排查跨时区业务bug，本地浏览器运算免登录即用。',
    },
    {
      name: 'keywords',
      content: '时区转换,时区计算,时间差计算,夏令时,UTC,IANA时区',
    },
    {
      property: 'og:title',
      content: '时区时间计算器 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线时区换算工具，多时区时间对照、时间差计算，基于Intl API自动处理夏令时，排查跨时区业务bug，本地浏览器运算免登录即用。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'timezone-calculator',
)

// === 状态 ===
const refTime = ref('2026-06-15T14:00')
const refZone = ref('Asia/Shanghai')
const shownZones = ref<string[]>([...TZ_DEFAULT_SHOWN])
const addZoneValue = ref('Asia/Hong_Kong')

const diffZoneA = ref('Asia/Shanghai')
const diffZoneB = ref('America/New_York')
const diffTimeA = ref('2026-06-15T14:00')
const diffTimeB = ref('2026-06-15T02:00')
const diffMain = ref('')
const diffDetail = ref('')
const diffError = ref('')

// 预填示例结果，确保 SSR/预渲染时页面有实际内容
{
  const r = calcTimeDiff(
    diffTimeA.value,
    diffZoneA.value,
    diffTimeB.value,
    diffZoneB.value,
  )
  if (r.success && r.output) {
    const [main, detail = ''] = r.output.split('\n')
    diffMain.value = main
    diffDetail.value = detail
  }
}

// === 计算属性：时区对照表 ===
interface ZoneRow {
  zone: string
  label: string
  local: string
  offset: string
  diff: string
}

const zoneRows = computed<ZoneRow[]>(() => {
  if (!refTime.value) return []
  const refTs = wallTimeToUtc(refTime.value, refZone.value)
  const refOffset = getOffsetMinutes(new Date(refTs), refZone.value)
  const d = new Date(refTs)
  return shownZones.value.map((zone) => {
    const offset = getOffsetMinutes(d, zone)
    return {
      zone,
      label: getZoneLabel(zone),
      local: formatLocal(d, zone),
      offset: formatOffset(offset),
      diff: formatDiff(offset - refOffset),
    }
  })
})

const hasRefTime = computed(() => !!refTime.value)

// === 方法 ===
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 以当前本地时间填入参考时间（客户端） */
function setNow() {
  if (import.meta.server) return
  const now = new Date()
  refTime.value =
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    'T' +
    pad(now.getHours()) +
    ':' +
    pad(now.getMinutes())
}

function addZone() {
  const zone = addZoneValue.value
  if (!shownZones.value.includes(zone)) {
    shownZones.value.push(zone)
  }
}

function removeZone(zone: string) {
  shownZones.value = shownZones.value.filter((z) => z !== zone)
}

function doCalcDiff() {
  diffError.value = ''
  diffMain.value = ''
  diffDetail.value = ''

  if (!diffTimeA.value || !diffTimeB.value) {
    diffError.value = '请填写两个时区的时间'
    return
  }

  const r = calcTimeDiff(
    diffTimeA.value,
    diffZoneA.value,
    diffTimeB.value,
    diffZoneB.value,
  )
  if (r.success && r.output) {
    const [main, detail = ''] = r.output.split('\n')
    diffMain.value = main
    diffDetail.value = detail
  } else {
    diffError.value = r.error ?? '计算失败'
  }

  reportEvent('tool_use', effectiveSlug.value)
}

/** 以当前本地时间填入时间差两个输入（客户端） */
function fillNowDiff() {
  if (import.meta.server) return
  const now = new Date()
  const local =
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    'T' +
    pad(now.getHours()) +
    ':' +
    pad(now.getMinutes())
  diffTimeA.value = local
  diffTimeB.value = local
}

/** Ctrl/Cmd + Enter 触发计算时间差 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    doCalcDiff()
  }
}
</script>

<template>
  <div>
    <!-- 1. 参考时间 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <label
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
          for="pz-tz-ref-time"
        >
          参考时间
        </label>
        <input
          id="pz-tz-ref-time"
          v-model="refTime"
          type="datetime-local"
          class="pz-input"
          style="width: 230px"
        />
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="setNow"
        >
          现在
        </button>
        <label
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary); margin-left: 0.5rem"
          for="pz-tz-ref-zone"
        >
          参考时区
        </label>
        <select
          id="pz-tz-ref-zone"
          v-model="refZone"
          class="pz-input"
        >
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">
            {{ t.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 2. 时区对照 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div class="flex items-center gap-2">
          <Globe
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            时区对照
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <select v-model="addZoneValue" class="pz-input" style="min-width: 180px">
            <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">
              {{ t.label }}
            </option>
          </select>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="addZone"
          >
            <Plus class="w-4 h-4" aria-hidden="true" />
            <span>添加时区</span>
          </button>
        </div>
      </div>

      <!-- 表头 -->
      <div class="tz-row tz-row--header">
        <span>时区</span>
        <span>本地时间</span>
        <span>UTC偏移</span>
        <span>与参考时差</span>
        <span aria-hidden="true" />
      </div>

      <!-- 行 -->
      <div v-if="hasRefTime">
        <div v-for="row in zoneRows" :key="row.zone" class="tz-row">
          <span>{{ row.label }}</span>
          <span class="tz-time">{{ row.local }}</span>
          <span class="tz-offset">{{ row.offset }}</span>
          <span class="tz-diff">{{ row.diff }}</span>
          <button
            type="button"
            class="tz-remove"
            :aria-label="`删除 ${row.label}`"
            @click="removeZone(row.zone)"
          >
            ×
          </button>
        </div>
      </div>
      <div
        v-else
        class="text-center py-6"
        style="color: var(--pz-color-text-tertiary); font-size: var(--pz-text-sm)"
      >
        请先设置参考时间
      </div>
    </div>

    <!-- 3. 时间差计算 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Clock
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          时间差计算
        </h2>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm" style="width: 56px">时区 A</span>
        <select
          v-model="diffZoneA"
          class="pz-input"
          style="min-width: 180px"
        >
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">
            {{ t.label }}
          </option>
        </select>
        <input
          v-model="diffTimeA"
          type="datetime-local"
          class="pz-input"
          style="width: 230px"
          @keydown="onKeydown"
        />
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm" style="width: 56px">时区 B</span>
        <select
          v-model="diffZoneB"
          class="pz-input"
          style="min-width: 180px"
        >
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">
            {{ t.label }}
          </option>
        </select>
        <input
          v-model="diffTimeB"
          type="datetime-local"
          class="pz-input"
          style="width: 230px"
          @keydown="onKeydown"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="doCalcDiff"
        >
          计算时间差
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="fillNowDiff"
        >
          填入当前时间
        </button>
      </div>

      <div
        v-if="diffError"
        class="pz-error-text flex items-start gap-2"
        role="alert"
      >
        <AlertCircle
          class="w-4 h-4 shrink-0 mt-0.5"
          style="color: var(--pz-state-error)"
          aria-hidden="true"
        />
        <span>{{ diffError }}</span>
      </div>

      <div v-if="diffMain" class="tz-diff-result">
        <div>{{ diffMain }}</div>
        <div class="tz-diff-detail">{{ diffDetail }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === 时区对照表网格行 === */
.tz-row {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) minmax(140px, 1.4fr) 80px 90px 32px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border-light);
  font-size: var(--pz-text-sm);
}
.tz-row:last-child {
  border-bottom: none;
}
.tz-row--header {
  background: var(--pz-color-bg-secondary);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  border-radius: var(--pz-radius-md);
  border-bottom: none;
  margin-bottom: 0.25rem;
}
.tz-time {
  font-family: var(--pz-font-mono);
  color: var(--pz-color-text-primary);
}
.tz-offset {
  color: var(--pz-color-text-secondary);
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
}
.tz-diff {
  color: var(--pz-color-primary);
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
}
.tz-remove {
  border: none;
  background: none;
  color: var(--pz-color-text-tertiary);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
  border-radius: var(--pz-radius-sm);
}
.tz-remove:hover {
  color: var(--pz-state-error);
  background: var(--pz-state-error-bg);
}

/* === 时间差结果 === */
.tz-diff-result {
  background-color: var(--pz-color-primary-light);
  color: var(--pz-color-primary);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem 1rem;
  font-size: var(--pz-text-base);
  font-weight: var(--pz-weight-semibold);
}
.tz-diff-detail {
  margin-top: 0.25rem;
  font-weight: var(--pz-weight-regular);
  font-size: var(--pz-text-sm);
}

@media (max-width: 640px) {
  .tz-row {
    grid-template-columns: 1fr 1fr;
  }
  .tz-row--header {
    display: none;
  }
}
</style>
