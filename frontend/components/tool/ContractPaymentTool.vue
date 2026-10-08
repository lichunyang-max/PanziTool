<script setup lang="ts">
/**
 * ContractPaymentTool.vue - 合同款项计算器
 *
 * 两种计算模式：
 * 1. 按期数均分：按合同总金额、税率、付款期数计算每期应付及明细。
 * 2. 按比例付款：每行「名称/比例」（如 预付款/30），计算每笔款项金额与人民币大写。
 */
import { Calculator, Download } from 'lucide-vue-next'
import {
  calculateContractPayment,
  calculateContractByRatio,
  parseContractRatioLines,
  numberToRmbUppercase,
  formatNumber,
} from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '合同款项计算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线合同款项计算器，支持按付款期数均分与按比例拆分（预付款/进度款/验收款/质保金）两种模式，自动计算每笔付款金额、不含税金额、税额与人民币大写，可导出付款明细表，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '合同付款,分期付款,合同金额计算,付款比例,付款明细,含税不含税' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'contract-payment')
const { reportEvent } = useAnalytics()

// 计算模式：equal = 按期数均分，ratio = 按比例付款
const calcMode = ref<'equal' | 'ratio'>('equal')

const totalAmount = ref('100000')
const taxRate = ref('13')
const payments = ref('4')
// 按比例付款：每行「名称/比例」
const ratioText = ref('预付款/30\n进度款/30\n验收款/30\n质保金/10')

const equalResult = computed(() =>
  calculateContractPayment({
    totalAmount: parseFloat(totalAmount.value) || 0,
    taxRate: parseFloat(taxRate.value) || 0,
    payments: Math.max(1, Math.min(36, parseInt(payments.value) || 1)),
  }),
)

const ratioItems = computed(() => parseContractRatioLines(ratioText.value))

const ratioResult = computed(() =>
  calculateContractByRatio({
    totalAmount: parseFloat(totalAmount.value) || 0,
    taxRate: parseFloat(taxRate.value) || 0,
    items: ratioItems.value,
  }),
)

// 按比例模式合计行
const ratioTotals = computed(() => {
  const items = ratioResult.value.items
  const amount = items.reduce((s, it) => s + it.amount, 0)
  const untaxed = items.reduce((s, it) => s + it.untaxed, 0)
  const tax = items.reduce((s, it) => s + it.tax, 0)
  return { amount: round2(amount), untaxed: round2(untaxed), tax: round2(tax) }
})

// 总金额的人民币大写
const totalCn = computed(() => numberToRmbUppercase(ratioResult.value.totalAmount, true))

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function handleCalc() {
  reportEvent('tool_use', effectiveSlug.value)
}

function switchMode(mode: 'equal' | 'ratio') {
  calcMode.value = mode
}

function exportCsv() {
  let csv = ''
  if (calcMode.value === 'equal') {
    const header = '期数,付款金额,不含税金额,税额,累计付款金额\n'
    const rows = equalResult.value.schedule
      .map((s) => `${s.period},${s.amount},${s.untaxed},${s.tax},${s.cumulative}`)
      .join('\n')
    csv = '\ufeff' + header + rows
  } else {
    const header = '名称,比例(%),付款金额,不含税金额,税额,人民币大写\n'
    const rows = ratioResult.value.items
      .map((it) => `${it.name},${it.ratio},${it.amount},${it.untaxed},${it.tax},${it.amountCn}`)
      .join('\n')
    csv = '\ufeff' + header + rows
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = calcMode.value === 'equal' ? '合同付款明细.csv' : '合同比例付款明细.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">合同款项计算</h2>
      </div>

      <div class="contract-mode-tabs" role="tablist" aria-label="计算模式">
        <div
          class="pz-mode-btn"
          :class="{ 'is-active': calcMode === 'equal' }"
          role="tab"
          :aria-selected="calcMode === 'equal'"
          @click="switchMode('equal')"
        >按期数均分</div>
        <div
          class="pz-mode-btn"
          :class="{ 'is-active': calcMode === 'ratio' }"
          role="tab"
          :aria-selected="calcMode === 'ratio'"
          @click="switchMode('ratio')"
        >按比例付款</div>
      </div>

      <!-- 按比例付款：款项比例设置 -->
      <div v-if="calcMode === 'ratio'" class="flex flex-col gap-1">
        <label class="text-xs" style="color: var(--pz-color-text-secondary)">款项比例设置（每行一条，格式：名称/比例）</label>
        <textarea
          v-model="ratioText"
          class="pz-url-textarea"
          rows="5"
          placeholder="预付款/30&#10;进度款/30&#10;验收款/30&#10;质保金/10"
        />
        <p class="text-xs" style="color: var(--pz-color-text-tertiary)">比例可写 30 或 30%，比例合计建议为 100%，否则按实际比例计算并提示。</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">合同总金额（含税，元）</label>
          <input v-model="totalAmount" type="text" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">税率（%）</label>
          <input v-model="taxRate" type="text" class="pz-input" @change="handleCalc" />
        </div>
        <div v-if="calcMode === 'equal'" class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">付款期数</label>
          <input v-model="payments" type="number" min="1" max="36" class="pz-input" @change="handleCalc" />
        </div>
      </div>

      <div class="flex gap-2">
        <button type="button" class="pz-btn-primary" @click="handleCalc">计算</button>
        <button type="button" class="pz-btn-secondary" @click="exportCsv">
          <Download class="w-[14px] h-[14px]" aria-hidden="true" />导出 CSV
        </button>
      </div>
    </div>

    <!-- 按期数均分结果 -->
    <div v-if="calcMode === 'equal'" class="pz-card p-4">
      <h2 class="text-base font-semibold mb-3" style="color: var(--pz-color-text-primary)">款项拆分</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">合同总金额</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(equalResult.totalAmount) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">不含税金额</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(equalResult.untaxedAmount) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">税额</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(equalResult.taxAmount) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">每期应付</div>
          <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(equalResult.perPayment) }}</div>
        </div>
      </div>

      <h3 class="text-sm font-semibold mb-2" style="color: var(--pz-color-text-primary)">逐期付款明细</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="border-bottom: 2px solid var(--pz-color-border)">
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">期数</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">付款金额</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">不含税</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">税额</th>
              <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">累计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in equalResult.schedule" :key="s.period" style="border-bottom: 1px solid var(--pz-color-border)">
              <td class="py-2 px-2" style="color: var(--pz-color-text-primary)">第 {{ s.period }} 期</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(s.amount) }}</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">¥{{ formatNumber(s.untaxed) }}</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">¥{{ formatNumber(s.tax) }}</td>
              <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-secondary)">¥{{ formatNumber(s.cumulative) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 按比例付款结果 -->
    <div v-else class="pz-card p-4">
      <h2 class="text-base font-semibold mb-3" style="color: var(--pz-color-text-primary)">比例付款明细</h2>

      <div v-if="ratioItems.length === 0" class="text-sm py-6 text-center" style="color: var(--pz-color-text-tertiary)">
        请输入有效的款项比例，每行格式：名称/比例（如 预付款/30）
      </div>

      <template v-else>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
            <div class="text-xs" style="color: var(--pz-color-text-secondary)">总金额</div>
            <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">{{ formatNumber(ratioResult.totalAmount) }}</div>
          </div>
          <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
            <div class="text-xs" style="color: var(--pz-color-text-secondary)">人民币大写</div>
            <div class="text-base font-bold mt-1" style="color: var(--pz-color-text-primary)">{{ totalCn }}</div>
          </div>
          <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
            <div class="text-xs" style="color: var(--pz-color-text-secondary)">不含税金额</div>
            <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(ratioResult.untaxedAmount) }}</div>
          </div>
          <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
            <div class="text-xs" style="color: var(--pz-color-text-secondary)">税额</div>
            <div class="text-base font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(ratioResult.taxAmount) }}</div>
          </div>
        </div>

        <div
          v-if="!ratioResult.ratioExact"
          class="mb-3 p-2.5 rounded-md text-xs"
          style="background: var(--pz-color-warning-bg, #fef3c7); border: 1px solid var(--pz-color-warning, #f59e0b); color: var(--pz-color-warning-text, #92400e)"
        >
          比例合计为 {{ formatNumber(ratioResult.ratioSum) }}%，不等于 100%，已按实际比例计算各笔金额，请检查比例设置。
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr style="border-bottom: 2px solid var(--pz-color-border)">
                <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">名称</th>
                <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">比例</th>
                <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">金额</th>
                <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">不含税</th>
                <th class="text-right py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">税额</th>
                <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">人民币大写</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in ratioResult.items" :key="it.name + idx" style="border-bottom: 1px solid var(--pz-color-border)">
                <td class="py-2 px-2" style="color: var(--pz-color-text-primary)">{{ it.name }}</td>
                <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">{{ it.ratio }}%</td>
                <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">{{ formatNumber(it.amount) }}</td>
                <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">{{ formatNumber(it.untaxed) }}</td>
                <td class="py-2 px-2 text-right" style="font-family: var(--pz-font-mono)">{{ formatNumber(it.tax) }}</td>
                <td class="py-2 px-2" style="color: var(--pz-color-text-secondary)">{{ it.amountCn }}</td>
              </tr>
              <tr style="border-bottom: 2px solid var(--pz-color-border)">
                <td class="py-2 px-2 font-semibold" style="color: var(--pz-color-text-primary)">合计</td>
                <td class="py-2 px-2 text-right font-semibold" style="font-family: var(--pz-font-mono)">{{ formatNumber(ratioResult.ratioSum) }}%</td>
                <td class="py-2 px-2 text-right font-semibold" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">{{ formatNumber(ratioTotals.amount) }}</td>
                <td class="py-2 px-2 text-right font-semibold" style="font-family: var(--pz-font-mono)">{{ formatNumber(ratioTotals.untaxed) }}</td>
                <td class="py-2 px-2 text-right font-semibold" style="font-family: var(--pz-font-mono)">{{ formatNumber(ratioTotals.tax) }}</td>
                <td class="py-2 px-2" />
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 分段式 tab 容器：让模式切换呈现明显的 tab 形态 */
.contract-mode-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--pz-color-bg-secondary);
  border-radius: var(--pz-radius-full);
  width: fit-content;
}

.contract-mode-tabs .pz-mode-btn {
  padding: 0.5rem 1.25rem;
}
</style>
