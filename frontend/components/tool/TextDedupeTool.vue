<script setup lang="ts">
/**
 * TextDedupeTool.vue - 文本去重分隔
 *
 * 自定义输入/输出分隔符，支持去首尾空格、忽略大小写、保留首次顺序、字典序排序。
 */
import { AlertCircle, Check, Copy, Trash2, ListFilter, ArrowUpToLine } from 'lucide-vue-next'
import {
  SPLIT_DELIMITERS,
  JOIN_DELIMITERS,
  copyToClipboard,
} from '~/utils/tools/text/textCore'
import { dedupeItems } from '~/utils/tools/text/textOps'

useHead({
  titleTemplate: null,
  title: '文本去重分隔工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线文本去重分隔工具，自定义分隔符批量去除重复项，支持忽略大小写、保留顺序、字典序排序，本地浏览器处理免登录即用。' },
    { name: 'keywords', content: '文本去重,去重复,行去重,分隔符,批量去重,列表去重' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-dedupe')

const SAMPLE = '苹果\n香蕉\n苹果\n橙子\n香蕉\n  葡萄  \n芒果'
const input = ref(SAMPLE)
const output = ref('')
const copied = ref(false)

const splitKey = ref('newline')
const customSplit = ref('')
const joinKey = ref('comma')
const options = ref({ trimItems: true, ignoreCase: false, keepOrder: true, sort: false })

const splitDelimiter = computed(() =>
  splitKey.value === 'custom' ? customSplit.value : (SPLIT_DELIMITERS.find((d) => d.key === splitKey.value)?.value ?? '\n'),
)
const joinDelimiter = computed(() => JOIN_DELIMITERS.find((d) => d.key === joinKey.value)?.value ?? ',')

const stats = ref({ beforeCount: 0, afterCount: 0, removedCount: 0 })
const hasRun = ref(false)

function runDedupe() {
  reportEvent('tool_use', effectiveSlug.value)
  const result = dedupeItems(input.value, {
    splitDelimiter: splitDelimiter.value,
    joinDelimiter: joinDelimiter.value,
    trimItems: options.value.trimItems,
    ignoreCase: options.value.ignoreCase,
    keepOrder: options.value.keepOrder,
    sort: options.value.sort,
  })
  output.value = result.output
  stats.value = { beforeCount: result.beforeCount, afterCount: result.afterCount, removedCount: result.removedCount }
  hasRun.value = true
}

const applied = ref(false)
function applyToInput() {
  if (!output.value) return
  input.value = output.value
  applied.value = true
  setTimeout(() => (applied.value = false), 1500)
}
function clearAll() {
  input.value = ''
  output.value = ''
  hasRun.value = false
}
async function doCopy() {
  if (!output.value) return
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(output.value)
  if (ok) {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
}
</script>

<template>
  <div>
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="dedupe-input">输入内容（每行/每项一个）</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="dedupe-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="粘贴需要去重的内容..." />
    </div>

    <div class="pz-card p-4 mb-6 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <ListFilter class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">去重选项</h2>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">原分隔符</span>
        <div class="pz-mode-toggle">
          <button v-for="d in SPLIT_DELIMITERS" :key="d.key" type="button" class="pz-mode-btn" :data-active="splitKey === d.key" @click="splitKey = d.key">{{ d.label }}</button>
          <button type="button" class="pz-mode-btn" :data-active="splitKey === 'custom'" @click="splitKey = 'custom'">自定义</button>
        </div>
        <input v-if="splitKey === 'custom'" v-model="customSplit" type="text" class="pz-input" placeholder="输入自定义分隔符，如 | 或 #" >
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出分隔符</span>
        <div class="pz-mode-toggle flex-wrap">
          <button v-for="d in JOIN_DELIMITERS" :key="d.key" type="button" class="pz-mode-btn" :data-active="joinKey === d.key" @click="joinKey = d.key">{{ d.label }}</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label class="pz-option-row"><input v-model="options.trimItems" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">去除每项首尾空格</span></label>
        <label class="pz-option-row"><input v-model="options.ignoreCase" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">忽略大小写</span></label>
        <label class="pz-option-row"><input v-model="options.keepOrder" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">保留首次出现顺序</span></label>
        <label class="pz-option-row"><input v-model="options.sort" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">结果按字典序排序</span></label>
      </div>

      <button type="button" class="pz-btn-primary self-start" @click="runDedupe">开始去重</button>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="pz-badge pz-badge-neutral">去重前 {{ stats.beforeCount }} 项</span>
          <span class="pz-badge pz-badge-primary">去重后 {{ stats.afterCount }} 项</span>
          <span class="pz-badge pz-badge-neutral">移除重复 {{ stats.removedCount }} 项</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="applyToInput">
            <component :is="applied ? Check : ArrowUpToLine" class="w-[14px] h-[14px]" aria-hidden="true" />{{ applied ? '已应用' : '应用到输入' }}
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
            <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制结果' }}
          </button>
        </div>
      </div>
      <div v-if="hasRun && !output" class="pz-error-text flex items-center gap-2"><AlertCircle class="w-4 h-4" />没有可输出的内容</div>
      <pre class="pz-batch-output">{{ output || '// 去重结果将显示在这里' }}</pre>
    </div>
  </div>
</template>
