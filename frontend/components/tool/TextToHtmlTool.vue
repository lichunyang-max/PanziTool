<script setup lang="ts">
/**
 * TextToHtmlTool.vue - 纯文本转 HTML
 *
 * 空行分段，段内换行转 <br>；可选 HTML 实体编码、去除空段落。
 */
import { Check, Copy, Trash2, Code2 } from 'lucide-vue-next'
import { copyToClipboard } from '~/utils/tools/text/textCore'
import { textToHtml, type HtmlMode } from '~/utils/tools/text/textOps'

useHead({
  titleTemplate: null,
  title: '文本转HTML工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线纯文本转HTML工具，自动生成段落p标签与换行br标签，支持特殊字符实体编码、去除空段落，本地浏览器处理免登录即用。' },
    { name: 'keywords', content: '文本转HTML,纯文本转网页,p标签,换行转br,在线HTML生成' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-to-html')

const input = ref('这是第一段，段内可以有\n换行。\n\n这是第二段。\n\n\n这是去除空行后的第三段。')
const output = ref('')
const copied = ref(false)
const mode = ref<HtmlMode>('p-br')
const opts = ref({ encodeEntities: true, addClass: false, removeEmptyParagraphs: true })
const paragraphCount = ref(0)

const modes: Array<{ value: HtmlMode; label: string }> = [
  { value: 'p-br', label: '段落 + 换行 <p><br>' },
  { value: 'p', label: '仅段落 <p>' },
  { value: 'br', label: '仅换行 <br>' },
]

function run() {
  reportEvent('tool_use', effectiveSlug.value)
  const result = textToHtml(input.value, {
    mode: mode.value,
    encodeEntities: opts.value.encodeEntities,
    removeEmptyParagraphs: opts.value.removeEmptyParagraphs,
  })
  let html = result.output
  if (opts.value.addClass && mode.value !== 'br') {
    html = html.replace(/<p>/g, '<p class="paragraph">')
  }
  output.value = html
  paragraphCount.value = result.paragraphCount
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
</script>

<template>
  <div>
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="h-input">输入纯文本（空行分段）</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="h-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="输入纯文本..." />
    </div>

    <div class="pz-card p-4 mb-6 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Code2 class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">转换设置</h2>
      </div>
      <div class="pz-mode-toggle flex-wrap">
        <button v-for="m in modes" :key="m.value" type="button" class="pz-mode-btn" :data-active="mode === m.value" @click="mode = m.value">{{ m.label }}</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label class="pz-option-row"><input v-model="opts.encodeEntities" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">特殊字符转 HTML 实体</span></label>
        <label class="pz-option-row"><input v-model="opts.addClass" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">为段落加 class</span></label>
        <label class="pz-option-row"><input v-model="opts.removeEmptyParagraphs" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">去除空段落</span></label>
      </div>
      <button type="button" class="pz-btn-primary self-start" @click="run">开始转换</button>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span v-if="paragraphCount" class="pz-badge pz-badge-primary">共 {{ paragraphCount }} 个段落</span>
        <span v-else />
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
          <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制代码' }}
        </button>
      </div>
      <pre class="pz-batch-output">{{ output || '// 生成的 HTML 将显示在这里' }}</pre>
    </div>
  </div>
</template>
