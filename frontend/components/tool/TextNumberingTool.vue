<script setup lang="ts">
/**
 * TextNumberingTool.vue - 文本增加序号
 *
 * 8 种序号格式，可配置起始值、步长、补零、跳过空行。
 */
import { Check, Copy, Trash2, ListOrdered } from 'lucide-vue-next'
import { copyToClipboard } from '~/utils/tools/text/textCore'
import {
  addNumbering,
  stripLineNumbers,
  NUMBERING_FORMATS,
  type NumberingFormat,
} from '~/utils/tools/text/textOps'

useHead({
  titleTemplate: null,
  title: '文本行号添加工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线文本行号添加工具，支持8种序号格式、自定义起始值与步长、自动补零、跳过空行，也可一键去除已有行号，本地处理免登录即用。' },
    { name: 'keywords', content: '添加行号,文本编号,序号生成,行首编号,去行号,在线编号' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-numbering')

const input = ref('第一项\n第二项\n\n第四项\n第五项')
const output = ref('')
const copied = ref(false)
const format = ref<NumberingFormat>('n.')
const start = ref(1)
const step = ref(1)
const opts = ref({ padZero: false, skipEmpty: true, trailingSpace: false })
const numberedCount = ref(0)

function run() {
  reportEvent('tool_use', effectiveSlug.value)
  const result = addNumbering(input.value, {
    format: format.value,
    start: Number(start.value) || 0,
    step: Number(step.value) || 1,
    padZero: opts.value.padZero,
    skipEmpty: opts.value.skipEmpty,
    trailingSpace: opts.value.trailingSpace,
  })
  output.value = result.output
  numberedCount.value = result.numberedCount
}
function strip() {
  reportEvent('tool_use', effectiveSlug.value)
  output.value = stripLineNumbers(input.value)
  numberedCount.value = 0
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
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="num-input">输入文本（每行一项）</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="num-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="粘贴需要编号的内容..." />
    </div>

    <div class="pz-card p-4 mb-6 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <ListOrdered class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">序号设置</h2>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">序号格式</span>
        <div class="pz-mode-toggle flex-wrap">
          <button v-for="f in NUMBERING_FORMATS" :key="f.value" type="button" class="pz-mode-btn" :data-active="format === f.value" @click="format = f.value">{{ f.label }}</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 max-w-xs">
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--pz-color-text-secondary)">起始值</span>
          <input v-model.number="start" type="number" class="pz-input" >
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--pz-color-text-secondary)">步长</span>
          <input v-model.number="step" type="number" class="pz-input" >
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label class="pz-option-row"><input v-model="opts.padZero" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">前置补零</span></label>
        <label class="pz-option-row"><input v-model="opts.skipEmpty" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">跳过空行</span></label>
        <label class="pz-option-row"><input v-model="opts.trailingSpace" type="checkbox" class="pz-option-radio" ><span class="pz-option-label">序号后加空格</span></label>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="pz-btn-primary" @click="run">添加序号</button>
        <button type="button" class="pz-btn-secondary" @click="strip">去除已有行号</button>
      </div>
    </div>

    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span v-if="numberedCount" class="pz-badge pz-badge-primary">共 {{ numberedCount }} 行已编号</span>
        <span v-else />
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
          <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制结果' }}
        </button>
      </div>
      <pre class="pz-batch-output">{{ output || '// 编号结果将显示在这里' }}</pre>
    </div>
  </div>
</template>
