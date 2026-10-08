<script setup lang="ts">
/**
 * CheckDateUppercaseTool.vue - 支票日期大写转换器
 *
 * 选择日期，实时输出票据规范的中文大写日期。
 */
import { Calendar, Check } from 'lucide-vue-next'
import { dateToCheckUppercase } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '支票日期大写转换器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线支票日期大写转换工具，按中国人民银行票据填写规范把出票日期转为中文大写，自动处理「零」字必写与可写的月份、日期规则，本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '支票日期大写,日期大写,票据日期,出票日期,中文大写日期' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'check-date-uppercase')
const { reportEvent } = useAnalytics()

const today = new Date()
const dateStr = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
)

const result = computed(() => {
  if (!dateStr.value) return ''
  const d = new Date(dateStr.value)
  if (isNaN(d.getTime())) return '无效日期'
  return dateToCheckUppercase(d)
})

// 将结果拆分为「数字部分」与「年/月/日单位」，单位单独着色缩小显示
const resultSegments = computed(() => {
  const r = result.value
  if (!r) return null
  const m = r.match(/^(.+?)(年)(.+?)(月)(.+?)(日)$/)
  if (!m) return null
  return [
    { text: m[1], isUnit: false },
    { text: m[2], isUnit: true },
    { text: m[3], isUnit: false },
    { text: m[4], isUnit: true },
    { text: m[5], isUnit: false },
    { text: m[6], isUnit: true },
  ]
})

let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(dateStr, () => {
  if (useReported) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
// 点击结果复制并弹出「复制成功」提示
const showCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
function copyResult() {
  if (!result.value) return
  navigator.clipboard?.writeText(result.value)
  showCopied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (showCopied.value = false), 1500)
}

onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Calendar class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">选择出票日期</h2>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">日期</label>
        <input
          type="date"
          v-model="dateStr"
          class="pz-input max-w-xs"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">票据规范大写日期</label>
        <div
          class="p-4 rounded-md text-xl font-bold cursor-pointer"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border); color: var(--pz-color-primary)"
          @click="copyResult"
          title="点击复制"
        >
          <template v-if="resultSegments">
            <span
              v-for="(seg, i) in resultSegments"
              :key="i"
              :class="seg.isUnit ? 'text-base align-baseline' : ''"
              :style="seg.isUnit ? 'color: var(--pz-color-text-tertiary); font-weight: 600' : ''"
            >{{ seg.text }}</span>
          </template>
          <span v-else>{{ result || '—' }}</span>
        </div>
        <p class="text-xs" style="color: var(--pz-color-text-tertiary)">点击结果可复制到剪贴板。票据日期必须使用壹、贰、叁等大写汉字，不得更改。</p>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <Transition name="cdc-toast">
      <div
        v-if="showCopied"
        class="cdc-toast"
        role="status"
      >
        <Check class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>复制成功</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cdc-toast {
  position: fixed;
  left: 50%;
  bottom: 2.5rem;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9999px;
  font-size: 13px;
  background: var(--pz-color-text-primary);
  color: var(--pz-color-bg);
  box-shadow: var(--pz-shadow-md);
}

.cdc-toast-enter-active,
.cdc-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cdc-toast-enter-from,
.cdc-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
</style>
