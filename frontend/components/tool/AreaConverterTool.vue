<script setup lang="ts">
/**
 * AreaConverterTool.vue - 面积单位换算器
 *
 * 支持公制、英制、市制共 18 种面积单位互转：
 * 任意单位输入，其余单位实时换算；浏览器本地计算不上传。
 */
import { ArrowUpDown, Copy, Download, Info, RefreshCw, SquareDashed, Trash2 } from 'lucide-vue-next'
import {
  convertUnitValue,
  formatConvertValue,
  parseConvertInput,
  type DecimalMode,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '面积单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线面积单位换算工具，覆盖公制、英制、市制共 18 种面积单位，支持公顷、亩、英亩等农林与地产常用单位互转，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '面积换算,面积单位,平方米,公顷,亩,英亩,平方英尺,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'area-converter')
const { reportEvent } = useAnalytics()

interface UnitDef {
  name: string
  symbol: string
  /** 1 该单位等于多少平方米 */
  toBase: number
}

const groups: { title: string; units: UnitDef[] }[] = [
  {
    title: '公制',
    units: [
      { name: '平方千米', symbol: 'km²', toBase: 1000000 },
      { name: '平方米', symbol: 'm²', toBase: 1 },
      { name: '平方分米', symbol: 'dm²', toBase: 0.01 },
      { name: '平方厘米', symbol: 'cm²', toBase: 0.0001 },
      { name: '平方毫米', symbol: 'mm²', toBase: 1e-6 },
      { name: '公顷', symbol: 'ha', toBase: 10000 },
      { name: '公亩', symbol: 'are', toBase: 100 },
    ],
  },
  {
    title: '英制',
    units: [
      { name: '平方英里', symbol: 'sq.mi', toBase: 2589988.110336 },
      { name: '平方英尺', symbol: 'sq.ft', toBase: 0.09290304 },
      { name: '平方英寸', symbol: 'sq.in', toBase: 0.00064516 },
      { name: '英亩', symbol: 'acre', toBase: 4046.8564224 },
      { name: '平方码', symbol: 'sq.yd', toBase: 0.83612736 },
      { name: '平方竿', symbol: 'sq.rd', toBase: 25.29285264 },
    ],
  },
  {
    title: '市制',
    units: [
      { name: '顷', symbol: '市顷', toBase: 200000 / 3 },
      { name: '亩', symbol: '市亩', toBase: 2000 / 3 },
      { name: '分', symbol: '市分', toBase: 200 / 3 },
      { name: '平方尺', symbol: 'sq.chi', toBase: 1 / 9 },
      { name: '平方寸', symbol: 'sq.cun', toBase: 1 / 900 },
    ],
  },
]

const allUnits = groups.flatMap((g) => g.units)
function findUnit(name: string): UnitDef {
  const u = allUnits.find((x) => x.name === name)
  return u || allUnits[1]
}

const sourceUnit = ref('公顷')
const rawValue = ref('1')
const decimals = ref<DecimalMode>('auto')
const outputStyle = ref<OutputStyle>('thousand')
const displayMode = ref<'grouped' | 'flat'>('grouped')
/** 常用目标：换算对照大字展示的目标单位 */
const featuredUnit = ref('平方米')

const parsed = computed(() => parseConvertInput(rawValue.value))

function convertDisplay(unit: UnitDef): string {
  const src = findUnit(sourceUnit.value)
  if (!unit || !src) return ''
  if (parsed.value === null) return ''
  return formatConvertValue(convertUnitValue(src, unit, parsed.value), decimals.value, outputStyle.value)
}

/** 展示单位（等式行），顺序按设计稿 bignum-eq 行 */
const showcaseUnits = ['平方米', '亩', '英亩']
const showcase = computed(() =>
  showcaseUnits.map((name) => {
    const unit = findUnit(name)
    const v = parsed.value === null ? null : convertUnitValue(findUnit(sourceUnit.value), unit, parsed.value)
    return {
      name: unit.name,
      symbol: unit.symbol,
      value: v === null ? '—' : formatConvertValue(v, decimals.value, outputStyle.value),
    }
  }),
)

/** 常用目标单位的大字展示 */
const featuredShowcase = computed(() => {
  const unit = findUnit(featuredUnit.value)
  const v = parsed.value === null ? null : convertUnitValue(findUnit(sourceUnit.value), unit, parsed.value)
  return {
    name: unit.name,
    symbol: unit.symbol,
    value: v === null ? '—' : formatConvertValue(v, decimals.value, outputStyle.value),
  }
})

/** 1 源单位等于各展示单位的值（用于等式行） */
const perOne = computed(() =>
  showcaseUnits.map((name) => {
    const unit = findUnit(name)
    const v = convertUnitValue(findUnit(sourceUnit.value), unit, 1)
    return { unit, text: formatConvertValue(v, 'auto', 'plain') }
  }),
)

const tipText = computed(() => {
  const src = findUnit(sourceUnit.value)
  return `当前输入单位为 ${src.name}(${src.symbol})，值 ${rawValue.value || '0'}。在任意单位输入框填写数值，其余单位实时换算。`
})

function resetOne() {
  rawValue.value = '1'
  reportEvent('tool_use', effectiveSlug.value)
}
function clearAll() {
  rawValue.value = ''
}

// 工具使用上报：输入后 1.5s 防抖（每次会话首次触发）
let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(rawValue, (v) => {
  if (useReported || !v.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})

function onUnitCopy() {
  reportEvent('copy', effectiveSlug.value)
}

/** 复制全部换算结果 */
async function copyAll() {
  const lines = allUnits.map((u) => `${u.name}(${u.symbol})\t${convertDisplay(u)}`)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    reportEvent('copy', effectiveSlug.value)
  } catch {
    // 静默忽略
  }
}

/** 导出 TXT */
function exportTxt() {
  const src = findUnit(sourceUnit.value)
  const lines = [
    `面积单位换算结果（源：${src.name} ${src.symbol}，值：${rawValue.value}）`,
    ...allUnits.map((u) => `${u.name}(${u.symbol}) = ${convertDisplay(u)}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `area-converter-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  reportEvent('download', effectiveSlug.value)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 提示条 -->
    <div class="pz-tip">
      <span class="shrink-0" style="color: var(--pz-state-info)">
        <Info class="w-4 h-4" aria-hidden="true" />
      </span>
      <p class="text-sm" style="color: var(--pz-color-text-primary); line-height: 1.5">
        {{ tipText }}
      </p>
    </div>

    <!-- 单位换算 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <SquareDashed class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">单位换算</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="resetOne">
            <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" /> 重置为 1
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearAll">
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
          </button>
        </div>
      </div>
      <ToolConvertUnitGrid
        v-model:model-value="rawValue"
        v-model:source-unit="sourceUnit"
        :groups="groups"
        :convert-display="convertDisplay"
        :mode="displayMode"
        @copy="onUnitCopy"
      />
    </div>

    <!-- 换算设置 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <SquareDashed class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">换算设置</h2>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">小数位数</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['auto', '自动'], [2, '2 位'], [4, '4 位'], [6, '6 位'], [8, '8 位']] as [DecimalMode, string][])"
              :key="String(opt[0])"
              type="button"
              class="pz-mode-btn"
              :data-active="decimals === opt[0]"
              @click="decimals = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出格式</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['plain', '普通数字'], ['scientific', '科学计数法'], ['thousand', '千分位分隔']] as [OutputStyle, string][])"
              :key="opt[0]"
              type="button"
              class="pz-mode-btn"
              :data-active="outputStyle === opt[0]"
              @click="outputStyle = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">分组显示</div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="pz-mode-btn" :data-active="displayMode === 'grouped'" @click="displayMode = 'grouped'">按单位制分组</button>
            <button type="button" class="pz-mode-btn" :data-active="displayMode === 'flat'" @click="displayMode = 'flat'">单列全部</button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">常用目标</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="name in (['平方米', '亩', '英亩', '平方英尺'] as string[])"
              :key="name"
              type="button"
              class="pz-mode-btn"
              :data-active="featuredUnit === name"
              @click="featuredUnit = name"
            >
              {{ name }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 换算对照 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <ArrowUpDown class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">换算对照</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyAll">
            <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制全部
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="exportTxt">
            <Download class="w-3.5 h-3.5" aria-hidden="true" /> 导出 TXT
          </button>
        </div>
      </div>
      <div class="pz-bignum mb-4">
        <span class="pz-bignum-val">{{ featuredShowcase.value }}</span>
        <span class="pz-bignum-unit">{{ featuredShowcase.name }}({{ featuredShowcase.symbol }})</span>
        <span class="pz-bignum-eq">
          {{ rawValue || '0' }} {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }}) =
          {{ showcase.map((s) => `${s.value} ${s.name}(${s.symbol})`).join(' = ') }}
        </span>
      </div>
      <div class="text-xs font-semibold mb-2 mt-1" style="color: var(--pz-color-text-secondary)">
        1 {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }}) 等于
      </div>
      <div class="pz-eq">
        <div v-for="(item, idx) in perOne" :key="item.unit.name" class="pz-eq-row" :data-hl="idx === 1">
          <span class="pz-eq-k">1 {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }})</span>
          <span class="pz-eq-v">{{ item.text }} {{ item.unit.name }}({{ item.unit.symbol }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 面积页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
