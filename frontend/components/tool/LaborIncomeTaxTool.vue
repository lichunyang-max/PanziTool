<script setup lang="ts">
/**
 * LaborIncomeTaxTool.vue - 个人劳务报酬所得税
 *
 * 支持税前→税后、税后→税前双向计算。
 */
import { ArrowLeftRight, Calculator } from 'lucide-vue-next'
import {
  calculateLaborTax,
  calculateLaborGrossFromNet,
  formatNumber,
} from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '个人劳务报酬所得税计算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线个人劳务报酬所得税计算器，支持税前反推税后与税后反查税前双向计算，自动匹配三级超额累进税率，精度 0.01，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '劳务报酬个税,劳务税,兼职个税,稿酬个税,特许权使用费' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'labor-income-tax')
const { reportEvent } = useAnalytics()

// direction: 'grossToNet' (税前→税后) | 'netToGross' (税后→税前)
const direction = ref<'grossToNet' | 'netToGross'>('grossToNet')
const amount = ref('5000')

const gross = computed(() =>
  direction.value === 'grossToNet'
    ? parseFloat(amount.value) || 0
    : calculateLaborGrossFromNet(parseFloat(amount.value) || 0),
)

const result = computed(() => calculateLaborTax(gross.value))

function swap() {
  direction.value = direction.value === 'grossToNet' ? 'netToGross' : 'grossToNet'
  amount.value = ''
}

function handleCalc() {
  reportEvent('tool_use', effectiveSlug.value)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">劳务报酬所得税计算</h2>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div
          class="pz-mode-btn"
          :class="direction === 'grossToNet' ? 'is-active' : ''"
          @click="direction = 'grossToNet'"
        >税前 → 税后</div>
        <button type="button" class="pz-btn-secondary p-1" @click="swap">
          <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
        </button>
        <div
          class="pz-mode-btn"
          :class="direction === 'netToGross' ? 'is-active' : ''"
          @click="direction = 'netToGross'"
        >税后 → 税前</div>
      </div>

      <div class="flex flex-col gap-1 max-w-xs">
        <label class="text-xs" style="color: var(--pz-color-text-secondary)">
          {{ direction === 'grossToNet' ? '税前劳务报酬（元）' : '税后到手金额（元）' }}
        </label>
        <input v-model="amount" type="text" class="pz-input" @change="handleCalc" />
      </div>

      <button type="button" class="pz-btn-primary w-full sm:w-auto" @click="handleCalc">计算</button>
    </div>

    <div class="pz-card p-4">
      <h2 class="text-base font-semibold mb-3" style="color: var(--pz-color-text-primary)">计算结果</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">税前收入</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(gross) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">应纳税所得额</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(result.taxableIncome) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">适用税率</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ formatNumber(result.rate) }}%</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">速算扣除数</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(result.deduction) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">应缴个税</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.tax) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">税后到手</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.net) }}</div>
        </div>
      </div>
      <p class="text-xs mt-4" style="color: var(--pz-color-text-tertiary)">
        每次收入不超过 4000 元的，减除费用 800 元；4000 元以上的，减除 20% 费用。年度汇算时并入综合所得统一计算。
      </p>
    </div>
  </div>
</template>
