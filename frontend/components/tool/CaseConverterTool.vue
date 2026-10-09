<script setup lang="ts">
/**
 * CaseConverterTool.vue - 英文字母大小写转换
 *
 * 6 种模式：全大写 / 全小写 / 首字母 / 句首 / APA 标题 / 大小写反转
 * 支持自定义专有名词词库（锁定写法，如 iPhone、GitHub），仅作用于拉丁字母。
 */
import { AlertCircle, Check, Copy, RefreshCw, Trash2, Type } from 'lucide-vue-next'
import {
  analyzeText,
  CASE_MODES,
  convertCase,
  copyToClipboard,
  type CaseMode,
} from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: '英文字母大小写转换 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线英文字母大小写转换工具，支持全大写、全小写、首字母大写、句首大写、APA标题大小写及大小写反转，支持专有名词词库，本地浏览器处理免登录即用。',
    },
    {
      name: 'keywords',
      content: '大小写转换,大写转小写,首字母大写,标题大小写,英文转换,句子大小写',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'case-converter',
)

const SAMPLE = 'the quick brown fox jumps over the lazy dog.\nhello from github and iphone!'
const input = ref(SAMPLE)
const output = ref('')
const errorMsg = ref('')
const copied = ref(false)
const activeMode = ref<CaseMode | ''>('')
const autoCopy = ref(false)
const glossaryText = ref('iPhone, GitHub, JavaScript')

const analysis = computed(() => analyzeText(input.value))
const glossary = computed(() =>
  glossaryText.value.split(/[,，\s]+/).map((w) => w.trim()).filter(Boolean),
)

async function runConvert(mode: CaseMode) {
  activeMode.value = mode
  reportEvent('tool_use', effectiveSlug.value)
  errorMsg.value = ''
  output.value = convertCase(input.value, mode, glossary.value)
  if (autoCopy.value) {
    const ok = await copyToClipboard(output.value)
    if (ok) {
      copied.value = true
      setTimeout(() => (copied.value = false), 1200)
    }
  }
}

function applyToInput() {
  if (!output.value) return
  input.value = output.value
  output.value = ''
  activeMode.value = ''
}

function clearAll() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
  activeMode.value = ''
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
    <!-- 输入区 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="case-input">
          输入文本
        </label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" @click="clearAll">
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />清空
        </button>
      </div>
      <textarea id="case-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="输入英文文本，支持多行..." />

      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 rounded-md" style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)">
        <div class="flex flex-col"><span class="text-xs" style="color: var(--pz-color-text-tertiary)">字符数</span><span class="text-sm font-semibold" style="font-family: var(--pz-font-mono)">{{ analysis.chars }}</span></div>
        <div class="flex flex-col"><span class="text-xs" style="color: var(--pz-color-text-tertiary)">去空白</span><span class="text-sm font-semibold" style="font-family: var(--pz-font-mono)">{{ analysis.charsNoSpace }}</span></div>
        <div class="flex flex-col"><span class="text-xs" style="color: var(--pz-color-text-tertiary)">单词</span><span class="text-sm font-semibold" style="font-family: var(--pz-font-mono)">{{ analysis.words }}</span></div>
        <div class="flex flex-col"><span class="text-xs" style="color: var(--pz-color-text-tertiary)">行数</span><span class="text-sm font-semibold" style="font-family: var(--pz-font-mono)">{{ analysis.lines }}</span></div>
        <div class="flex flex-col"><span class="text-xs" style="color: var(--pz-color-text-tertiary)">字节</span><span class="text-sm font-semibold" style="font-family: var(--pz-font-mono)">{{ analysis.bytes }}</span></div>
      </div>
    </div>

    <!-- 模式 + 选项 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Type class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">选择转换模式</h2>
      </div>
      <div class="pz-mode-toggle mb-4">
        <button
          v-for="m in CASE_MODES"
          :key="m.value"
          type="button"
          class="pz-mode-btn"
          :data-active="activeMode === m.value"
          @click="runConvert(m.value)"
        >{{ m.label }}</button>
      </div>

      <div class="flex flex-col gap-3">
        <label class="pz-option-row">
          <input v-model="autoCopy" type="checkbox" class="pz-option-radio" >
          <span class="pz-option-label">转换后自动复制结果</span>
        </label>
        <div class="flex flex-col gap-1">
          <span class="text-xs" style="color: var(--pz-color-text-secondary)">自定义专有名词词库（逗号分隔，锁定写法）</span>
          <input v-model="glossaryText" type="text" class="pz-input" placeholder="iPhone, GitHub, MySQL" >
        </div>
      </div>
    </div>

    <!-- 结果区 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">结果</label>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="applyToInput">
            <RefreshCw class="w-[14px] h-[14px]" aria-hidden="true" />应用到输入
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
            <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
      <div v-if="errorMsg" class="pz-error-text flex items-start gap-2" role="alert">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" style="color: var(--pz-state-error)" aria-hidden="true" />
        <span>{{ errorMsg }}</span>
      </div>
      <pre class="pz-batch-output" style="min-height: 120px">{{ output || '// 点击上方模式按钮查看转换结果' }}</pre>
    </div>
  </div>
</template>
