<script setup lang="ts">
/**
 * IncomeTaxCalculatorTool.vue - 个人所得税计算器
 *
 * 按累计预扣预缴法计算工资薪金个税。
 */
import { Calculator } from 'lucide-vue-next'
import { calculateIncomeTax, formatNumber } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '个人所得税计算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线个人所得税计算器，按累计预扣预缴法计算工资薪金个税，支持纳税期数与五险一金、专项附加扣除累计填报，自动匹配七级超额累进税率，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '个税计算器,个人所得税,工资个税,累计预扣预缴,专项附加扣除' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'income-tax-calculator')
const { reportEvent } = useAnalytics()

const months = ref('12')
const totalSalary = ref('240000')
const totalInsurance = ref('28800')
const totalDeduction = ref('24000')
const prepaidTax = ref('6000')

const result = computed(() =>
  calculateIncomeTax({
    months: parseInt(months.value) || 1,
    totalSalary: parseFloat(totalSalary.value) || 0,
    totalInsurance: parseFloat(totalInsurance.value) || 0,
    totalDeduction: parseFloat(totalDeduction.value) || 0,
    prepaidTax: parseFloat(prepaidTax.value) || 0,
  }),
)

function handleCalc() {
  reportEvent('tool_use', effectiveSlug.value)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">累计预扣预缴个税计算</h2>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">纳税期数（月）</label>
          <input v-model="months" type="number" min="1" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">累计税前工资（元）</label>
          <input v-model="totalSalary" type="text" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">累计五险一金（个人部分，元）</label>
          <input v-model="totalInsurance" type="text" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">累计专项附加扣除（元）</label>
          <input v-model="totalDeduction" type="text" class="pz-input" @change="handleCalc" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs" style="color: var(--pz-color-text-secondary)">累计已预缴税额（元）</label>
          <input v-model="prepaidTax" type="text" class="pz-input" @change="handleCalc" />
        </div>
      </div>

      <button type="button" class="pz-btn-primary" @click="handleCalc">计算</button>
    </div>

    <div class="pz-card p-4">
      <h2 class="text-base font-semibold mb-3" style="color: var(--pz-color-text-primary)">计算结果</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">月均税前工资</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.monthlySalary) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">累计应纳税所得额</div>
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
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">累计应纳税额</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(result.totalTax) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">本月应预扣税额</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.monthlyTax) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">月均五险一金</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(result.insurance) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">月均专项附加扣除</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">¥{{ formatNumber(result.deduction) }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">本月税后到手</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.netSalary) }}</div>
        </div>
      </div>
      <p class="text-xs mt-4" style="color: var(--pz-color-text-tertiary)">
        基本减除费用按 5000 元/月 × 期数计算。结果仅供参考，实际以税务机关核定为准。
      </p>
    </div>
  </div>
</template>
