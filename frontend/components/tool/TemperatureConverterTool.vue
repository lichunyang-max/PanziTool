<script setup lang="ts">
/**
 * TemperatureConverterTool.vue - 温度单位换算器
 *
 * 摄氏度、华氏度、开氏度、兰氏度、列氏度五种温标，任意输入框填写数值，
 * 其余输入框实时联动换算（统一经开尔文基准的函数式换算，温度带偏移不是比例量）。
 * 支持"重置数据"一键恢复示例值；浏览器本地计算不上传。
 */
import { ArrowLeftRight } from 'lucide-vue-next'
import { convertUnitValue, parseConvertInput, type ConvertUnit } from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '温度单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线温度单位换算工具，支持摄氏度、华氏度、开氏度、兰氏度、列氏度五种温标互转，输入任意一个其余实时换算，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '温度换算,温度单位,摄氏度,华氏度,开氏度,开尔文,兰氏度,列氏度,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'temperature-converter')
const { reportEvent } = useAnalytics()

interface TempField {
  key: string
  /** 界面标签，如 摄氏度(°C) */
  label: string
  /** 单位值 → 开尔文（toBase）/ 开尔文 → 单位值（fromBase） */
  unit: ConvertUnit
}

const fields: TempField[] = [
  { key: 'c', label: '摄氏度(°C)', unit: { name: '摄氏度', symbol: '°C', toBase: (v) => v + 273.15, fromBase: (k) => k - 273.15 } },
  { key: 'f', label: '华氏度(°F)', unit: { name: '华氏度', symbol: '°F', toBase: (v) => ((v - 32) * 5) / 9 + 273.15, fromBase: (k) => ((k - 273.15) * 9) / 5 + 32 } },
  { key: 'k', label: '开氏度(K)', unit: { name: '开氏度', symbol: 'K', toBase: (v) => v, fromBase: (k) => k } },
  { key: 'r', label: '兰氏度(°R)', unit: { name: '兰氏度', symbol: '°R', toBase: (v) => (v * 5) / 9, fromBase: (k) => (k * 9) / 5 } },
  { key: 're', label: '列氏度(°Re)', unit: { name: '列氏度', symbol: '°Re', toBase: (v) => v * 1.25 + 273.15, fromBase: (k) => (k - 273.15) * 0.8 } },
]

/** 默认数据为空，"重置数据"清空全部输入框 */
const DEFAULTS: Record<string, string> = { c: '', f: '', k: '', r: '', re: '' }
const values = reactive<Record<string, string>>({ ...DEFAULTS })

/** 五种温标与摄氏度之间的换算公式对照（温度关系换算模块） */
const relationRows: [string, string, string][] = [
  ['华氏度 (°F)', '°F = ℃ × 9/5 + 32', '℃ = (°F − 32) × 5/9'],
  ['开氏度 (K)', 'K = ℃ + 273.15', '℃ = K − 273.15'],
  ['兰氏度 (°R)', '°R = ℃ × 9/5 + 491.67', '℃ = °R × 5/9 − 273.15'],
  ['列氏度 (°Re)', '°Re = ℃ × 4/5', '℃ = °Re × 5/4'],
]

/** 换算结果显示：最多 4 位小数并去掉尾零（37℃ → 98.6 / 310.15 / 558.27 / 29.6） */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return ''
  return String(Math.round(v * 10000) / 10000)
}

/** 任一输入框输入时，以该温标为源联动换算其余输入框 */
function onFieldInput(key: string) {
  const src = fields.find((f) => f.key === key)
  if (!src) return
  const v = parseConvertInput(values[key])
  if (v === null) return
  for (const other of fields) {
    if (other.key === key) continue
    values[other.key] = fmt(convertUnitValue(src.unit, other.unit, v))
  }
}

/** 重置数据：恢复示例值 */
function resetData() {
  Object.assign(values, DEFAULTS)
  reportEvent('tool_use', effectiveSlug.value)
}

// 工具使用上报：输入后 1.5s 防抖（每次会话首次触发）
let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(
  values,
  () => {
    if (useReported) return
    if (useReportTimer) clearTimeout(useReportTimer)
    useReportTimer = setTimeout(() => {
      useReported = true
      reportEvent('tool_use', effectiveSlug.value)
    }, 1500)
  },
  { deep: true },
)
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- 五种温标输入框：任意输入联动换算 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
      <div v-for="field in fields" :key="field.key">
        <label
          class="block mb-2"
          :for="`temp-${field.key}`"
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary); font-weight: var(--pz-weight-medium)"
        >
          {{ field.label }}
        </label>
        <input
          :id="`temp-${field.key}`"
          v-model="values[field.key]"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          class="pz-input w-full"
          style="padding: 0.65rem 0.75rem"
          @input="onFieldInput(field.key)"
        />
      </div>
    </div>

    <!-- 重置数据 -->
    <div>
      <button type="button" class="pz-btn-primary" @click="resetData">重置数据</button>
    </div>

    <!-- 温度关系换算 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <ArrowLeftRight class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">温度关系换算</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="background: var(--pz-color-bg-secondary)">
              <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">温标</th>
              <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">由摄氏度 ℃ 换算</th>
              <th class="text-left px-4 py-2 font-medium" style="color: var(--pz-color-text-primary)">换算回摄氏度 ℃</th>
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
              <td class="px-4 py-2"><code class="pz-mono text-xs" style="color: var(--pz-color-primary)">{{ row[2] }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
