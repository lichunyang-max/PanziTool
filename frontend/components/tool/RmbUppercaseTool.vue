<script setup lang="ts">
/**
 * RmbUppercaseTool.vue - 人民币大写转换器
 *
 * 支持数字→大写、大写→数字双向转换；单个/多个模式。
 */
import { ArrowLeftRight, Trash2, Copy, Check } from 'lucide-vue-next'
import {
  numberToRmbUppercase,
  rmbUppercaseToNumber,
} from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '人民币大写转换器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线人民币金额大写转换工具，支持数字转中文大写与中文大写转数字双向转换，可批量处理多个金额、自由切换「元/圆」写法，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '人民币大写,金额大写,数字转大写,中文大写金额,元角分' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'rmb-uppercase')
const { reportEvent } = useAnalytics()

// direction: 'toUpper' | 'toNumber'
const direction = ref<'toUpper' | 'toNumber'>('toUpper')
// mode: 'single' | 'multiple'
const mode = ref<'single' | 'multiple'>('single')
const useYuan = ref(true)

const input = ref('1234.56')
const output = ref('')
const copied = ref(false)

// 实时工具：用户主动编辑后防抖上报
let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(input, () => {
  if (useReported || !input.value.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})

function swapDirection() {
  direction.value = direction.value === 'toUpper' ? 'toNumber' : 'toUpper'
  input.value = ''
  output.value = ''
}

function convert() {
  const text = input.value.trim()
  if (!text) {
    output.value = ''
    return
  }
  if (mode.value === 'single') {
    if (direction.value === 'toUpper') {
      const num = parseFloat(text.replace(/,/g, ''))
      output.value = isNaN(num) ? '无效金额，请输入数字' : numberToRmbUppercase(num, useYuan.value).replace(/^人民币/, '')
    } else {
      const num = rmbUppercaseToNumber(text)
      output.value = num === 0 && !text.includes('零') ? '无效大写金额，请检查输入' : num.toFixed(2)
    }
  } else {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const results = lines.map((line) => {
      if (direction.value === 'toUpper') {
        const num = parseFloat(line.replace(/,/g, ''))
        return isNaN(num) ? `${line} → 无效金额` : `${line} → ${numberToRmbUppercase(num, useYuan.value).replace(/^人民币/, '')}`
      } else {
        return `${line} → ${rmbUppercaseToNumber(line).toFixed(2)}`
      }
    })
    output.value = results.join('\n')
  }
}

watch([direction, mode, useYuan], convert)
watch(input, convert)

function copyOutput() {
  if (!output.value) return
  navigator.clipboard?.writeText(output.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function clearAll() {
  input.value = ''
  output.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <div
          class="pz-mode-btn"
          :class="direction === 'toUpper' ? 'is-active' : ''"
          @click="direction = 'toUpper'"
        >数字 → 大写</div>
        <button
          type="button"
          class="pz-btn-secondary p-1"
          title="切换转换方向"
          @click="swapDirection"
        >
          <ArrowLeftRight class="w-4 h-4" aria-hidden="true" />
        </button>
        <div
          class="pz-mode-btn"
          :class="direction === 'toNumber' ? 'is-active' : ''"
          @click="direction = 'toNumber'"
        >大写 → 数字</div>
        <div class="flex-1" />
        <label class="flex items-center gap-1 text-xs cursor-pointer" style="color: var(--pz-color-text-secondary)">
          <input type="checkbox" v-model="useYuan" class="accent-current" />
          使用「元」（不选则用「圆」）
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <div
          class="pz-mode-btn"
          :class="mode === 'single' ? 'is-active' : ''"
          @click="mode = 'single'"
        >单个金额</div>
        <div
          class="pz-mode-btn"
          :class="mode === 'multiple' ? 'is-active' : ''"
          @click="mode = 'multiple'"
        >多个（每行一个）</div>
      </div>

      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">
          {{ direction === 'toUpper' ? '输入金额（数字）' : '输入大写金额' }}
        </label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea
        v-model="input"
        class="pz-url-textarea"
        :rows="mode === 'single' ? 3 : 7"
        :placeholder="direction === 'toUpper' ? '例如：1234.56' : '例如：人民币壹仟贰佰叁拾肆元伍角陆分'"
      />

      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">转换结果</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="copyOutput">
          <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制' }}
        </button>
      </div>
      <textarea
        v-model="output"
        readonly
        class="pz-url-textarea"
        :rows="mode === 'single' ? 3 : 7"
        style="font-size: var(--pz-text-lg); color: var(--pz-color-primary); font-weight: 600"
        placeholder="转换结果将显示在这里..."
      />
    </div>
  </div>
</template>
