<script setup lang="ts">
/**
 * CurrencyExchangeTool.vue - 货币汇率换算工具
 *
 * 支持 16 种常用货币，实时换算。
 */
import { ArrowLeftRight } from 'lucide-vue-next'
import { EXCHANGE_RATES, convertCurrency, round } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '货币汇率换算工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线货币汇率换算工具，支持人民币、美元、欧元、英镑、日元、港币、韩元等 16 种常用货币实时换算，支持小数精度调整与双向转换，浏览器本地计算，免登录打开即用。' },
    { name: 'keywords', content: '汇率换算,货币换算,美元兑人民币,汇率计算,外币兑换' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'currency-exchange')
const { reportEvent } = useAnalytics()

const currencyList = Object.entries(EXCHANGE_RATES).map(([code, info]) => ({ code, ...info }))

const amount = ref('100')
const from = ref('USD')
const to = ref('CNY')
const decimals = ref(4)

const converted = computed(() => {
  const num = parseFloat(amount.value.replace(/,/g, ''))
  if (isNaN(num)) return 0
  const result = convertCurrency(num, from.value, to.value)
  return round(result, decimals.value)
})

// 反向汇率
const inverseRate = computed(() => {
  const r = convertCurrency(1, from.value, to.value)
  return round(r, 4)
})

function swapCurrencies() {
  const tmp = from.value
  from.value = to.value
  to.value = tmp
}

let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(amount, () => {
  if (useReported || !amount.value.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">源货币</label>
          <select v-model="from" class="pz-input">
            <option v-for="c in currencyList" :key="c.code" :value="c.code">{{ c.name }}（{{ c.code }}）</option>
          </select>
        </div>
        <button type="button" class="pz-btn-secondary p-2 self-end" title="交换货币" @click="swapCurrencies">
          <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
        </button>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">目标货币</label>
          <select v-model="to" class="pz-input">
            <option v-for="c in currencyList" :key="c.code" :value="c.code">{{ c.name }}（{{ c.code }}）</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">金额</label>
          <input v-model="amount" type="text" class="pz-input" placeholder="输入金额" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">结果小数位</label>
          <input v-model.number="decimals" type="number" min="0" max="8" class="pz-input" />
        </div>
      </div>

      <div class="p-4 rounded-md flex flex-col gap-1" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
        <div class="text-xs" style="color: var(--pz-color-text-secondary)">换算结果</div>
        <div class="text-2xl font-bold" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">
          {{ EXCHANGE_RATES[from]?.symbol }}{{ parseFloat(amount || '0') || 0 }} {{ from }} = {{ EXCHANGE_RATES[to]?.symbol }}{{ converted }} {{ to }}
        </div>
        <div class="text-xs mt-1" style="color: var(--pz-color-text-tertiary)">
          参考汇率：1 {{ from }} ≈ {{ inverseRate }} {{ to }}（仅供参考，实际以银行牌价为准）
        </div>
      </div>
    </div>
  </div>
</template>
