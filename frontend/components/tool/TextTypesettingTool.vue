<script setup lang="ts">
/**
 * TextTypesettingTool.vue - 中英文排版纠正
 *
 * 8 项可开关规则一键纠正中英文混排空格、全角标点与专有名词大小写。
 */
import { Check, Copy, Trash2, Pilcrow } from 'lucide-vue-next'
import {
  typesetText,
  DEFAULT_TYPESETTING_OPTIONS,
  type TypesettingOptions,
} from '~/utils/tools/text/textTypesetting'
import { copyToClipboard } from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: '中英文排版纠正工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线中英文排版纠正工具，自动处理中英文之间空格、中文与数字空格、全角标点、折叠重复标点、专有名词大小写，跳过URL与代码，本地处理免登录即用。' },
    { name: 'keywords', content: '中英文排版,排版纠正,中英文加空格,全角标点,文案排版,自动排版' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-typesetting')

const SAMPLE = '我使用javascript和iphone开发,访问https://example.com查看文档。它的性能提升了30%,太赞了！！！'
const input = ref(SAMPLE)
const output = ref('')
const copied = ref(false)
const opts = ref<TypesettingOptions>({ ...DEFAULT_TYPESETTING_OPTIONS })
const stats = ref({ total: 0, spaceChanges: 0, punctuationChanges: 0, caseChanges: 0 })

const ruleLabels: Array<{ key: keyof TypesettingOptions; label: string }> = [
  { key: 'spaceBetweenCjkLatin', label: '中英文之间加空格' },
  { key: 'spaceBetweenCjkNumber', label: '中文与数字之间加空格' },
  { key: 'noSpaceNumberUnit', label: '数字与单位之间不加空格' },
  { key: 'noSpaceAroundFullwidthPunct', label: '全角标点与其他字符不加空格' },
  { key: 'collapseRepeatedPunct', label: '折叠重复标点' },
  { key: 'useFullwidthPunct', label: '使用全角中文标点（, : ! . ?）' },
  { key: 'keepEnglishHalfwidth', label: '英文整句保留半角' },
  { key: 'fixProperNoun', label: '专有名词大小写修正（iPhone/GitHub等）' },
]

function run() {
  reportEvent('tool_use', effectiveSlug.value)
  const r = typesetText(input.value, opts.value)
  output.value = r.output
  stats.value = { total: r.total, spaceChanges: r.spaceChanges, punctuationChanges: r.punctuationChanges, caseChanges: r.caseChanges }
}
function selectAll() {
  for (const k of Object.keys(opts.value) as Array<keyof TypesettingOptions>) opts.value[k] = true
}
function resetDefaults() {
  opts.value = { ...DEFAULT_TYPESETTING_OPTIONS }
}
function clearAll() {
  input.value = ''
  output.value = ''
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

onMounted(run)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="ts-input">输入需要排版的文本</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="ts-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="粘贴中英文混排文本..." />
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <Pilcrow class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">排版规则</h2>
        </div>
        <div class="flex gap-2">
          <button type="button" class="pz-btn-secondary" style="padding: 0.25rem 0.75rem" @click="selectAll">全选</button>
          <button type="button" class="pz-btn-secondary" style="padding: 0.25rem 0.75rem" @click="resetDefaults">恢复默认</button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label v-for="r in ruleLabels" :key="r.key" class="pz-option-row">
          <input v-model="opts[r.key]" type="checkbox" class="pz-option-radio" >
          <span class="pz-option-label">{{ r.label }}</span>
        </label>
      </div>
      <button type="button" class="pz-btn-primary self-start" @click="run">开始纠正</button>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="pz-badge pz-badge-primary">共纠正 {{ stats.total }} 处</span>
          <span class="pz-badge pz-badge-neutral">空格 {{ stats.spaceChanges }}</span>
          <span class="pz-badge pz-badge-neutral">标点 {{ stats.punctuationChanges }}</span>
          <span class="pz-badge pz-badge-neutral">大小写 {{ stats.caseChanges }}</span>
        </div>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
          <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制结果' }}
        </button>
      </div>
      <pre class="pz-batch-output">{{ output || '// 纠正后的文本将显示在这里' }}</pre>
    </div>
  </div>
</template>
