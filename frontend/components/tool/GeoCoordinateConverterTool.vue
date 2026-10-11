<script setup lang="ts">
/**
 * GeoCoordinateConverterTool.vue - 地理坐标系转换
 *
 * 支持 WGS84、GCJ02、BD09 三种坐标系批量互转：
 * 一行一个坐标（支持「备注|经度,纬度」与度分秒写法），一次输出三种坐标系对照
 * 结果，可整表复制或导出 CSV；GCJ02/WGS84 采用社区公开近似算法，浏览器本地计算。
 */
import { ArrowLeftRight, Copy, Download, Info, MapPin, RefreshCw, Search, Trash2 } from 'lucide-vue-next'

useHead({
  titleTemplate: null,
  title: '地理坐标系转换 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线地理坐标系转换工具，支持 WGS84、GCJ02、BD09 三种坐标系批量互转，一次输入同时输出三种坐标系对照结果并可导出 CSV，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '坐标系转换,WGS84,GCJ02,BD09,火星坐标,百度坐标,经纬度转换,坐标批量转换' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'geo-coordinate-converter')
const { reportEvent } = useAnalytics()

/* ==================== 坐标算法（社区公开近似实现，自包含） ==================== */

type CrsName = 'WGS84' | 'GCJ02' | 'BD09'
/** [经度, 纬度] */
type LngLat = [number, number]

const CRS_ORDER: CrsName[] = ['WGS84', 'GCJ02', 'BD09']
const CRS_DESC: Record<CrsName, string> = {
  WGS84: '地球坐标系 · GPS 设备、Google 地图',
  GCJ02: '火星坐标系 · 高德、腾讯地图',
  BD09: '百度坐标系 · 百度地图',
}

/** 克拉索夫斯基椭圆体参数 */
const ELLIPSE_A = 6378245
const ELLIPSE_EE = 0.006693421622965943

/** 偏移算法覆盖范围（大致中国境内），境外原样返回 */
function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3
  ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3
  ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3
  return ret
}

/** WGS84 → GCJ02 正向偏移 */
function wgs2gcjRaw([lng, lat]: LngLat): LngLat {
  if (outOfChina(lng, lat)) return [lng, lat]
  const dLat = transformLat(lng - 105, lat - 35)
  const dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ELLIPSE_EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  const offLat = (dLat * 180) / (((ELLIPSE_A * (1 - ELLIPSE_EE)) / (magic * sqrtMagic)) * Math.PI)
  const offLng = (dLng * 180) / ((ELLIPSE_A / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [lng + offLng, lat + offLat]
}

/** GCJ02 → WGS84：迭代逼近，5 次后残差厘米级 */
function gcj2wgs(p: LngLat): LngLat {
  let wgs: LngLat = [p[0], p[1]]
  for (let i = 0; i < 5; i++) {
    const g = wgs2gcjRaw(wgs)
    wgs = [wgs[0] - (g[0] - p[0]), wgs[1] - (g[1] - p[1])]
  }
  return wgs
}

/** GCJ02 → BD09：极坐标变换 + 固定偏移 */
function gcj2bd([lng, lat]: LngLat): LngLat {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin((lat * Math.PI * 3000) / 180)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos((lng * Math.PI * 3000) / 180)
  return [z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006]
}

/** BD09 → GCJ02 */
function bd2gcj([lng, lat]: LngLat): LngLat {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * Math.PI * 3000) / 180)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos((x * Math.PI * 3000) / 180)
  return [z * Math.cos(theta), z * Math.sin(theta)]
}

/** 任意源坐标系 → WGS84 */
function toWgs(src: CrsName, p: LngLat): LngLat {
  if (src === 'WGS84') return p
  if (src === 'GCJ02') return gcj2wgs(p)
  return gcj2wgs(bd2gcj(p))
}

/** WGS84 → 任意目标坐标系 */
function fromWgs(dst: CrsName, w: LngLat): LngLat {
  if (dst === 'WGS84') return w
  if (dst === 'GCJ02') return wgs2gcjRaw(w)
  return gcj2bd(wgs2gcjRaw(w))
}

/** 球面距离（haversine，米） */
function geoDist(a: LngLat, b: LngLat): number {
  const r = 6371000
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLng = (b[0] - a[0]) * rad
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(s))
}

/* ==================== 输入解析（十进制度 / 度分秒） ==================== */

/** 度分秒写法：39°54′18″ / 39°54'18" / 39d54m18s，可带 N/S/E/W 方位 */
const DMS_RE = /^([NSEWnsew])?\s*(\d+(?:\.\d+)?)\s*[°dD]\s*(?:(\d+(?:\.\d+)?)\s*[′m']\s*)?(?:(\d+(?:\.\d+)?)\s*[″s"”]\s*)?([NSEWnsew])?$/
/** 带方位字母的十进制度：116.4E / 39.9N */
const PLAIN_LETTER_RE = /^([NSEWnsew])\s*(-?\d+(?:\.\d+)?)$|^(-?\d+(?:\.\d+)?)\s*([NSEWnsew])$/

interface ParsedCoord {
  v: number
  dms: boolean
}

function parseCoordToken(raw: string): ParsedCoord | null {
  const s = raw.trim()
  if (!s) return null
  const dm = s.match(DMS_RE)
  if (dm) {
    const deg = Number(dm[2])
    const min = dm[3] ? Number(dm[3]) : 0
    const sec = dm[4] ? Number(dm[4]) : 0
    let v = deg + min / 60 + sec / 3600
    const letter = dm[1] || dm[5]
    if (letter && /[SWsw]/.test(letter)) v = -v
    return { v, dms: true }
  }
  const pm = s.match(PLAIN_LETTER_RE)
  if (pm) {
    const v = Number(pm[2] ?? pm[3])
    if (!isFinite(v)) return null
    const letter = (pm[1] || pm[4]) as string
    return { v: /[SWsw]/.test(letter) ? -Math.abs(v) : Math.abs(v), dms: false }
  }
  const n = Number(s)
  return isFinite(n) ? { v: n, dms: false } : null
}

interface ParsedLine {
  ok: boolean
  lng: number
  lat: number
  remark: string
  err: string
  dms: boolean
}

function failLine(err: string): ParsedLine {
  return { ok: false, lng: 0, lat: 0, remark: '', err, dms: false }
}

/** 解析一行：支持「备注|经度,纬度」「经度,纬度,备注」以及度分秒写法 */
function parseLine(line: string): ParsedLine {
  let coordPart = line
  let remark = ''
  const bar = line.indexOf('|')
  if (bar >= 0) {
    remark = line.slice(0, bar).trim()
    coordPart = line.slice(bar + 1)
  }
  let tokens = coordPart.split(/[,，、]+/).map((t) => t.trim()).filter((t) => t !== '')
  if (tokens.length === 1) {
    tokens = tokens[0].split(/\s+/).map((t) => t.trim()).filter((t) => t !== '')
  }
  if (tokens.length < 2) return failLine('格式无法解析，需要「经度,纬度」两个数值')
  const px = parseCoordToken(tokens[0])
  const py = parseCoordToken(tokens[1])
  if (!px || !py) return failLine('坐标数值无法解析')
  if (!remark && tokens.length >= 3) remark = tokens.slice(2).join(',').trim()
  if (Math.abs(px.v) > 180) return failLine('经度超出范围（-180 ~ 180）')
  if (Math.abs(py.v) > 90) return failLine('纬度超出范围（-90 ~ 90）')
  return { ok: true, lng: px.v, lat: py.v, remark, err: '', dms: px.dms || py.dms }
}

/* ==================== 状态与设置 ==================== */

const EXAMPLE = [
  '北京 · 天安门|116.403506,39.923958',
  '上海 · 人民广场|121.480391,31.236259',
  '广州 · 珠江新城|113.270862,23.135608',
  '西安 · 钟楼|108.966716,34.337115',
  '武汉 · 黄鹤楼|114.349573,30.579763',
].join('\n')

const MAX_CHARS = 10000
const inputText = ref(EXAMPLE)
const srcCrs = ref<CrsName>('BD09')
const outCrs = ref<CrsName[]>(['WGS84', 'GCJ02', 'BD09'])
const lonFirst = ref(true)
const digits = ref<6 | 8 | 15 | 'auto'>(6)

const placeholder =
  '一行一个坐标，格式：经度,纬度\n也可用「备注|经度,纬度」标注位置名称，支持度分秒写法\n如：116.41697388432341,39.90824735758896'

function toggleOutCrs(c: CrsName): void {
  const i = outCrs.value.indexOf(c)
  if (i >= 0) outCrs.value = outCrs.value.filter((x) => x !== c)
  else outCrs.value = [...outCrs.value, c]
}

function onSrcCrs(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  if (v === 'WGS84' || v === 'GCJ02' || v === 'BD09') srcCrs.value = v
}

/** 输出列：所选目标坐标系 + 源坐标系（置于 CRS 固定顺序） */
const cols = computed<CrsName[]>(() => {
  const wanted = CRS_ORDER.filter((c) => outCrs.value.includes(c))
  const valid = wanted.length ? wanted : [...CRS_ORDER]
  if (!valid.includes(srcCrs.value)) {
    return CRS_ORDER.filter((c) => c === srcCrs.value || valid.includes(c))
  }
  return valid
})

/* ==================== 结果计算 ==================== */

interface CoordRow {
  no: number
  remark: string
  ok: boolean
  err: string
  cells: { crs: CrsName; text: string }[]
  offsetM: number | null
}

function fmtNum(v: number): string {
  if (digits.value === 'auto') return String(Number(v.toFixed(7)))
  return v.toFixed(digits.value)
}

function fmtPair(p: LngLat): string {
  return lonFirst.value ? `${fmtNum(p[0])},${fmtNum(p[1])}` : `${fmtNum(p[1])},${fmtNum(p[0])}`
}

const rows = computed<CoordRow[]>(() => {
  const lines = inputText.value
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  const src = srcCrs.value
  return lines.map((line, i) => {
    const pl = parseLine(line)
    if (!pl.ok) {
      return { no: i + 1, remark: pl.remark, ok: false, err: pl.err, cells: [], offsetM: null }
    }
    const w = toWgs(src, [pl.lng, pl.lat])
    const cells = cols.value.map((crs) => ({
      crs,
      text: fmtPair(crs === src ? [pl.lng, pl.lat] : fromWgs(crs, w)),
    }))
    return { no: i + 1, remark: pl.remark, ok: true, err: '', cells, offsetM: geoDist(w, [pl.lng, pl.lat]) }
  })
})

const lineCount = computed(
  () => inputText.value.split(/[\r\n]+/).filter((s) => s.trim() !== '').length,
)
const validRows = computed(() => rows.value.filter((r) => r.ok))
const invalidRows = computed(() => rows.value.filter((r) => !r.ok))
const hasDms = computed(() =>
  inputText.value
    .split(/[\r\n]+/)
    .some((s) => s.trim() !== '' && parseLine(s.trim()).dms),
)

const offsetKm = computed(() => {
  const ok = validRows.value
  if (!ok.length) return { avg: '—', max: '—' }
  const ds = ok.map((r) => r.offsetM as number)
  const sum = ds.reduce((a, b) => a + b, 0)
  const max = Math.max(...ds)
  return {
    avg: `≈ ${(sum / ok.length / 1000).toFixed(2)} km`,
    max: `${(max / 1000).toFixed(2)} km`,
  }
})

/* ==================== 复制 / 导出 ==================== */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function copyRow(row: CoordRow): Promise<void> {
  if (!row.ok) return
  const ok = await copyText(row.cells.map((c) => c.text).join('\t'))
  if (ok) reportEvent('copy', effectiveSlug.value)
}

async function copyAll(): Promise<void> {
  const head = ['No.', '位置备注', ...cols.value.map((c) => (c === srcCrs.value ? `${c}（源）` : c))].join('\t')
  const lines = rows.value.map(
    (r) => `${r.no}\t${r.remark}\t${r.cells.map((c) => c.text).join('\t')}`,
  )
  const ok = await copyText([head, ...lines].join('\n'))
  if (ok) reportEvent('copy', effectiveSlug.value)
}

function exportCsv(): void {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const head = ['No.', '位置备注', ...cols.value.map((c) => (c === srcCrs.value ? `${c}（源）` : c)), '偏移量(m)']
  const lines = [head.join(',')]
  rows.value.forEach((r) => {
    const cells = r.ok
      ? [...r.cells.map((c) => c.text), r.offsetM === null ? '' : r.offsetM.toFixed(2)]
      : r.cells.map(() => '—').concat([r.err])
    lines.push([String(r.no), esc(r.remark), ...cells.map(esc)].join(','))
  })
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `geo-coordinate-converter-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  reportEvent('download', effectiveSlug.value)
}

function fillExample(): void {
  inputText.value = EXAMPLE
}

function clearInput(): void {
  inputText.value = ''
}

/* ==================== 使用上报：输入后 1.5s 防抖（每会话首次） ==================== */

let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false

function markUsed(): void {
  if (useReported) return
  useReported = true
  reportEvent('tool_use', effectiveSlug.value)
}

watch(inputText, (v) => {
  if (useReported || !v.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(markUsed, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 提示条 -->
    <div class="pz-tip">
      <span class="shrink-0" style="color: var(--pz-state-info)">
        <Info class="w-4 h-4" aria-hidden="true" />
      </span>
      <p class="text-sm" style="color: var(--pz-color-text-primary); line-height: 1.5">
        请确保输入的坐标为「经度,纬度」顺序，部分地图平台拾取的是「纬度,经度」，需要手动调整。默认源坐标系为
        <strong>BD09（百度）</strong>，转换后同时给出三种坐标系的值，可直接复制或导出
        CSV。支持十进制度与 39°54′18″ 度分秒写法，可在行首用「备注|」标注位置名称。
      </p>
    </div>

    <!-- 坐标输入 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <MapPin class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">坐标输入</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="fillExample">
            <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" /> 示例
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearInput">
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
          </button>
        </div>
      </div>
      <textarea v-model="inputText" class="pz-url-textarea" rows="6" spellcheck="false" :maxlength="MAX_CHARS" :placeholder="placeholder" aria-label="坐标批量输入"/>
      <div class="mt-3">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">坐标行数</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ lineCount }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">有效行</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ validRows.length }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">字符数</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ inputText.length }} / {{ MAX_CHARS }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">识别格式</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ lineCount === 0 ? '—' : hasDms ? '经度,纬度 / 度分秒' : '经度,纬度' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 转换设置 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <ArrowLeftRight class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">转换设置</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="lonFirst = true; digits = 6; outCrs = ['WGS84', 'GCJ02', 'BD09']">
            重置默认
          </button>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">源坐标系（输入坐标所属）</div>
          <div class="flex flex-col gap-1">
            <label
              v-for="crs in CRS_ORDER"
              :key="crs"
              class="pz-option-row pz-crs-opt"
              :data-active="srcCrs === crs"
            >
              <input
                type="radio"
                name="crs-src"
                class="pz-option-radio"
                :value="crs"
                :checked="srcCrs === crs"
                @change="onSrcCrs"
              >
              <span>
                <span class="t block">{{ crs }}</span>
                <span class="d block">{{ CRS_DESC[crs] }}</span>
              </span>
            </label>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出坐标系（可多选）</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="crs in CRS_ORDER"
                :key="crs"
                type="button"
                class="pz-chip"
                :data-active="outCrs.includes(crs)"
                @click="toggleOutCrs(crs)"
              >
                {{ crs }}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出顺序</div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="pz-mode-btn" :data-active="lonFirst" @click="lonFirst = true">经度,纬度</button>
              <button type="button" class="pz-mode-btn" :data-active="!lonFirst" @click="lonFirst = false">纬度,经度</button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">小数位数</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in ([6, 8, 15, 'auto'] as (6 | 8 | 15 | 'auto')[])"
                :key="String(opt)"
                type="button"
                class="pz-mode-btn"
                :data-active="digits === opt"
                @click="digits = opt"
              >
                {{ opt === 'auto' ? '自动' : `${opt} 位` }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-4 pt-4" style="border-top: 1px solid var(--pz-color-border-light)">
        <button type="button" class="pz-btn-primary whitespace-nowrap" style="padding: .25rem .75rem" @click="markUsed">
          <ArrowLeftRight class="w-3.5 h-3.5" aria-hidden="true" /> 马上转换
        </button>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="exportCsv">
          <Download class="w-3.5 h-3.5" aria-hidden="true" /> 导出 CSV
        </button>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyAll">
          <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制全部
        </button>
      </div>
    </div>

    <!-- 转换结果 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <MapPin class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">转换结果</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyAll">
            <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="exportCsv">
            <Download class="w-3.5 h-3.5" aria-hidden="true" /> 导出 CSV
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearInput">
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
          </button>
        </div>
      </div>
      <div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">转换行数</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ validRows.length }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">源坐标系</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ srcCrs }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">平均偏移</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ offsetKm.avg }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">最大偏移</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ offsetKm.max }}</span>
          </div>
        </div>
      </div>
      <div class="mt-4">
        <div class="pz-coord-tb">
          <table>
            <thead>
              <tr style="background: var(--pz-color-surface-2)">
                <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">No.</th>
                <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">位置备注</th>
                <th
                  v-for="crs in cols"
                  :key="crs"
                  class="text-left px-4 py-2 font-medium"
                  :class="{ 'col-src': crs === srcCrs }"
                  style="color: var(--pz-color-text-primary)"
                >
                  {{ crs === srcCrs ? `${crs}（源）` : crs }}
                </th>
                <th class="px-4 py-2" aria-hidden="true"/>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.no">
                <td class="idx">{{ row.no }}</td>
                <td style="color: var(--pz-color-text-secondary)">{{ row.remark }}</td>
                <template v-if="row.ok">
                  <td
                    v-for="cell in row.cells"
                    :key="cell.crs"
                    class="coord"
                    :class="{ 'col-src': cell.crs === srcCrs }"
                  >
                    {{ cell.text }}
                  </td>
                  <td style="text-align: right">
                    <button type="button" class="pz-coord-copy" :aria-label="`复制第 ${row.no} 行`" @click="copyRow(row)">
                      <Copy class="w-3 h-3" aria-hidden="true" />
                    </button>
                  </td>
                </template>
                <template v-else>
                  <td v-for="crs in cols" :key="crs" class="coord" style="color: var(--pz-color-text-tertiary)">—</td>
                  <td aria-hidden="true"/>
                </template>
              </tr>
              <tr v-if="rows.length === 0">
                <td :colspan="cols.length + 3" class="text-center py-6 text-xs" style="color: var(--pz-color-text-tertiary)">
                  暂无坐标，请在上方输入框粘贴坐标，每行一条
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="invalidRows.length" class="text-xs mt-3" style="color: var(--pz-state-error); line-height: 1.6">
          <span v-for="r in invalidRows" :key="r.no" class="block">第 {{ r.no }} 行：{{ r.err }}</span>
        </p>
        <p class="text-xs mt-3" style="color: var(--pz-color-text-tertiary); line-height: 1.6">
          偏移量为源坐标系与 WGS84 之间的球面距离估算值。带底色的一列为源坐标系原始值，未做改动。GCJ02
          与 WGS84 之间采用社区公开的近似算法，正向误差约 1～2 米，反向迭代后为厘米级；境外坐标不做偏移，原样返回。
        </p>
      </div>
    </div>

    <!-- 坐标拾取入口 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <Search class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">坐标拾取入口</h2>
        </div>
      </div>
      <div class="pz-pick">
        <span class="pz-pick-lab">各地图平台拾取器：</span>
        <a class="pz-chip" href="https://api.map.baidu.com/lbsapi/getpoint/index.html" target="_blank" rel="noopener noreferrer">百度坐标拾取</a>
        <a class="pz-chip" href="https://lbs.amap.com/tools/picker" target="_blank" rel="noopener noreferrer">高德坐标拾取</a>
        <a class="pz-chip" href="https://lbs.qq.com/getPoint/" target="_blank" rel="noopener noreferrer">腾讯坐标拾取</a>
      </div>
      <p class="text-xs mt-3" style="color: var(--pz-color-text-tertiary); line-height: 1.6">
        拾取到的坐标属于平台自身坐标系，回来转换时源坐标系要选对应的一项。
      </p>
    </div>
  </div>
</template>
