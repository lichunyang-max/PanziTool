<script setup lang="ts">
/**
 * TextReverseTool.vue - 文本反转排序
 *
 * 按字符 / 行 / 项目三种维度，支持翻转、升序、降序、随机打乱（Fisher-Yates）。
 */
import { Check, Copy, Trash2, ArrowLeftRight } from 'lucide-vue-next'
import { SPLIT_DELIMITERS, copyToClipboard } from '~/utils/tools/text/textCore'
import { reverseText, type ArrangeMode, type ReverseDimension } from '~/utils/tools/text/textOps'

useHead({
  titleTemplate: null,
  title: '文本反转排序工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线文本反转排序工具，支持按字符、行、项目翻转，以及升序、降序、随机打乱，本地浏览器处理免登录即用。' },
    { name: 'keywords', content: '文本反转,文字倒序,行翻转,随机打乱,文本排序,倒序工具' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-reverse')

const input = ref('第一行\n第二行\n第三行\n第四行')
const output = ref('')
const copied = ref(false)
const dimension = ref<ReverseDimension>('line')
const delimiterKey = ref('newline')
const arrange = ref<ArrangeMode>('reverse')
const status = ref('')

const dimensions: Array<{ value: ReverseDimension; label: string }> = [
  { value: 'char', label: '按字符' },
  { value: 'line', label: '按行' },
  { value: 'item', label: '按项目' },
]
const arranges: Array<{ value: ArrangeMode; label: string }> = [
  { value: 'reverse', label: '翻转' },
  { value: 'asc', label: '升序' },
  { value: 'desc', label: '降序' },
  { value: 'shuffle', label: '随机打乱' },
]

function run() {
  reportEvent('tool_use', effectiveSlug.value)
  const delimiter = SPLIT_DELIMITERS.find((d) => d.key === delimiterKey.value)?.value ?? '\n'
  const result = reverseText(input.value, { dimension: dimension.value, delimiter, arrange: arrange.value })
  output.value = result.output
  status.value = `${result.count} ${dimension.value === 'char' ? '字符' : '项'} · ${result.statusText}`
}
function clearAll() {
  input.value = ''
  output.value = ''
  status.value = ''
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
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="rev-input">输入文本</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="rev-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="输入需要反转或排序的文本..." />
    </div>

    <div class="pz-card p-4 mb-6 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <ArrowLeftRight class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">处理方式</h2>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">处理维度</span>
        <div class="pz-mode-toggle">
          <button v-for="d in dimensions" :key="d.value" type="button" class="pz-mode-btn" :data-active="dimension === d.value" @click="dimension = d.value">{{ d.label }}</button>
        </div>
      </div>
      <div v-if="dimension === 'item'" class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">项目分隔符</span>
        <div class="pz-mode-toggle flex-wrap">
          <button v-for="d in SPLIT_DELIMITERS.filter((x) => !['tab'].includes(x.key))" :key="d.key" type="button" class="pz-mode-btn" :data-active="delimiterKey === d.key" @click="delimiterKey = d.key">{{ d.label }}</button>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">排列方式</span>
        <div class="pz-mode-toggle">
          <button v-for="a in arranges" :key="a.value" type="button" class="pz-mode-btn" :data-active="arrange === a.value" @click="arrange = a.value">{{ a.label }}</button>
        </div>
      </div>
      <button type="button" class="pz-btn-primary self-start" @click="run">开始处理</button>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span v-if="status" class="pz-badge pz-badge-primary">{{ status }}</span>
        <span v-else />
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
          <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制结果' }}
        </button>
      </div>
      <pre class="pz-batch-output">{{ output || '// 结果将显示在这里' }}</pre>
    </div>
  </div>
</template>
