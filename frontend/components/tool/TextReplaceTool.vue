<script setup lang="ts">
/**
 * TextReplaceTool.vue - 文本批量替换
 *
 * 多个查找目标用 | 分隔；支持正则模式、全字匹配、区分大小写、仅替换首次。
 */
import { AlertCircle, Check, Copy, Trash2, Replace } from 'lucide-vue-next'
import { copyToClipboard } from '~/utils/tools/text/textCore'
import { replaceText } from '~/utils/tools/text/textOps'

useHead({
  titleTemplate: null,
  title: '文本批量替换工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线文本批量替换工具，多个目标一次替换，支持正则表达式、全字匹配、区分大小写、反向引用与仅替换首次，本地浏览器处理免登录即用。' },
    { name: 'keywords', content: '文本替换,批量替换,正则替换,查找替换,在线替换工具' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-replace')

const SAMPLE = '今天天气不错，cat 和 dog 在玩耍。\nThe cat sat with another Cat.'
const input = ref(SAMPLE)
const findText = ref('cat|dog')
const replaceWith = ref('动物')
const output = ref('')
const copied = ref(false)
const opts = ref({ caseSensitive: false, regexMode: true, wholeWord: false, firstOnly: false })

const ruleHits = ref<Array<{ find: string; hits: number }>>([])
const totalHits = ref(0)
const errorMsg = ref('')
const hasRun = ref(false)

function runReplace() {
  reportEvent('tool_use', effectiveSlug.value)
  errorMsg.value = ''
  const result = replaceText(input.value, {
    find: findText.value,
    replace: replaceWith.value,
    caseSensitive: opts.value.caseSensitive,
    regexMode: opts.value.regexMode,
    wholeWord: opts.value.wholeWord,
    firstOnly: opts.value.firstOnly,
  })
  if (result.error) {
    errorMsg.value = result.error
    output.value = ''
    ruleHits.value = []
    totalHits.value = 0
  } else {
    output.value = result.output
    ruleHits.value = result.ruleHits
    totalHits.value = result.totalHits
  }
  hasRun.value = true
}
function applyToInput() {
  if (output.value) input.value = output.value
}
function clearAll() {
  input.value = ''
  output.value = ''
  hasRun.value = false
  errorMsg.value = ''
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
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="replace-input">输入文本</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="replace-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="输入要处理的文本..." />
    </div>

    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Replace class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">替换规则</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--pz-color-text-secondary)">查找目标（多个用 | 分隔，留空规则忽略）</span>
          <input v-model="findText" type="text" class="pz-input" placeholder="如：cat|dog" >
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--pz-color-text-secondary)">替换为（留空表示删除）</span>
          <input v-model="replaceWith" type="text" class="pz-input" placeholder="如：动物" >
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label class="pz-option-row"><input v-model="opts.caseSensitive" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">区分大小写</span></label>
        <label class="pz-option-row"><input v-model="opts.regexMode" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">正则模式（支持 $1、$&amp; 反向引用）</span></label>
        <label class="pz-option-row"><input v-model="opts.wholeWord" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">全字匹配（\b）</span></label>
        <label class="pz-option-row"><input v-model="opts.firstOnly" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">每条仅替换首次命中</span></label>
      </div>
      <button type="button" class="pz-btn-primary self-start" @click="runReplace">执行替换</button>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="pz-badge pz-badge-primary">总命中 {{ totalHits }} 处</span>
          <span v-for="(r, i) in ruleHits" :key="i" class="pz-badge pz-badge-neutral">/{{ r.find }}/ → {{ r.hits }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="applyToInput">应用到输入</button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
            <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
      <div v-if="errorMsg" class="pz-error-text flex items-start gap-2" role="alert">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" style="color: var(--pz-state-error)" aria-hidden="true" /><span>{{ errorMsg }}</span>
      </div>
      <pre class="pz-batch-output">{{ output || '// 替换结果将显示在这里' }}</pre>
    </div>
  </div>
</template>
