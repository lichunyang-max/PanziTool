<script setup lang="ts">
/**
 * LoanCalculatorTool.vue - 贷款计算器
 *
 * 支持等额本息与等额本金，生成逐期还款明细。
 */
import { Calculator, Download } from 'lucide-vue-next'
import { calculateLoan, formatNumber, type LoanMethod } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '贷款计算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线贷款计算器，支持等额本息与等额本金两种还款方式，可计算月供、总利息、总还款额并生成逐期还款明细，支持无息贷款，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '贷款计算器,房贷计算,等额本息,等额本金,月供计算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'loan-calculator')
const { reportEvent } = useAnalytics()

const amount = ref('1000000')
const years = ref('30')
const annualRate = ref('4.2')
const method = ref<LoanMethod>('equalPayment')

const result = computed(() =>
  calculateLoan({
    amount: parseFloat(amount.value) || 0,
    years: parseFloat(years.value) || 0,
    annualRate: parseFloat(annualRate.value) || 0,
    method: method.value,
  }),
)

const showFullSchedule = ref(false)
const displaySchedule = computed(() =>
  showFullSchedule.value ? result.value.schedule : result.value.schedule.slice(0, 12),
)

function handleCalc() {
  reportEvent('tool_use', effectiveSlug.value)
}

function exportCsv() {
  const header = '期数,月供,本金,利息,剩余本金\n'
  const rows = result.value.schedule
    .map((s) => `${s.period},${s.payment},${s.principal},${s.interest},${s.balance}`)
    .join('\n')
  const csv = '\ufeff' + header + rows
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '贷款还款明细.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">贷款计算</h2>
      </div>

      <div class="flex gap-2 flex-wrap">
        <div class="pz-mode-btn" :class="method === 'equalPayment' ? 'is-active' : ''" @click="method = 'equalPayment'">等额本息</div>
        <div class="pz-mode-btn" :class="method === 'equalPrincipal' ? 'is-active' : ''" @click="method = 'equalPrincipal'">等额本金</div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">贷款金额（元）</label>
          <input v-model="amount" type="text" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">贷款年限（年）</label>
          <input v-model="years" type="number" min="1" max="30" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">年利率（%）</label>
          <input v-model="annualRate" type="text" class="pz-input" @change="handleCalc" />
        </div>
      </div>

      <div class="flex gap-2">
        <button type="button" class="pz-btn-primary" @click="handleCalc">计算</button>
        <button type="button" class="pz-btn-secondary" @click="exportCsv">
          <Download class="w-[14px] h-[14px]" aria-hidden="true" />导出 CSV
        </button>
      </div>
    </div>

    <div class="pz-card p-4">
      <h2 class="text-base font-semibold mb-3" style="color: var(--pz-color-text-primary)">还款结果</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">
            {{ method === 'equalPayment' ? '每月月供' : '首月月供' }}
          </div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.monthlyPayment) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">总还款额</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(result.totalPayment) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">支付利息</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.totalInterest) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">还款期数</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ result.schedule.length }} 期</div>
        </div>
      </div>

      <h3 class="text-sm font-semibold mb-2" style="color: var(--pz-color-text-primary)">逐期还款明细</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="border-bottom: 2px solid var(--pz-color-border)">
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">期数</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">月供</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">本金</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">利息</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">剩余本金</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in displaySchedule" :key="s.period" style="border-bottom: 1px solid var(--pz-color-border)">
              <td class="py-2 px-2" style="color: var(--pz-color-text-primary)">第 {{ s.period }} 期</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(s.payment) }}</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">¥{{ formatNumber(s.principal) }}</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">¥{{ formatNumber(s.interest) }}</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-secondary)">¥{{ formatNumber(s.balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button
        v-if="result.schedule.length > 12"
        type="button"
        class="pz-btn-secondary mt-3"
        @click="showFullSchedule = !showFullSchedule"
      >
        {{ showFullSchedule ? '收起明细' : `展开全部 ${result.schedule.length} 期` }}
      </button>
    </div>
  </div>
</template>
