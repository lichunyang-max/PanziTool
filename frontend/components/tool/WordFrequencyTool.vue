<script setup lang="ts">
/**
 * WordFrequencyTool.vue - 词频统计
 *
 * 中英文分词词频，支持过滤、Top N、条形图/表格视图、CSV 导出。
 */
import { Download, Trash2, BarChart3 } from 'lucide-vue-next'
import { computeWordFrequency, type FrequencyFilters, type FrequencyResult } from '~/utils/tools/text/wordFrequency'
import { copyToClipboard } from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: '词频统计工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线词频统计工具，支持中英文分词、关键词密度分析、停用词过滤、Top榜、条形图与表格视图、CSV导出，本地浏览器处理不上传文本。' },
    { name: 'keywords', content: '词频统计,关键词密度,中文分词,词频分析,高频词,在线词频' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'word-frequency')

const MAX = 2000
const text = ref('数据分析 数据统计 数据分析工具 数据可视化 数据分析报告\n我们用数据分析来做数据分析，效率很高。data analysis data report')
const filters = ref<FrequencyFilters>({
  filterEnglishStopwords: false,
  filterChineseSingle: true,
  filterNumbers: false,
  filterPunctuation: true,
})
const limit = ref(20)
const view = ref<'bar' | 'table'>('bar')
const result = ref<FrequencyResult>({ items: [], total: 0, unique: 0 })
const elapsedMs = ref(0)

const filterDefs: Array<{ key: keyof FrequencyFilters; label: string }> = [
  { key: 'filterEnglishStopwords', label: '英文不统计介词等停用词' },
  { key: 'filterChineseSingle', label: '中文不统计单字' },
  { key: 'filterNumbers', label: '不统计纯数字' },
  { key: 'filterPunctuation', label: '不统计标点' },
]

watchEffect(() => {
  const start = typeof performance !== 'undefined' ? performance.now() : 0
  result.value = computeWordFrequency(text.value, filters.value)
  elapsedMs.value = typeof performance !== 'undefined' ? Math.max(1, Math.round(performance.now() - start)) : 0
})

// 实时统计无执行按钮：用户主动编辑文本后防抖上报一次 tool_use（页面挂载自带的示例不计）
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

const shownItems = computed(() => result.value.items.slice(0, limit.value))
const maxCount = computed(() => result.value.items[0]?.count || 1)

function barWidth(count: number): string {
  return `${Math.max(4, (count / maxCount.value) * 100)}%`
}

function toCsv(): string {
  const rows = [['词', '次数', '占比(%)']]
  for (const it of shownItems.value) {
    rows.push([it.word, String(it.count), it.percent.toFixed(2)])
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
}

async function exportCsv() {
  reportEvent('tool_use', effectiveSlug.value)
  const csv = '\ufeff' + toCsv()
  if (import.meta.client) {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'word-frequency.csv'
      a.click()
      URL.revokeObjectURL(url)
      return
    } catch {
      // 降级复制
    }
  }
  await copyToClipboard(csv)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="wf-input">输入文本（实时统计）</label>
        <div class="flex items-center gap-2">
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">{{ Array.from(text).length }}/{{ MAX }}</span>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="text = ''">
            <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />
          </button>
        </div>
      </div>
      <textarea id="wf-input" v-model="text" class="pz-url-textarea" rows="6" maxlength="2000" placeholder="粘贴文章或文本..." />
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <BarChart3 class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">统计选项</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label v-for="f in filterDefs" :key="f.key" class="pz-option-row">
          <input v-model="filters[f.key]" type="checkbox" class="pz-option-radio" >
          <span class="pz-option-label">{{ f.label }}</span>
        </label>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="pz-mode-toggle">
          <button type="button" class="pz-mode-btn" :data-active="limit === 10" @click="limit = 10">Top 10</button>
          <button type="button" class="pz-mode-btn" :data-active="limit === 20" @click="limit = 20">Top 20</button>
          <button type="button" class="pz-mode-btn" :data-active="limit === 50" @click="limit = 50">Top 50</button>
        </div>
        <div class="flex items-center gap-2">
          <div class="pz-mode-toggle">
            <button type="button" class="pz-mode-btn" :data-active="view === 'bar'" @click="view = 'bar'">条形图</button>
            <button type="button" class="pz-mode-btn" :data-active="view === 'table'" @click="view = 'table'">表格</button>
          </div>
          <button type="button" class="pz-btn-secondary" style="padding: 0.4rem 0.8rem" @click="exportCsv">
            <Download class="w-[14px] h-[14px]" aria-hidden="true" />CSV
          </button>
        </div>
      </div>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="pz-badge pz-badge-primary">总词数 {{ result.total }}</span>
        <span class="pz-badge pz-badge-neutral">去重词数 {{ result.unique }}</span>
        <span class="pz-badge pz-badge-neutral">耗时 {{ elapsedMs }} ms</span>
      </div>

      <div v-if="shownItems.length === 0" class="text-center py-10 text-sm" style="color: var(--pz-color-text-tertiary)">暂无可统计的词语</div>

      <!-- 条形图 -->
      <div v-else-if="view === 'bar'" class="flex flex-col gap-1.5">
        <div v-for="(it, i) in shownItems" :key="it.word + i" class="flex items-center gap-2">
          <span class="text-xs text-right shrink-0 w-24 truncate" style="color: var(--pz-color-text-secondary)">{{ it.word }}</span>
          <div class="flex-1 rounded" style="background: var(--pz-color-bg-secondary); height: 22px; overflow: hidden">
            <div class="h-full rounded flex items-center px-2" :style="{ width: barWidth(it.count), background: 'var(--pz-color-primary)', minWidth: '28px' }">
              <span class="text-[11px] text-white font-semibold">{{ it.count }}</span>
            </div>
          </div>
          <span class="text-[11px] shrink-0 w-14 text-right" style="color: var(--pz-color-text-tertiary)">{{ it.percent.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- 表格 -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="border-bottom: 1px solid var(--pz-color-border)">
              <th class="text-left p-2" style="color: var(--pz-color-text-tertiary)">排名</th>
              <th class="text-left p-2" style="color: var(--pz-color-text-tertiary)">词语</th>
              <th class="text-right p-2" style="color: var(--pz-color-text-tertiary)">次数</th>
              <th class="text-right p-2" style="color: var(--pz-color-text-tertiary)">占比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, i) in shownItems" :key="it.word + i" style="border-bottom: 1px solid var(--pz-color-border)">
              <td class="p-2" style="color: var(--pz-color-text-tertiary)">{{ i + 1 }}</td>
              <td class="p-2" style="color: var(--pz-color-text-primary)">{{ it.word }}</td>
              <td class="p-2 text-right" style="font-family: var(--pz-font-mono)">{{ it.count }}</td>
              <td class="p-2 text-right" style="font-family: var(--pz-font-mono)">{{ it.percent.toFixed(2) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
