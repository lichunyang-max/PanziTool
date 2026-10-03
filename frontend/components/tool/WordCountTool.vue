<script setup lang="ts">
/**
 * WordCountTool.vue - 字数统计
 *
 * 实时统计，无需按钮。顶部快捷条 + 9 项详细指标。
 */
import { Trash2, Calculator } from 'lucide-vue-next'
import { countText } from '~/utils/tools/text/wordCount'

useHead({
  titleTemplate: null,
  title: '字数统计工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线字数统计工具，实时统计中文字数、字符数、UTF-8与GBK字节、单词数、段落数与阅读时长，兼容Word口径，本地浏览器处理免登录即用。' },
    { name: 'keywords', content: '字数统计,在线字数统计,字符统计,word字数,字节数统计,阅读时长' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'word-count')
const { reportEvent } = useAnalytics()

const text = ref('这是一段用于测试的示例文本。Hello World 2024！\n字数统计工具可以实时统计汉字、单词与字符。')
const result = computed(() => countText(text.value))

// 实时工具无执行按钮：用户主动输入后防抖上报一次 tool_use（页面挂载自带的示例不计）
let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(text, (val) => {
  if (useReported || !val.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})

const quickStats = computed(() => [
  { label: '总字数', value: result.value.total },
  { label: '行数', value: result.value.lines },
  { label: '段落', value: result.value.paragraphs },
  { label: '阅读时长', value: result.value.readingText, raw: true },
])

const metrics = computed(() => [
  { label: '总字数（Word口径）', value: result.value.total, hint: '汉字 / 连续字母 / 数字 / 符号各计 1' },
  { label: '字符数（UTF-8码点）', value: result.value.chars, hint: 'Emoji 计 1' },
  { label: '字符数（GBK字节）', value: result.value.bytesGbk, hint: 'ASCII 1 字节，中文 2 字节' },
  { label: 'UTF-8 字节', value: result.value.bytesUtf8, hint: '中文通常 3 字节' },
  { label: '汉字数', value: result.value.hanChars },
  { label: '汉字符号', value: result.value.hanPunctuation, hint: '全角标点' },
  { label: '外文字母', value: result.value.latinLetters, hint: '单个字母计数' },
  { label: '外文单词', value: result.value.latinWords, hint: '连续字母串' },
  { label: '数字串', value: result.value.numberRuns },
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="wc-input">输入或粘贴文本（实时统计）</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="text = ''">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="wc-input" v-model="text" class="pz-url-textarea" rows="7" placeholder="在此粘贴文章、作文或文案..." />

      <!-- 快捷条 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div
          v-for="q in quickStats"
          :key="q.label"
          class="flex flex-col items-center justify-center p-3 rounded-md"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
        >
          <span class="text-lg font-bold" style="color: var(--pz-color-primary); font-family: var(--pz-font-mono)">{{ q.value }}</span>
          <span class="text-xs mt-1" style="color: var(--pz-color-text-tertiary)">{{ q.label }}</span>
        </div>
      </div>
    </div>

    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <Calculator class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">详细指标</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div
          v-for="m in metrics"
          :key="m.label"
          class="p-3 rounded-md flex items-center justify-between"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
          :title="m.hint || ''"
        >
          <div class="flex flex-col">
            <span class="text-xs" style="color: var(--pz-color-text-secondary)">{{ m.label }}</span>
            <span v-if="m.hint" class="text-[11px]" style="color: var(--pz-color-text-tertiary)">{{ m.hint }}</span>
          </div>
          <span class="text-base font-semibold ml-3" style="font-family: var(--pz-font-mono); color: var(--pz-color-text-primary)">{{ m.value }}</span>
        </div>
      </div>
      <p class="text-xs mt-4" style="color: var(--pz-color-text-tertiary)">
        阅读时长按每分钟 300 字估算，不足 1 分钟显示「&lt;1 分钟」。所有统计均在本地完成，不上传文本。
      </p>
    </div>
  </div>
</template>
