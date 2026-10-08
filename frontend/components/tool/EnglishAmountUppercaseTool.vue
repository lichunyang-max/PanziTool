<script setup lang="ts">
/**
 * EnglishAmountUppercaseTool.vue - 英文金额大写转换器
 *
 * 支持 6 种货币，输出代码格式与完整币种名称格式。
 */
import { Copy, Check } from 'lucide-vue-next'
import { numberToEnglishAmount } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '英文金额大写转换器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线英文金额大写转换工具，支持美元、欧元、英镑、人民币、日元、港元六种货币，可按货币代码或完整币种名称两种格式输出，可选连字符，浏览器本地处理不上传，免登录打开即用。' },
    { name: 'keywords', content: '英文金额大写,英文大写,amount in words,美元大写,合同金额英文' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'english-amount-uppercase')
const { reportEvent } = useAnalytics()

const amount = ref('1234.56')
const currency = ref('USD')
const useHyphen = ref(true)

const currencies = [
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '欧元' },
  { code: 'GBP', name: '英镑' },
  { code: 'CNY', name: '人民币' },
  { code: 'HKD', name: '港币' },
  { code: 'JPY', name: '日元' },
]

const result = computed(() => {
  const num = parseFloat(amount.value.replace(/,/g, ''))
  if (isNaN(num)) return { code: '', full: '' }
  return numberToEnglishAmount(num, currency.value, useHyphen.value)
})

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

const copied = ref('')
function copy(text: string, key: string) {
  if (!text) return
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => (copied.value = ''), 1500)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">金额（数字）</label>
          <input v-model="amount" type="text" class="pz-input" placeholder="例如：1234.56" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">货币</label>
          <select v-model="currency" class="pz-input">
            <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.name }}（{{ c.code }}）</option>
          </select>
        </div>
      </div>

      <label class="flex items-center gap-1 text-xs cursor-pointer" style="color: var(--pz-color-text-secondary)">
        <input type="checkbox" v-model="useHyphen" class="accent-current" />
        使用连字符（如 TWENTY-FIVE）
      </label>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">代码格式</label>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="copy(result.code, 'code')">
            <component :is="copied === 'code' ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied === 'code' ? '已复制' : '复制' }}
          </button>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <span style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ result.code || '—' }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">完整币种名称格式</label>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="copy(result.full, 'full')">
            <component :is="copied === 'full' ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied === 'full' ? '已复制' : '复制' }}
          </button>
        </div>
        <div class="p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
          <span style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ result.full || '—' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
