<script setup lang="ts">
/**
 * NumberSumTool.vue - 数字求和计算器
 *
 * 从文本中提取数字，计算总和/个数/最大/最小/平均/乘积。
 */
import { Trash2, Calculator, Copy, Check } from 'lucide-vue-next'
import { sumNumbers, formatNumber } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '数字求和计算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线数字求和计算器，自动从文本中提取所有数字并计算总和、个数、最大、最小、平均值与乘积，支持负数和小数，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '数字求和,批量求和,数字提取,求和工具,在线计算器' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'number-sum')
const { reportEvent } = useAnalytics()

const text = ref('100, 200, 300\n-50, 12.5, 88.8')
const result = computed(() => sumNumbers(text.value))

let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(text, () => {
  if (useReported || !text.value.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})

// 第一行：求和、平均值、乘积（带复制按钮）
const primaryMetrics = computed(() => [
  { key: 'sum', label: '总和', value: formatNumber(result.value.sum), raw: String(result.value.sum), primary: true },
  { key: 'average', label: '平均值', value: formatNumber(result.value.average), raw: String(result.value.average), primary: false },
  { key: 'product', label: '乘积', value: formatNumber(result.value.product), raw: String(result.value.product), primary: false },
])

// 第二行：数字个数、最大值、最小值
const otherMetrics = computed(() => [
  { key: 'count', label: '数字个数', value: result.value.count },
  { key: 'max', label: '最大值', value: formatNumber(result.value.max) },
  { key: 'min', label: '最小值', value: formatNumber(result.value.min) },
])

const copiedKey = ref('')
function copyValue(raw: string, key: string) {
  navigator.clipboard?.writeText(raw)
  copiedKey.value = key
  setTimeout(() => (copiedKey.value = ''), 1500)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输入包含数字的文本（自动提取）</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="text = ''">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea v-model="text" class="pz-url-textarea" rows="7" placeholder="粘贴包含数字的文本，如报表、聊天记录..." />
    </div>

    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">统计结果</h2>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="m in primaryMetrics"
          :key="m.key"
          class="relative p-3 pt-6 rounded-md flex flex-col items-center justify-center"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
        >
          <button
            type="button"
            class="absolute top-1.5 right-1.5 p-1 rounded"
            style="color: var(--pz-color-text-tertiary)"
            :title="copiedKey === m.key ? '已复制' : '复制'"
            @click="copyValue(m.raw, m.key)"
          >
            <component :is="copiedKey === m.key ? Check : Copy" class="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <span class="text-lg font-bold" :style="m.primary ? 'color: var(--pz-color-primary)' : 'color: var(--pz-color-text-primary)'" style="font-family: var(--pz-font-mono); word-break: break-all">{{ m.value }}</span>
          <span class="text-xs mt-1" style="color: var(--pz-color-text-tertiary)">{{ m.label }}</span>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <div
          v-for="m in otherMetrics"
          :key="m.key"
          class="p-3 rounded-md flex flex-col items-center justify-center"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
        >
          <span class="text-lg font-bold" style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono); word-break: break-all">{{ m.value }}</span>
          <span class="text-xs mt-1" style="color: var(--pz-color-text-tertiary)">{{ m.label }}</span>
        </div>
      </div>
      <p class="text-xs mt-4" style="color: var(--pz-color-text-tertiary)">
        自动识别正数、负数、整数和小数，兼容逗号、空格、换行等分隔方式。所有计算均在浏览器本地完成。
      </p>
    </div>
  </div>
</template>
