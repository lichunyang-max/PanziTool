<script setup lang="ts">
/**
 * LengthConverterTool.vue - 长度单位换算器
 *
 * 支持公制、英制、市制共 24 种长度单位互转：
 * 任意单位输入，其余单位实时换算；浏览器本地计算不上传。
 */
import { Copy, Download, Info, RefreshCw, Ruler, Trash2 } from 'lucide-vue-next'
import {
  convertUnitValue,
  formatConvertValue,
  parseConvertInput,
  type DecimalMode,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '长度单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线长度单位换算工具，支持公制、英制、市制共 24 种长度单位互转，输入任意一个单位其余全部实时换算，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '长度换算,长度单位,米,英尺,英寸,公里,海里,市尺,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'length-converter')
const { reportEvent } = useAnalytics()

interface UnitDef {
  name: string
  symbol: string
  /** 1 该单位等于多少米 */
  toBase: number
}

const groups: { title: string; units: UnitDef[] }[] = [
  {
    title: '公制',
    units: [
      { name: '千米', symbol: 'km', toBase: 1000 },
      { name: '米', symbol: 'm', toBase: 1 },
      { name: '分米', symbol: 'dm', toBase: 0.1 },
      { name: '厘米', symbol: 'cm', toBase: 0.01 },
      { name: '毫米', symbol: 'mm', toBase: 0.001 },
      { name: '丝', symbol: '机械尺寸', toBase: 0.00001 },
      { name: '微米', symbol: 'um', toBase: 1e-6 },
      { name: '纳米', symbol: 'nm', toBase: 1e-9 },
      { name: '皮米', symbol: 'pm', toBase: 1e-12 },
    ],
  },
  {
    title: '英制',
    units: [
      { name: '英寸', symbol: 'in', toBase: 0.0254 },
      { name: '英尺', symbol: 'ft', toBase: 0.3048 },
      { name: '英里', symbol: 'mi', toBase: 1609.344 },
      { name: '海里', symbol: 'nmi', toBase: 1852 },
      { name: '英寻', symbol: 'fm', toBase: 1.8288 },
      { name: '弗隆', symbol: 'fur', toBase: 201.168 },
      { name: '码', symbol: 'yd', toBase: 0.9144 },
      { name: '密耳', symbol: 'mil', toBase: 0.0000254 },
    ],
  },
  {
    title: '市制',
    units: [
      { name: '里', symbol: '市里', toBase: 500 },
      { name: '丈', symbol: '市丈', toBase: 10 / 3 },
      { name: '尺', symbol: '市尺', toBase: 1 / 3 },
      { name: '寸', symbol: '市寸', toBase: 1 / 30 },
      { name: '分', symbol: '市分', toBase: 1 / 300 },
      { name: '厘', symbol: '市厘', toBase: 1 / 3000 },
      { name: '毫', symbol: '市毫', toBase: 1 / 30000 },
    ],
  },
]

const allUnits = groups.flatMap((g) => g.units)
function findUnit(name: string): UnitDef {
  const u = allUnits.find((x) => x.name === name)
  return u || allUnits[1]
}

const sourceUnit = ref('米')
const rawValue = ref('1')
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

/** 展示单位（大数值结果与等式） */
const showcaseUnits = ['英尺', '英寸', '尺']
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
    `长度单位换算结果（源：${src.name} ${src.symbol}，值：${rawValue.value}）`,
    ...allUnits.map((u) => `${u.name}(${u.symbol}) = ${convertDisplay(u)}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `length-converter-${Date.now()}.txt`
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
          <Ruler class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
        <Ruler class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
        <div v-for="(item, idx) in perOne" :key="item.unit.name" class="pz-eq-row" :data-hl="idx === 2">
          <span class="pz-eq-k">1 {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }})</span>
          <span class="pz-eq-v">{{ item.text }} {{ item.unit.name }}({{ item.unit.symbol }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 长度页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
