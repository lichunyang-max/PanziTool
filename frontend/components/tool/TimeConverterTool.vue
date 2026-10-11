<script setup lang="ts">
/**
 * TimeConverterTool.vue - 时间单位换算器
 *
 * 行式单位网格（UnitGrid grouped 双列）：常用 8 单位 + 其他 12 单位，
 * 任意一行输入即成为「源」单位，其余行实时换算（基准为秒，线性系数）；
 * 大数/极小数自动科学计数，常规数值 6 位有效数字加千分位。
 * 月按 30.436875 天平均折算，「年」按儒略年 365.25 天；闰年/公历年为独立单位。
 * "重置数据"一键清空；浏览器本地计算不上传。
 */
import { ArrowLeftRight } from 'lucide-vue-next'
import { convertUnitValue, parseConvertInput, type ConvertGroup } from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '时间单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线时间单位换算工具，覆盖毫秒到千禧年共 20 种时间单位，支持纳秒、微秒、儒略年、世纪等科研与日常单位互转，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '时间换算,时间单位,秒,毫秒,微秒,纳秒,天,周,月,年,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'time-converter')
const { reportEvent } = useAnalytics()

/** 单位分组（基准为秒，1 单位 = toBase 秒） */
const groups: ConvertGroup[] = [
  {
    title: '常用',
    units: [
      { name: '毫秒', symbol: 'ms', toBase: 0.001 },
      { name: '秒', symbol: 's', toBase: 1 },
      { name: '分', symbol: 'min', toBase: 60 },
      { name: '时', symbol: 'h', toBase: 3600 },
      { name: '天', symbol: 'd', toBase: 86400 },
      { name: '周', symbol: 'week', toBase: 604800 },
      { name: '月', symbol: 'month', toBase: 2629746 },
      { name: '年', symbol: 'y', toBase: 31557600 },
    ],
  },
  {
    title: '其他',
    units: [
      { name: '阿秒', symbol: 'as', toBase: 1e-18 },
      { name: '飞秒', symbol: 'fs', toBase: 1e-15 },
      { name: '皮秒', symbol: 'ps', toBase: 1e-12 },
      { name: '纳秒', symbol: 'ns', toBase: 1e-9 },
      { name: '微秒', symbol: 'µs', toBase: 1e-6 },
      { name: '儒略年', symbol: 'Julian y', toBase: 31557600 },
      { name: '闰年', symbol: 'leap y', toBase: 31622400 },
      { name: '公历年', symbol: 'Gregorian y', toBase: 31556952 },
      { name: '双周', symbol: 'fortnight', toBase: 1209600 },
      { name: '千禧年', symbol: 'millennium', toBase: 31556952000 },
      { name: '世纪', symbol: 'century', toBase: 3155695200 },
      { name: '十年', symbol: 'decade', toBase: 315569520 },
    ],
  },
]

const allUnits = groups.flatMap((g) => g.units)
function findUnit(name: string) {
  return allUnits.find((u) => u.name === name) || allUnits[4]
}

const sourceUnit = ref('天')
const rawValue = ref('1')

const parsed = computed(() => parseConvertInput(rawValue.value))

/** 网格显示格式：|v| ≥ 1e15 或 < 1e-5 用科学计数（8.64e+22），其余 6 位有效数字 + 千分位 */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  const abs = Math.abs(v)
  if (abs >= 1e15 || abs < 1e-5) {
    return v.toExponential(5).replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e')
  }
  const s = String(Number(v.toPrecision(6)))
  const neg = s.startsWith('-')
  const body = neg ? s.slice(1) : s
  const [int, frac] = body.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + grouped + (frac !== undefined ? '.' + frac : '')
}

function convertDisplay(unit: { name: string }): string {
  if (parsed.value === null) return ''
  return fmt(convertUnitValue(findUnit(sourceUnit.value), findUnit(unit.name), parsed.value))
}

/** 时间关系换算（常用单位与秒的对照，月按 30.436875 天平均、年按儒略年 365.25 天） */
const relationRows: [string, string][] = [
  ['1 分钟', '= 60 秒'],
  ['1 小时', '= 60 分钟 = 3,600 秒'],
  ['1 天', '= 24 小时 = 86,400 秒'],
  ['1 周', '= 7 天 = 604,800 秒'],
  ['1 月', '≈ 30.436875 天 = 2,629,746 秒'],
  ['1 年', '= 365.25 天（儒略年）= 31,557,600 秒'],
  ['1 毫秒 (ms)', '= 0.001 秒'],
  ['1 微秒 (µs)', '= 10⁻⁶ 秒'],
  ['1 纳秒 (ns)', '= 10⁻⁹ 秒'],
  ['1 皮秒 (ps)', '= 10⁻¹² 秒'],
  ['1 飞秒 (fs)', '= 10⁻¹⁵ 秒'],
]

/** 重置数据：恢复源为「1 天」 */
function resetData() {
  sourceUnit.value = '天'
  rawValue.value = '1'
  reportEvent('tool_use', effectiveSlug.value)
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
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- 单位换算网格（常用 / 其他 双列分组） -->
    <div class="pz-card p-4">
      <ToolConvertUnitGrid
        v-model:model-value="rawValue"
        v-model:source-unit="sourceUnit"
        :groups="groups"
        :convert-display="convertDisplay"
        mode="grouped"
        @copy="onUnitCopy"
      />
    </div>

    <!-- 重置数据 -->
    <div>
      <button type="button" class="pz-btn-primary" @click="resetData">重置数据</button>
    </div>

    <!-- 时间关系换算 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <ArrowLeftRight class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">时间关系换算</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="background: var(--pz-color-bg-secondary)">
              <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">单位关系</th>
              <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">换算为秒</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in relationRows"
              :key="row[0]"
              style="border-top: 1px solid var(--pz-color-border)"
            >
              <td class="px-4 py-2 whitespace-nowrap" style="color: var(--pz-color-text-primary); font-weight: 500">{{ row[0] }}</td>
              <td class="px-4 py-2"><code class="pz-mono text-xs" style="color: var(--pz-color-primary)">{{ row[1] }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 时间页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
