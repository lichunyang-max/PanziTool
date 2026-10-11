<script setup lang="ts">
/**
 * PressureConverterTool.vue - 压力单位换算器
 *
 * 覆盖国际单位、英制、医学与其他常用单位共 14 种压力单位互转
 * （以千帕为基准）：任意单位输入，其余单位实时换算；浏览器本地计算不上传。
 */
import { Copy, Download, Gauge, Info, RefreshCw, Trash2 } from 'lucide-vue-next'
import {
  convertUnitValue,
  formatConvertValue,
  parseConvertInput,
  type DecimalMode,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '压力单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线压力单位换算工具，覆盖国际单位、英制、医学与其他常用单位共 14 种，支持 MPa、psi、bar、mmHg、kgf/cm² 互转，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '压力换算,压强单位,MPa,psi,bar,mmHg,千帕,帕斯卡,标准大气压,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'pressure-converter')
const { reportEvent } = useAnalytics()

interface UnitDef {
  name: string
  symbol: string
  /** 1 该单位等于多少千帕 */
  toBase: number
}

const groups: { title: string; units: UnitDef[] }[] = [
  {
    title: '国际单位',
    units: [
      { name: '兆帕', symbol: 'MPa', toBase: 1000 },
      { name: '帕斯卡', symbol: 'Pa', toBase: 0.001 },
      { name: '百帕', symbol: 'hPa', toBase: 0.1 },
      { name: '千帕', symbol: 'kPa', toBase: 1 },
    ],
  },
  {
    title: '英制单位',
    units: [
      { name: '磅力/平方英寸', symbol: 'psi', toBase: 6.89475729 },
      { name: '磅力/平方英尺', symbol: 'psf', toBase: 0.047880259 },
    ],
  },
  {
    title: '医学单位',
    units: [
      { name: '毫米汞柱', symbol: 'mmHg', toBase: 0.133322387 },
      { name: '英寸汞柱', symbol: 'inHg', toBase: 3.38638864 },
      { name: '毫米水柱', symbol: 'mmH₂O', toBase: 0.00980665 },
    ],
  },
  {
    title: '其他',
    units: [
      { name: '标准大气压', symbol: 'atm', toBase: 101.325 },
      { name: '巴', symbol: 'bar', toBase: 100 },
      { name: '毫巴', symbol: 'mbar', toBase: 0.1 },
      { name: '公斤力/平方厘米', symbol: 'kgf/cm²', toBase: 98.0665 },
      { name: '公斤力/平方米', symbol: 'kgf/m²', toBase: 0.00980665 },
    ],
  },
]

const allUnits = groups.flatMap((g) => g.units)
function findUnit(name: string): UnitDef {
  const u = allUnits.find((x) => x.name === name)
  return u || allUnits[0]
}

const sourceUnit = ref('千帕')
const rawValue = ref('101.325')
const decimals = ref<DecimalMode>('auto')
const outputStyle = ref<OutputStyle>('thousand')
const displayMode = ref<'grouped' | 'flat'>('grouped')

const parsed = computed(() => parseConvertInput(rawValue.value))

function convertDisplay(unit: UnitDef): string {
  const src = findUnit(sourceUnit.value)
  if (!unit || !src) return ''
  if (parsed.value === null) return ''
  return formatConvertValue(convertUnitValue(src, unit, parsed.value), decimals.value, outputStyle.value)
}

/** 展示单位（大数值结果与等式行），顺序按设计稿 bignum-eq 行 */
const showcaseUnits = ['标准大气压', '巴', '毫米汞柱', '磅力/平方英寸']
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

/** 常用压力换算关系（静态参考数据，按设计稿；与源单位相关的等式行已覆盖的不再重复） */
const fixedRows: [string, string][] = [
  ['1 巴(bar)', '100,000 Pa = 100 kPa'],
  ['1 巴(bar)', '14.5037738 psi'],
  ['1 兆帕(MPa)', '10 bar = 145.037738 psi'],
  ['1 psi', '6.89475729 kPa'],
  ['1 psi', '0.0689475729 bar'],
  ['1 kgf/cm²', '98.0665 kPa = 0.980665 bar'],
]

/** 重置为 1 标准大气压（按当前源单位换算出对应数值） */
function resetOne() {
  rawValue.value = formatConvertValue(convertUnitValue(findUnit('标准大气压'), findUnit(sourceUnit.value), 1), 'auto', 'plain')
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

/** 复制常用压力换算关系 */
async function copyFixed() {
  try {
    await navigator.clipboard.writeText(fixedRows.map((r) => `${r[0]}\t${r[1]}`).join('\n'))
    reportEvent('copy', effectiveSlug.value)
  } catch {
    // 静默忽略
  }
}

/** 导出 TXT */
function exportTxt() {
  const src = findUnit(sourceUnit.value)
  const lines = [
    `压力单位换算结果（源：${src.name} ${src.symbol}，值：${rawValue.value}）`,
    ...allUnits.map((u) => `${u.name}(${u.symbol}) = ${convertDisplay(u)}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pressure-converter-${Date.now()}.txt`
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
          <Gauge class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">单位换算</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="resetOne">
            <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" /> 重置为 1 atm
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
        <Gauge class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
      </div>
    </div>

    <!-- 换算对照 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <RefreshCw class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
        <span class="pz-bignum-val">{{ showcase[0]?.value }}</span>
        <span class="pz-bignum-unit">{{ showcase[0]?.name }}({{ showcase[0]?.symbol }})</span>
        <span class="pz-bignum-eq">
          {{ rawValue || '0' }} {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }}) =
          {{ showcase.map((s) => `${s.value} ${s.name}(${s.symbol})`).join(' = ') }}
        </span>
      </div>
      <div class="text-xs font-semibold mb-2 mt-1" style="color: var(--pz-color-text-secondary)">
        1 {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }}) 等于
      </div>
      <div class="pz-eq">
        <div v-for="(item, idx) in perOne" :key="item.unit.name" class="pz-eq-row" :data-hl="idx === 3">
          <span class="pz-eq-k">1 {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }})</span>
          <span class="pz-eq-v">{{ item.text }} {{ item.unit.name }}({{ item.unit.symbol }})</span>
        </div>
        <div v-for="(row, idx) in fixedRows" :key="`fixed-${idx}`" class="pz-eq-row">
          <span class="pz-eq-k">{{ row[0] }}</span>
          <span class="pz-eq-v">{{ row[1] }}</span>
        </div>
      </div>
      <div class="flex justify-end mt-3">
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyFixed">
          <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制换算关系
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 压力页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
