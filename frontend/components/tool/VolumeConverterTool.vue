<script setup lang="ts">
/**
 * VolumeConverterTool.vue - 体积单位换算器
 *
 * 支持公制、英美制共 21 种体积（容积）单位互转：
 * 任意单位输入，其余单位实时换算；浏览器本地计算不上传。
 */
import { ArrowUpDown, Box, Copy, Download, Info, RefreshCw, Trash2 } from 'lucide-vue-next'
import {
  convertUnitValue,
  formatConvertValue,
  parseConvertInput,
  type DecimalMode,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '体积单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线体积（容积）单位换算工具，覆盖公制与英美制共 21 种单位，支持升、毫升、加仑、盎司、桶装与工程方量互转，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '体积换算,容积单位,升,毫升,加仑,立方米,立方英尺,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'volume-converter')
const { reportEvent } = useAnalytics()

interface UnitDef {
  name: string
  symbol: string
  /** 1 该单位等于多少立方米 */
  toBase: number
}

const groups: { title: string; units: UnitDef[] }[] = [
  {
    title: '公制',
    units: [
      { name: '立方千米', symbol: 'km³', toBase: 1e9 },
      { name: '立方米', symbol: 'm³', toBase: 1 },
      { name: '立方分米', symbol: 'dm³', toBase: 0.001 },
      { name: '立方厘米', symbol: 'cm³', toBase: 1e-6 },
      { name: '立方毫米', symbol: 'mm³', toBase: 1e-9 },
      { name: '升', symbol: 'l', toBase: 0.001 },
      { name: '分升', symbol: 'dl', toBase: 0.0001 },
      { name: '厘升', symbol: 'cl', toBase: 0.00001 },
      { name: '毫升', symbol: 'ml', toBase: 1e-6 },
      { name: '微升', symbol: 'ul', toBase: 1e-9 },
      { name: '公石', symbol: 'hl', toBase: 0.1 },
    ],
  },
  {
    title: '英美制',
    units: [
      { name: '立方英尺', symbol: 'cu ft', toBase: 0.028316846592 },
      { name: '立方英寸', symbol: 'cu in', toBase: 0.000016387064 },
      { name: '立方码', symbol: 'cu yd', toBase: 0.764554857984 },
      { name: '亩英尺', symbol: 'acre-ft', toBase: 1233.48183754752 },
      { name: '英制加仑', symbol: 'uk gal', toBase: 0.00454609188 },
      { name: '美制加仑', symbol: 'us gal', toBase: 0.003785411784 },
      { name: '英制液体盎司', symbol: 'uk fl oz', toBase: 0.0000284130625 },
      { name: '美制液体盎司', symbol: 'us fl oz', toBase: 0.0000295735296 },
      { name: '美制夸脱', symbol: 'U.S. qt', toBase: 0.000946352946 },
      { name: '英制夸脱', symbol: 'Imp qt', toBase: 0.00113652297 },
    ],
  },
]

const allUnits = groups.flatMap((g) => g.units)
function findUnit(name: string): UnitDef {
  const u = allUnits.find((x) => x.name === name)
  return u || allUnits[1]
}

const sourceUnit = ref('立方米')
const rawValue = ref('1')
const decimals = ref<DecimalMode>('auto')
const outputStyle = ref<OutputStyle>('thousand')
const displayMode = ref<'grouped' | 'flat'>('grouped')
/** 加仑口径：换算对照中展示美制、英制还是两者 */
const gallonStyle = ref<'us' | 'uk' | 'both'>('us')

const parsed = computed(() => parseConvertInput(rawValue.value))

function convertDisplay(unit: UnitDef): string {
  const src = findUnit(sourceUnit.value)
  if (!unit || !src) return ''
  if (parsed.value === null) return ''
  return formatConvertValue(convertUnitValue(src, unit, parsed.value), decimals.value, outputStyle.value)
}

/** 展示单位（等式行），顺序按设计稿 bignum-eq 行，加仑随口径切换 */
const showcaseUnits = computed<string[]>(() => {
  if (gallonStyle.value === 'uk') return ['升', '英制加仑', '立方英尺']
  if (gallonStyle.value === 'both') return ['升', '美制加仑', '英制加仑', '立方英尺']
  return ['升', '美制加仑', '立方英尺']
})
const showcase = computed(() =>
  showcaseUnits.value.map((name) => {
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
  showcaseUnits.value.map((name) => {
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
    `体积单位换算结果（源：${src.name} ${src.symbol}，值：${rawValue.value}）`,
    ...allUnits.map((u) => `${u.name}(${u.symbol}) = ${convertDisplay(u)}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `volume-converter-${Date.now()}.txt`
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
          <Box class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
        <Box class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">加仑口径</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['us', '美制 US'], ['uk', '英制 UK'], ['both', '同时显示']] as ['us' | 'uk' | 'both', string][])"
              :key="opt[0]"
              type="button"
              class="pz-mode-btn"
              :data-active="gallonStyle === opt[0]"
              @click="gallonStyle = opt[0]"
            >
              {{ opt[1] }}
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
        <div v-for="(item, idx) in perOne" :key="item.unit.name" class="pz-eq-row" :data-hl="idx === 0">
          <span class="pz-eq-k">1 {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }})</span>
          <span class="pz-eq-v">{{ item.text }} {{ item.unit.name }}({{ item.unit.symbol }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 体积页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
