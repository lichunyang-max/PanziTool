<script setup lang="ts">
/**
 * CuboidCalculatorTool.vue - 矩形方体计算工具
 *
 * 输入长、宽、高即时计算棱长总和、表面积、体积与体对角线，
 * 支持立方体模式、三个面面积明细与容积换算；SVG 示意图随输入等比绘制。
 */
import { Box, Copy, Gauge, Hash, Info, SquareDashed, Trash2 } from 'lucide-vue-next'

useHead({
  titleTemplate: null,
  title: '矩形方体计算工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线矩形方体计算工具，输入长宽高即时算出棱长总和、表面积、体积与体对角线，支持立方体模式与容积换算，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '长方体计算器,体积计算,表面积,棱长总和,体对角线,立方体,容积换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'cuboid-calculator')
const { reportEvent } = useAnalytics()

/* ==================== 单位 ==================== */

type DimUnit = '毫米' | '厘米' | '米' | '分米' | '英寸' | '英尺' | '不指定'

const UNIT_OPTIONS: DimUnit[] = ['厘米', '毫米', '米', '分米', '英寸', '英尺', '不指定']
/** 单位 → 符号 */
const UNIT_SYM: Record<DimUnit, string> = {
  毫米: 'mm',
  厘米: 'cm',
  米: 'm',
  分米: 'dm',
  英寸: 'in',
  英尺: 'ft',
  不指定: '',
}
/** 单位立方 → 升的换算系数；不指定时不做容积换算 */
const UNIT_TO_LITER: Record<DimUnit, number | null> = {
  毫米: 1e-6,
  厘米: 1e-3,
  米: 1000,
  分米: 1,
  英寸: 0.016387064,
  英尺: 28.316846592,
  不指定: null,
}

/* ==================== 输入状态 ==================== */

const aStr = ref('30')
const bStr = ref('20')
const cStr = ref('10')
const unitA = ref<DimUnit>('厘米')
const unitB = ref<DimUnit>('厘米')
const unitC = ref<DimUnit>('厘米')
const digits = ref<2 | 4 | 6 | 'int'>(2)
const extraDiag = ref(true)
const extraFaces = ref(true)
const extraVolume = ref(true)
const shapeMode = ref<'cuboid' | 'cube'>('cuboid')

function numOf(s: string): number {
  const n = Number(s)
  return isFinite(n) && n > 0 ? n : 0
}

const numA = computed(() => numOf(aStr.value))
const numB = computed(() => numOf(bStr.value))
const numC = computed(() => numOf(cStr.value))

/** 显示单位取长 a 的口径（工具不做单位换算，三个输入应统一口径） */
const dispSym = computed(() => UNIT_SYM[unitA.value])

/** 立方体模式：宽高跟随长 */
watch(shapeMode, (m) => {
  if (m === 'cube') {
    bStr.value = aStr.value
    cStr.value = aStr.value
  }
})
watch(aStr, (v) => {
  if (shapeMode.value === 'cube') {
    bStr.value = v
    cStr.value = v
  }
})

/* ==================== 格式化 ==================== */

function groupInt(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtNum(v: number, digitsOpt: number | null = digits.value === 'int' ? null : digits.value): string {
  if (!isFinite(v)) return '—'
  let s = digitsOpt === null ? String(Math.round(v)) : v.toFixed(digitsOpt)
  const neg = s.startsWith('-')
  if (neg) s = s.slice(1)
  const [i, f] = s.split('.')
  s = groupInt(i) + (f !== undefined ? '.' + f : '')
  return (neg ? '-' : '') + s
}

function withUnit(v: number, suffix = ''): string {
  const n = fmtNum(v)
  return dispSym.value ? `${n} ${dispSym.value}${suffix}` : n
}

/** 容积升数显示：最多 4 位小数并去尾零，加千分位 */
function fmtLiters(l: number): string {
  const s = String(Number(l.toFixed(4)))
  const [i, f] = s.split('.')
  return groupInt(i) + (f !== undefined ? '.' + f : '')
}

/* ==================== 计算 ==================== */

const isCubeInput = computed(() => numA.value === numB.value && numB.value === numC.value)

const metrics = computed(() => {
  const a = numA.value
  const b = numB.value
  const c = numC.value
  return {
    sum: 4 * (a + b + c),
    area: 2 * (a * b + a * c + b * c),
    vol: a * b * c,
    diag: Math.sqrt(a * a + b * b + c * c),
    faceAb: a * b,
    faceAc: a * c,
    faceBc: b * c,
  }
})

const liters = computed(() => {
  const factor = UNIT_TO_LITER[unitA.value]
  return factor === null ? null : metrics.value.vol * factor
})

const faceState = computed(() => {
  if (isCubeInput.value) return '全等'
  const a = numA.value
  const b = numB.value
  const c = numC.value
  return a === b || a === c || b === c ? '有相等' : '两两不等'
})

/* ==================== SVG 示意（随输入等比绘制） ==================== */

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

const fig = computed(() => {
  // 基准：a=30 → 160px，c=10 → 80px，b=20 → 深度 (60,-42)px
  const x0 = 90
  const y0 = 190
  let w = clamp(numA.value * (160 / 30), 24, 300)
  let h = clamp(numC.value * (80 / 10), 20, 150)
  let dx = clamp(numB.value * (60 / 20), 14, 120)
  let dy = clamp(numB.value * (42 / 20), 10, 90)
  const s = Math.min(1, (320 - x0 - 26) / (w + dx), (y0 - 40) / (h + dy))
  w *= s
  h *= s
  dx *= s
  dy *= s

  const pt = (x: number, y: number) => `${x},${y}`
  const rect = (px: number, py: number) => [pt(px, py), pt(px + w, py), pt(px + w, py - h), pt(px, py - h)].join(' ')
  const front = rect(x0, y0)
  const right = [pt(x0 + w, y0), pt(x0 + w + dx, y0 - dy), pt(x0 + w + dx, y0 - dy - h), pt(x0 + w, y0 - h)].join(' ')
  const top = [pt(x0, y0 - h), pt(x0 + dx, y0 - h - dy), pt(x0 + w + dx, y0 - h - dy), pt(x0 + w, y0 - h)].join(' ')
  const backLeft = [pt(x0, y0), pt(x0 + dx, y0 - dy), pt(x0 + dx, y0 - dy - h), pt(x0, y0 - h)].join(' ')
  const back = rect(x0 + dx, y0 - dy)

  return {
    front,
    right,
    top,
    backLeft,
    back,
    d1: { x1: x0 + w, y1: y0, x2: x0 + w + dx, y2: y0 - dy },
    d2: { x1: x0 + w, y1: y0 - h, x2: x0 + w + dx, y2: y0 - h - dy },
    hlA: { x1: x0, y1: y0, x2: x0 + w, y2: y0 },
    hlB: { x1: x0, y1: y0, x2: x0 + dx, y2: y0 - dy },
    hlC: { x1: x0 + w, y1: y0, x2: x0 + w, y2: y0 - h },
    tick1: { x1: x0, y1: y0, x2: x0, y2: y0 + 22 },
    tick2: { x1: x0 + w, y1: y0, x2: x0 + w, y2: y0 + 22 },
    tick3: { x1: x0 + w, y1: y0, x2: x0 + w + 22, y2: y0 },
    tick4: { x1: x0 + w, y1: y0 - h, x2: x0 + w + 22, y2: y0 - h },
    dimA: { x: x0 + w / 2, y: y0 + 36, text: `长 a = ${aStr.value || 0}` },
    dimB: { x: x0 + dx / 2 - 8, y: y0 - dy / 2 + 17, text: `宽 b = ${bStr.value || 0}` },
    dimC: { x: x0 + w + 28, y: y0 - h / 2 + 4, text: `高 c = ${cStr.value || 0}` },
    labA: { x: x0 + 6, y: y0 - h - 6 },
    labB: { x: x0 + w + 6, y: y0 - h - 6 },
  }
})

/* ==================== 动作 ==================== */

function cubeMode(): void {
  shapeMode.value = 'cube'
}

function clearAll(): void {
  aStr.value = ''
  bStr.value = ''
  cStr.value = ''
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function copyResult(): Promise<void> {
  const m = metrics.value
  const lines = [
    `矩形方体计算结果（长 ${aStr.value || 0} × 宽 ${bStr.value || 0} × 高 ${cStr.value || 0} ${unitA.value}）`,
    `棱长总和 L = ${withUnit(m.sum)}`,
    `表面积 S = ${withUnit(m.area, '²')}`,
    `体积 V = ${withUnit(m.vol, '³')}`,
    `体对角线 d = ${withUnit(m.diag)}`,
  ]
  if (liters.value !== null) lines.push(`容积 = ${withUnit(m.vol, '³')} = ${fmtLiters(liters.value)} L`)
  const ok = await copyText(lines.join('\n'))
  if (ok) reportEvent('copy', effectiveSlug.value)
}

/* ==================== 使用上报：输入后 1.5s 防抖（每会话首次） ==================== */

let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false

function markUsed(): void {
  if (useReported) return
  useReported = true
  reportEvent('tool_use', effectiveSlug.value)
}

watch([aStr, bStr, cStr], () => {
  if (useReported) return
  if (!aStr.value.trim() && !bStr.value.trim() && !cStr.value.trim()) return
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
        输入长、宽、高即可计算长方体或立方体的棱长总和、表面积、体积，结果四舍五入保留两位小数。工具本身不处理单位换算，请先统一三个数值的单位，结果的平方与立方单位自行补充。
      </p>
    </div>

    <!-- 尺寸输入 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <Box class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">尺寸输入</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="cubeMode">
            立方体模式
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearAll">
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
          </button>
        </div>
      </div>
      <div class="pz-axes">
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">长 a</span>
          <div class="flex gap-2">
            <input
              v-model="aStr"
              type="number"
              class="pz-input"
              min="0"
              step="any"
              style="font-family: var(--pz-font-mono)"
              aria-label="长 a"
            >
            <select v-model="unitA" class="pz-input" style="width: 6.5rem; flex: none" aria-label="长 a 单位">
              <option v-for="u in UNIT_OPTIONS" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <span class="text-[11px]" style="color: var(--pz-color-text-tertiary); line-height: 1.5">底面较长的一条边</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">宽 b</span>
          <div class="flex gap-2">
            <input
              v-model="bStr"
              type="number"
              class="pz-input"
              min="0"
              step="any"
              style="font-family: var(--pz-font-mono)"
              aria-label="宽 b"
            >
            <select v-model="unitB" class="pz-input" style="width: 6.5rem; flex: none" aria-label="宽 b 单位">
              <option v-for="u in UNIT_OPTIONS" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <span class="text-[11px]" style="color: var(--pz-color-text-tertiary); line-height: 1.5">底面较短的一条边</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">高 c</span>
          <div class="flex gap-2">
            <input
              v-model="cStr"
              type="number"
              class="pz-input"
              min="0"
              step="any"
              style="font-family: var(--pz-font-mono)"
              aria-label="高 c"
            >
            <select v-model="unitC" class="pz-input" style="width: 6.5rem; flex: none" aria-label="高 c 单位">
              <option v-for="u in UNIT_OPTIONS" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <span class="text-[11px]" style="color: var(--pz-color-text-tertiary); line-height: 1.5">垂直于底面的边</span>
        </div>
      </div>
      <div class="mt-3">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">形状判定</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ isCubeInput ? '立方体' : '长方体' }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">三个面</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ faceState }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">单位</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ unitA }}{{ dispSym ? ' ' + dispSym : '' }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">体对角线</span>
            <span class="text-sm font-semibold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)">{{ withUnit(metrics.diag) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 形状示意 + 计算设置 -->
    <div class="grid md:grid-cols-2 gap-4">
      <div class="pz-card p-4">
        <div class="pz-card-head">
          <div class="flex items-center gap-2">
            <SquareDashed class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
            <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">形状示意</h2>
          </div>
        </div>
        <div class="pz-figure">
          <svg viewBox="0 0 320 235" width="320" height="235" role="img" aria-label="长方体示意图">
            <polygon class="pz-fig-face" :points="fig.front" />
            <polygon class="pz-fig-face" :points="fig.right" />
            <polygon class="pz-fig-face" :points="fig.top" />
            <polygon class="pz-fig-edge" :points="fig.front" />
            <polygon class="pz-fig-edge" :points="fig.backLeft" />
            <polygon class="pz-fig-edge" :points="fig.back" />
            <line class="pz-fig-edge" :x1="fig.d1.x1" :y1="fig.d1.y1" :x2="fig.d1.x2" :y2="fig.d1.y2" />
            <line class="pz-fig-edge" :x1="fig.d2.x1" :y1="fig.d2.y1" :x2="fig.d2.x2" :y2="fig.d2.y2" />
            <line class="pz-fig-edge-hl" :x1="fig.hlA.x1" :y1="fig.hlA.y1" :x2="fig.hlA.x2" :y2="fig.hlA.y2" />
            <line class="pz-fig-edge-hl" :x1="fig.hlB.x1" :y1="fig.hlB.y1" :x2="fig.hlB.x2" :y2="fig.hlB.y2" />
            <line class="pz-fig-edge-hl" :x1="fig.hlC.x1" :y1="fig.hlC.y1" :x2="fig.hlC.x2" :y2="fig.hlC.y2" />
            <line class="pz-fig-tick" :x1="fig.tick1.x1" :y1="fig.tick1.y1" :x2="fig.tick1.x2" :y2="fig.tick1.y2" />
            <line class="pz-fig-tick" :x1="fig.tick2.x1" :y1="fig.tick2.y1" :x2="fig.tick2.x2" :y2="fig.tick2.y2" />
            <line class="pz-fig-tick" :x1="fig.tick3.x1" :y1="fig.tick3.y1" :x2="fig.tick3.x2" :y2="fig.tick3.y2" />
            <line class="pz-fig-tick" :x1="fig.tick4.x1" :y1="fig.tick4.y1" :x2="fig.tick4.x2" :y2="fig.tick4.y2" />
            <text class="pz-fig-dim" :x="fig.dimA.x" :y="fig.dimA.y" text-anchor="middle">{{ fig.dimA.text }}</text>
            <text class="pz-fig-dim" :x="fig.dimC.x" :y="fig.dimC.y" text-anchor="start">{{ fig.dimC.text }}</text>
            <text class="pz-fig-dim" :x="fig.dimB.x" :y="fig.dimB.y" text-anchor="end">{{ fig.dimB.text }}</text>
            <text class="pz-fig-lab" :x="fig.labA.x" :y="fig.labA.y">A</text>
            <text class="pz-fig-lab" :x="fig.labB.x" :y="fig.labB.y">B</text>
          </svg>
        </div>
        <p class="text-xs mt-2" style="color: var(--pz-color-text-tertiary); line-height: 1.6">
          示意图按输入数值等比绘制，改动长宽高时标注同步更新。高亮的三条棱分别对应长、宽、高。
        </p>
      </div>

      <div class="pz-card p-4">
        <div class="pz-card-head">
          <div class="flex items-center gap-2">
            <Gauge class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
            <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">计算设置</h2>
          </div>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">小数位数</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in ([2, 4, 6, 'int'] as (2 | 4 | 6 | 'int')[])"
                :key="String(opt)"
                type="button"
                class="pz-mode-btn"
                :data-active="digits === opt"
                @click="digits = opt"
              >
                {{ opt === 'int' ? '整数' : `${opt} 位` }}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">附加结果</div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="pz-chip" :data-active="extraDiag" @click="extraDiag = !extraDiag">体对角线</button>
              <button type="button" class="pz-chip" :data-active="extraFaces" @click="extraFaces = !extraFaces">三个面面积</button>
              <button type="button" class="pz-chip" :data-active="extraVolume" @click="extraVolume = !extraVolume">容积换算</button>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">形状模式</div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="pz-mode-btn" :data-active="shapeMode === 'cuboid'" @click="shapeMode = 'cuboid'">长方体</button>
              <button type="button" class="pz-mode-btn" :data-active="shapeMode === 'cube'" @click="shapeMode = 'cube'">立方体</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 pt-1" style="border-top: 1px solid var(--pz-color-border-light)">
            <button type="button" class="pz-btn-primary whitespace-nowrap" style="padding: .25rem .75rem" @click="markUsed">
              <Hash class="w-3.5 h-3.5" aria-hidden="true" /> 计算
            </button>
            <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyResult">
              <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制结果
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 计算结果 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <Hash class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">计算结果</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyResult">
            <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearAll">
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
          </button>
        </div>
      </div>
      <div class="pz-metric3">
        <div class="pz-metric-cell">
          <span class="pz-metric-lab">棱长总和 L</span>
          <span class="pz-metric-val">{{ fmtNum(metrics.sum) }}</span>
          <span class="pz-metric-unit">{{ dispSym }}</span>
        </div>
        <div class="pz-metric-cell">
          <span class="pz-metric-lab">表面积 S</span>
          <span class="pz-metric-val">{{ fmtNum(metrics.area) }}</span>
          <span class="pz-metric-unit">{{ dispSym }}²</span>
        </div>
        <div class="pz-metric-cell" data-hl="true">
          <span class="pz-metric-lab">体积 V</span>
          <span class="pz-metric-val">{{ fmtNum(metrics.vol) }}</span>
          <span class="pz-metric-unit">{{ dispSym }}³</span>
        </div>
      </div>
      <div class="mt-4">
        <div class="pz-kv">
          <div v-if="extraDiag" class="pz-kv-row">
            <span class="pz-kv-k">体对角线 d = √(a²+b²+c²)</span>
            <span class="pz-kv-v">{{ withUnit(metrics.diag) }}</span>
          </div>
          <div v-if="extraFaces" class="pz-kv-row">
            <span class="pz-kv-k">底面 长 × 宽（a·b）</span>
            <span class="pz-kv-v">{{ withUnit(metrics.faceAb, '²') }}</span>
          </div>
          <div v-if="extraFaces" class="pz-kv-row">
            <span class="pz-kv-k">正面 长 × 高（a·c）</span>
            <span class="pz-kv-v">{{ withUnit(metrics.faceAc, '²') }}</span>
          </div>
          <div v-if="extraFaces" class="pz-kv-row">
            <span class="pz-kv-k">侧面 宽 × 高（b·c）</span>
            <span class="pz-kv-v">{{ withUnit(metrics.faceBc, '²') }}</span>
          </div>
          <div v-if="extraVolume && liters !== null" class="pz-kv-row" data-hl="true">
            <span class="pz-kv-k">容积（按{{ unitA }}计）</span>
            <span class="pz-kv-v">{{ withUnit(metrics.vol, '³') }} = {{ fmtLiters(liters) }} L</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 计算公式 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <Hash class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">计算公式</h2>
        </div>
      </div>
      <div class="text-xs font-semibold mb-2" style="color: var(--pz-color-text-secondary)">长方体（长 a、宽 b、高 c）</div>
      <div class="pz-formula">
        <div class="pz-formula-row">
          <span class="pz-formula-k">棱长总和</span>
          <span class="pz-formula-v">L = (a + b + c) × 4</span>
          <span class="pz-formula-r">{{ withUnit(metrics.sum) }}</span>
        </div>
        <div class="pz-formula-row">
          <span class="pz-formula-k">表面积</span>
          <span class="pz-formula-v">S = (a·b + a·c + b·c) × 2</span>
          <span class="pz-formula-r">{{ withUnit(metrics.area, '²') }}</span>
        </div>
        <div class="pz-formula-row">
          <span class="pz-formula-k">体积</span>
          <span class="pz-formula-v">V = a × b × c</span>
          <span class="pz-formula-r">{{ withUnit(metrics.vol, '³') }}</span>
        </div>
        <div class="pz-formula-row">
          <span class="pz-formula-k">体对角线</span>
          <span class="pz-formula-v">d = √(a² + b² + c²)</span>
          <span class="pz-formula-r">{{ withUnit(metrics.diag) }}</span>
        </div>
      </div>
      <div class="text-xs font-semibold mb-2 mt-4" style="color: var(--pz-color-text-secondary)">立方体（棱长 a，三边相等）</div>
      <div class="pz-formula">
        <div class="pz-formula-row">
          <span class="pz-formula-k">棱长总和</span>
          <span class="pz-formula-v">L = 12a</span>
          <span class="pz-formula-r">{{ withUnit(12 * numA) }}</span>
        </div>
        <div class="pz-formula-row">
          <span class="pz-formula-k">表面积</span>
          <span class="pz-formula-v">S = 6a²</span>
          <span class="pz-formula-r">{{ withUnit(6 * numA * numA, '²') }}</span>
        </div>
        <div class="pz-formula-row">
          <span class="pz-formula-k">体积</span>
          <span class="pz-formula-v">V = a³</span>
          <span class="pz-formula-r">{{ withUnit(numA * numA * numA, '³') }}</span>
        </div>
        <div class="pz-formula-row">
          <span class="pz-formula-k">体对角线</span>
          <span class="pz-formula-v">d = √3 · a ≈ 1.732a</span>
          <span class="pz-formula-r">{{ withUnit(Math.sqrt(3) * numA) }}</span>
        </div>
      </div>
      <p class="text-xs mt-3" style="color: var(--pz-color-text-tertiary); line-height: 1.6">
        立方体一栏按当前长 a = {{ aStr || 0 }}{{ dispSym ? ' ' + dispSym : '' }} 代入，仅作公式对照；把三个输入框填成相同数值即可得到立方体的实际结果。
      </p>
    </div>
  </div>
</template>
