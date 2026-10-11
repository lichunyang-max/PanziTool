<script setup lang="ts">
/**
 * BatteryCapacityConverterTool.vue - 电池容量换算器
 *
 * mAh/Ah（电量）与 mWh/Wh/kWh（能量）互转：
 * 能量 = 电量 × 电压，支持常用电池电压预设。
 */
import { BatteryCharging, Copy, Info, Trash2 } from 'lucide-vue-next'
import {
  formatConvertValue,
  parseConvertInput,
  type ConvertGroup,
  type DecimalMode,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '电池容量换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线电池容量换算工具，mAh 与 Wh 双向换算，支持常用电池电压预设（镍氢、锂电、磷酸铁锂、铅酸等），民航 100Wh 限制速查，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '电池容量换算,mAh转Wh,Wh转mAh,充电宝登机,电池电压,安时,瓦时' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'battery-capacity-converter')
const { reportEvent } = useAnalytics()

const voltage = ref('3.7')
const sourceUnit = ref('毫安时')
const rawValue = ref('5000')
const decimals = ref<DecimalMode>('auto')
const outputStyle = ref<OutputStyle>('thousand')

const voltageNum = computed(() => {
  const v = parseConvertInput(voltage.value)
  return v === null || v <= 0 ? 3.7 : v
})

/** 基准单位：mAh；能量单位经电压换算 */
const groups = computed<ConvertGroup[]>(() => [
  {
    title: '电量（电荷容量）',
    units: [
      { name: '毫安时', symbol: 'mAh', toBase: 1 },
      { name: '安时', symbol: 'Ah', toBase: 1000 },
    ],
  },
  {
    title: '能量（能量容量）',
    units: [
      {
        name: '毫瓦时',
        symbol: 'mWh',
        toBase: (v: number) => v * voltageNum.value,
        fromBase: (e: number) => e / voltageNum.value,
      },
      {
        name: '瓦时',
        symbol: 'Wh',
        toBase: (v: number) => (v * voltageNum.value) / 1000,
        fromBase: (e: number) => (e * 1000) / voltageNum.value,
      },
      {
        name: '千瓦时 / 度电',
        symbol: 'kWh',
        toBase: (v: number) => (v * voltageNum.value) / 1e6,
        fromBase: (e: number) => (e * 1e6) / voltageNum.value,
      },
    ],
  },
])

const parsed = computed(() => parseConvertInput(rawValue.value))

function convertDisplay(unit: ConvertGroup['units'][number]): string {
  if (parsed.value === null) return ''
  const src = groups.value.flatMap((g) => g.units).find((u) => u.name === sourceUnit.value)
  const target = groups.value.flatMap((g) => g.units).find((u) => u.name === unit.name)
  if (!src || !target) return ''
  const base = typeof src.toBase === 'function' ? src.toBase(parsed.value) : parsed.value * src.toBase
  const out = target.fromBase ? target.fromBase(base) : base / (target.toBase as number)
  return formatConvertValue(out, decimals.value, outputStyle.value)
}

const presets: { label: string; v: string }[] = [
  { label: '1.2 V 镍氢', v: '1.2' },
  { label: '1.5 V 干电', v: '1.5' },
  { label: '2.0 V 铅酸', v: '2.0' },
  { label: '3.2 V 铁锂', v: '3.2' },
  { label: '3.6 V 锂电', v: '3.6' },
  { label: '3.7 V 锂电', v: '3.7' },
  { label: '12 V 铅酸组', v: '12' },
  { label: '48 V 储能', v: '48' },
]

/** 大数值结果：瓦时 */
const whDisplay = computed(() => convertDisplay({ name: '瓦时', symbol: 'Wh', toBase: 1 }))
const formulaText = computed(() => {
  const q = formatConvertValue(parsed.value === null ? 0 : parsed.value / 1000, 'auto', 'plain')
  return `E(Wh) = Q(Ah) × V = ${q} Ah × ${voltageNum.value} V = ${whDisplay.value || '—'} Wh`
})

const tipText = computed(() => {
  return `当前电压为 ${voltageNum.value} V，输入容量 ${rawValue.value || '0'} ${sourceUnit.value}。mAh/Ah 是电量，Wh/mWh 是能量，换算必须依靠电压：E(Wh) = Q(Ah) × V。`
})

function selectPreset(v: string) {
  voltage.value = v
  reportEvent('tool_use', effectiveSlug.value)
}

// 工具使用上报：输入后 1.5s 防抖（每次会话首次触发）
let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch([rawValue, voltage], ([v]) => {
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

function clearAll() {
  rawValue.value = ''
}

async function copyAll() {
  const all = groups.value.flatMap((g) => g.units)
  const lines = all.map((u) => `${u.name}(${u.symbol})\t${convertDisplay(u)}`)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    reportEvent('copy', effectiveSlug.value)
  } catch {
    // 静默忽略
  }
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

    <!-- 电压与容量 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <BatteryCharging class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">电压与容量</h2>
        </div>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearAll">
          <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
        </button>
      </div>

      <div class="mb-4">
        <div class="pz-input-group" style="max-width: 16rem">
          <input
            v-model="voltage"
            type="text"
            class="pz-input"
            placeholder="输入电池电压"
            aria-label="电压（伏特）"
          />
          <span class="pz-input-suffix">V</span>
        </div>
        <div class="text-xs mt-1" style="color: var(--pz-color-text-tertiary)">
          常见电池标称电压：干电池 1.5V、镍氢 1.2V、锂离子 3.6V/3.7V、磷酸铁锂 3.2V、铅酸单体 2V
        </div>
      </div>

      <div class="text-xs font-semibold mb-2" style="color: var(--pz-color-text-secondary)">电压快速预设（点击切换）</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in presets"
          :key="p.v"
          type="button"
          class="pz-chip"
          :data-active="voltageNum === Number(p.v)"
          @click="selectPreset(p.v)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- 容量换算 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <BatteryCharging class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">容量换算</h2>
        </div>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyAll">
          <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制全部
        </button>
      </div>
      <ToolConvertUnitGrid
        v-model:model-value="rawValue"
        v-model:source-unit="sourceUnit"
        :groups="groups"
        :convert-display="convertDisplay"
        mode="grouped"
        @copy="onUnitCopy"
      />
      <div class="pz-bignum mt-4">
        <span class="pz-bignum-val">{{ whDisplay || '—' }}</span>
        <span class="pz-bignum-unit">瓦时(Wh)</span>
        <span class="pz-bignum-eq">{{ formulaText }}</span>
      </div>
    </div>

    <!-- 换算设置 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <BatteryCharging class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">换算设置</h2>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">小数位数</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['auto', '自动'], [2, '2 位'], [4, '4 位'], [6, '6 位']] as [DecimalMode, string][])"
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
              v-for="opt in ([['plain', '普通数字'], ['thousand', '千分位分隔']] as [OutputStyle, string][])"
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
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 电池页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
