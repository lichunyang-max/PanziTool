<script setup lang="ts">
/**
 * TaxCalculatorTool.vue - 税金税率计算器
 *
 * 四种计算方向：未含税→含税、含税→未含税、两金额反推税率、税额反推金额。
 */
import { Calculator, Copy, Check } from 'lucide-vue-next'
import { calculateTax, formatNumber, type TaxDirection } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '税金税率计算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线税金税率计算器，支持未含税与含税金额互转、由两金额反推税率、由税额与税率反推金额四种计算方向，自动生成中文金额大写，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '税金计算器,税率计算,含税不含税,增值税计算,税额反推' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'tax-calculator')
const { reportEvent } = useAnalytics()

const directions: { key: TaxDirection; label: string }[] = [
  { key: 'toTaxed', label: '未含税 → 含税' },
  { key: 'fromTaxed', label: '含税 → 未含税' },
  { key: 'findRate', label: '两金额反推税率' },
  { key: 'fromTax', label: '税额反推金额' },
]

const direction = ref<TaxDirection>('toTaxed')
const amount = ref('10000')
const taxedAmount = ref('11300')
const tax = ref('1300')
const rate = ref('13')
const exemption = ref('0')

const result = computed(() => {
  return calculateTax({
    direction: direction.value,
    amount: parseFloat(amount.value) || 0,
    taxedAmount: parseFloat(taxedAmount.value) || 0,
    tax: parseFloat(tax.value) || 0,
    rate: parseFloat(rate.value) || 0,
    exemption: parseFloat(exemption.value) || 0,
  })
})

function handleCalc() {
  reportEvent('tool_use', effectiveSlug.value)
}

const copied = ref('')
function copy(text: string, key: string) {
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => (copied.value = ''), 1500)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">税金税率计算</h2>
      </div>

      <div class="flex flex-wrap gap-2">
        <div
          v-for="d in directions"
          :key="d.key"
          class="pz-mode-btn"
          :class="direction === d.key ? 'is-active' : ''"
          @click="direction = d.key"
        >{{ d.label }}</div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <template v-if="direction === 'toTaxed'">
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">未含税金额</label>
            <input v-model="amount" type="text" class="pz-input" @change="handleCalc" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">税率（%）</label>
            <input v-model="rate" type="text" class="pz-input" @change="handleCalc" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">免税额（可选）</label>
            <input v-model="exemption" type="text" class="pz-input" @change="handleCalc" />
          </div>
        </template>
        <template v-else-if="direction === 'fromTaxed'">
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">含税金额</label>
            <input v-model="taxedAmount" type="text" class="pz-input" @change="handleCalc" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">税率（%）</label>
            <input v-model="rate" type="text" class="pz-input" @change="handleCalc" />
          </div>
        </template>
        <template v-else-if="direction === 'findRate'">
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">未含税金额</label>
            <input v-model="amount" type="text" class="pz-input" @change="handleCalc" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">含税金额</label>
            <input v-model="taxedAmount" type="text" class="pz-input" @change="handleCalc" />
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">税额</label>
            <input v-model="tax" type="text" class="pz-input" @change="handleCalc" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">税率（%）</label>
            <input v-model="rate" type="text" class="pz-input" @change="handleCalc" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs" style="color: var(--pz-color-text-secondary)">免税额（可选）</label>
            <input v-model="exemption" type="text" class="pz-input" @change="handleCalc" />
          </div>
        </template>
      </div>

      <button type="button" class="pz-btn-primary w-full sm:w-auto" @click="handleCalc">计算</button>
    </div>

    <div class="pz-card p-4">
      <h2 class="text-base font-semibold mb-3" style="color: var(--pz-color-text-primary)">计算结果</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">未含税金额</div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-lg font-bold" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.untaxed) }}</span>
            <button class="pz-btn-secondary" style="padding: 0.15rem 0.5rem" @click="copy(String(result.untaxed), 'untaxed')">
              <component :is="copied === 'untaxed' ? Check : Copy" class="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
          <div class="text-[11px] mt-1" style="color: var(--pz-color-text-tertiary)">{{ result.untaxedCn }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">含税金额</div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-lg font-bold" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.taxed) }}</span>
            <button class="pz-btn-secondary" style="padding: 0.15rem 0.5rem" @click="copy(String(result.taxed), 'taxed')">
              <component :is="copied === 'taxed' ? Check : Copy" class="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
          <div class="text-[11px] mt-1" style="color: var(--pz-color-text-tertiary)">{{ result.taxedCn }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">税额</div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-lg font-bold" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)">¥{{ formatNumber(result.taxAmount) }}</span>
            <button class="pz-btn-secondary" style="padding: 0.15rem 0.5rem" @click="copy(String(result.taxAmount), 'taxAmount')">
              <component :is="copied === 'taxAmount' ? Check : Copy" class="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
          <div class="text-[11px] mt-1" style="color: var(--pz-color-text-tertiary)">{{ result.taxCn }}</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">税率</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ formatNumber(result.rate) }}%</div>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <div class="text-xs" style="color: var(--pz-color-text-secondary)">实际税负占比</div>
          <div class="text-lg font-bold mt-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ formatNumber(result.taxBurden) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>
