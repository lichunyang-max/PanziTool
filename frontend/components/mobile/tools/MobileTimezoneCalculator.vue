<script setup lang="ts">
/**
 * MobileTimezoneCalculator.vue - 移动端时区时间计算器
 *
 * 参考时间 + 时区对照 + 时间差计算
 */
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

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'timezone-calculator',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

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

// 预填示例结果（Intl 对固定时间为确定性输出，无 SSR 不一致）
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

const hasRefTime = computed(() => !!refTime.value)

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

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

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
  const z = addZoneValue.value
  if (!shownZones.value.includes(z)) shownZones.value.push(z)
}

function removeZone(z: string) {
  shownZones.value = shownZones.value.filter((x) => x !== z)
}

function doCalcDiff() {
  diffError.value = ''
  diffMain.value = ''
  diffDetail.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

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
}

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
</script>

<template>
  <div class="m-tool">
    <!-- 参考时间 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">参考时间</span>
        <button type="button" class="m-tool__link" @click="setNow">现在</button>
      </div>
      <input
        v-model="refTime"
        type="datetime-local"
        class="m-tool__select"
        style="max-width: none"
      />
      <div class="m-tool__row">
        <span class="m-tool__label">时区</span>
        <select v-model="refZone" class="m-tool__select">
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">{{ t.label }}</option>
        </select>
      </div>
    </div>

    <!-- 时区对照 -->
    <div class="m-tool__card">
      <span class="m-tool__label">时区对照</span>
      <div class="m-tool__row">
        <select v-model="addZoneValue" class="m-tool__select">
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">{{ t.label }}</option>
        </select>
        <button
          type="button"
          class="m-btn m-btn--secondary"
          style="flex: 0 0 auto; min-width: 72px"
          @click="addZone"
        >添加</button>
      </div>
    </div>

    <div
      v-for="row in zoneRows"
      :key="row.zone"
      class="m-tool__card"
    >
      <div class="m-tool__header">
        <span class="m-tool__label">{{ row.label }}</span>
        <button type="button" class="m-tool__link" @click="removeZone(row.zone)">删除</button>
      </div>
      <span class="m-tool__label" style="font-weight: 400">{{ row.local }}</span>
      <div style="display: flex; gap: 12px; font-size: 12px">
        <span style="color: var(--m-color-text-secondary)">{{ row.offset }}</span>
        <span style="color: var(--m-color-primary)">{{ row.diff }}</span>
      </div>
    </div>

    <div v-if="!hasRefTime" class="m-tool__card">
      <span style="font-size: 13px; color: var(--m-color-text-tertiary)">请先设置参考时间</span>
    </div>

    <!-- 时间差计算 -->
    <div class="m-tool__card">
      <span class="m-tool__label">时间差计算</span>
      <div class="m-tool__row">
        <span class="m-tool__label" style="width: 48px">时区A</span>
        <select v-model="diffZoneA" class="m-tool__select">
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">{{ t.label }}</option>
        </select>
      </div>
      <input
        v-model="diffTimeA"
        type="datetime-local"
        class="m-tool__select"
        style="max-width: none"
      />
      <div class="m-tool__row">
        <span class="m-tool__label" style="width: 48px">时区B</span>
        <select v-model="diffZoneB" class="m-tool__select">
          <option v-for="t in TZ_LIST" :key="t.zone" :value="t.zone">{{ t.label }}</option>
        </select>
      </div>
      <input
        v-model="diffTimeB"
        type="datetime-local"
        class="m-tool__select"
        style="max-width: none"
      />
    </div>

    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="doCalcDiff">计算时间差</button>
      <button type="button" class="m-btn m-btn--ghost" @click="fillNowDiff">填入当前时间</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="diffError" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">计算失败</span>
      <span class="m-tool__alert-desc">{{ diffError }}</span>
    </div>

    <!-- 结果 -->
    <div
      v-if="diffMain"
      style="background: var(--m-color-primary-light); color: var(--m-color-primary); border-radius: 10px; padding: 12px; font-size: 15px; font-weight: 600"
    >
      <div>{{ diffMain }}</div>
      <div style="margin-top: 4px; font-weight: 400; font-size: 13px">{{ diffDetail }}</div>
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
