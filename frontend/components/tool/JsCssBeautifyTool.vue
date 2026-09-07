<script setup lang="ts">
/**
 * JsCssBeautifyTool.vue - JS/CSS 美化压缩工具组件
 *
 * 严格参照 panziui/tools/js-css-beautify.html 交互区结构：
 * 1. 语言切换（JavaScript / CSS）+ 操作切换（美化 / 压缩）
 * 2. 缩进选择（仅美化时有效）
 * 3. 输入区（textarea + 示例/清空/执行 + 错误展示）
 * 4. 结果区（带体积信息 + 复制）
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 执行按钮 / Ctrl+Enter → tool_use 事件
 * - 复制结果 → copy 事件
 */
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Settings,
  Trash2,
  Zap,
} from 'lucide-vue-next'
import {
  BC_EXAMPLES,
  processCode,
  type BcLang,
  type BcOp,
} from '~/utils/tools/jsCssBeautify'

useHead({
  titleTemplate: null,
  title: 'JS/CSS美化压缩 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线JS/CSS美化压缩工具，还原压缩混淆代码为可读格式，支持2/4空格缩进，正确处理字符串与正则字面量，阅读线上资源更轻松，本地浏览器处理免登录即用。',
    },
    {
      name: 'keywords',
      content: 'JS美化,CSS美化,JS压缩,CSS压缩,代码格式化,代码还原',
    },
    {
      property: 'og:title',
      content: 'JS/CSS美化压缩 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线JS/CSS美化压缩工具，还原压缩混淆代码为可读格式，支持2/4空格缩进，正确处理字符串与正则字面量，阅读线上资源更轻松，本地浏览器处理免登录即用。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'js-css-beautify',
)

// === 状态 ===
const lang = ref<BcLang>('js')
const op = ref<BcOp>('beautify')
const indent = ref<number>(2)

const input = ref('')
const output = ref('')
const errorMsg = ref('')
const sizeInfo = ref('')
const copied = ref(false)

const inputLabel = computed(
  () => `输入 ${lang.value === 'js' ? 'JavaScript' : 'CSS'} 代码`,
)
const inputPlaceholder = computed(
  () => `粘贴需要处理的 ${lang.value === 'js' ? 'JS' : 'CSS'} 代码...`,
)

// 预填充示例并执行，确保 SSR/预渲染时页面有实际内容
input.value = BC_EXAMPLES.js
const initResult = processCode(BC_EXAMPLES.js, 'js', 'beautify', 2)
output.value = initResult.success && initResult.output ? initResult.output : ''
sizeInfo.value = `输出 ${output.value.length} 字符`

// === 方法 ===
function switchLang(next: BcLang) {
  lang.value = next
  errorMsg.value = ''
}

function switchOp(next: BcOp) {
  op.value = next
  errorMsg.value = ''
}

function doConvert() {
  errorMsg.value = ''
  if (input.value === '' || input.value.trim() === '') {
    output.value = ''
    sizeInfo.value = ''
    return
  }

  const result = processCode(input.value, lang.value, op.value, indent.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
    if (op.value === 'minify') {
      const saved = input.value.length
        ? Math.round((1 - result.output.length / input.value.length) * 100)
        : 0
      sizeInfo.value = `原始 ${input.value.length} 字符 → 压缩后 ${result.output.length} 字符（节省 ${saved}%）`
    } else {
      sizeInfo.value = `输出 ${result.output.length} 字符`
    }
  } else {
    output.value = ''
    sizeInfo.value = ''
    errorMsg.value = result.error ?? '处理失败'
  }

  reportEvent('tool_use', effectiveSlug.value)
}

function doFillExample() {
  input.value = BC_EXAMPLES[lang.value]
  errorMsg.value = ''
}

function doClear() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
  sizeInfo.value = ''
}

/** 复制到剪贴板，带 execCommand 降级 */
async function copyToClipboard(text: string): Promise<void> {
  if (import.meta.server) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // 降级到 execCommand
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } catch {
    // 忽略复制失败
  }
  document.body.removeChild(ta)
}

async function doCopy() {
  if (!output.value) return
  await copyToClipboard(output.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
  reportEvent('copy', effectiveSlug.value)
}

/** Ctrl/Cmd + Enter 触发转换 */
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    doConvert()
  }
}
</script>

<template>
  <div>
    <!-- 1. 语言与操作切换 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          class="pz-tab"
          :data-active="lang === 'js' ? 'true' : undefined"
          @click="switchLang('js')"
        >
          JavaScript
        </button>
        <button
          type="button"
          class="pz-tab"
          :data-active="lang === 'css' ? 'true' : undefined"
          @click="switchLang('css')"
        >
          CSS
        </button>
        <span
          style="
            width: 1px;
            height: 20px;
            background: var(--pz-color-border);
            margin: 0 0.25rem;
          "
          aria-hidden="true"
        />
        <button
          type="button"
          class="pz-tab"
          :data-active="op === 'beautify' ? 'true' : undefined"
          @click="switchOp('beautify')"
        >
          美化
        </button>
        <button
          type="button"
          class="pz-tab"
          :data-active="op === 'minify' ? 'true' : undefined"
          @click="switchOp('minify')"
        >
          压缩
        </button>
      </div>

      <!-- 缩进选择（仅美化时有效） -->
      <div
        v-if="op === 'beautify'"
        class="flex items-center gap-2"
      >
        <label
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
          for="pz-jsbc-indent"
        >
          缩进
        </label>
        <select
          id="pz-jsbc-indent"
          v-model.number="indent"
          class="pz-input"
          style="width: 120px"
        >
          <option :value="2">2 空格</option>
          <option :value="4">4 空格</option>
        </select>
      </div>

      <!-- 输入区 -->
      <div class="flex flex-col gap-2">
        <label
          class="text-xs font-semibold"
          style="color: var(--pz-color-text-secondary)"
          for="pz-jsbc-input"
        >
          {{ inputLabel }}
        </label>
        <textarea
          id="pz-jsbc-input"
          v-model="input"
          class="pz-url-textarea"
          rows="10"
          :placeholder="inputPlaceholder"
          @keydown="onInputKeydown"
        />
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="doFillExample"
          >
            <Code2 class="w-4 h-4" aria-hidden="true" />
            <span>示例</span>
          </button>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="doClear"
          >
            <Trash2 class="w-4 h-4" aria-hidden="true" />
            <span>清空</span>
          </button>
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            @click="doConvert"
          >
            <Zap class="w-4 h-4" aria-hidden="true" />
            <span>执行</span>
          </button>
        </div>

        <!-- 错误展示 -->
        <div
          v-if="errorMsg"
          class="pz-error-text flex items-start gap-2"
          role="alert"
        >
          <AlertCircle
            class="w-4 h-4 shrink-0 mt-0.5"
            style="color: var(--pz-state-error)"
            aria-hidden="true"
          />
          <span>{{ errorMsg }}</span>
        </div>
      </div>
    </div>

    <!-- 2. 结果区 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Settings
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            结果
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="sizeInfo"
            class="text-xs"
            style="color: var(--pz-color-text-tertiary)"
          >
            {{ sizeInfo }}
          </span>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            @click="doCopy"
          >
            <component
              :is="copied ? Check : Copy"
              class="w-[14px] h-[14px]"
              aria-hidden="true"
            />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
        </div>
      </div>
      <pre class="pz-code-block" style="max-height: 480px; overflow: auto">{{ output }}</pre>
    </div>
  </div>
</template>
