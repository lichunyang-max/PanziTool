<script setup lang="ts">
/**
 * StringToolkitTool.vue - 字符串工具箱组件
 *
 * 严格参照 ui/pages/string-toolkit.html 的交互区结构：
 * 1. 输入卡片：textarea + 实时统计栏（字符/字符去空白/字数/行数/字节数）
 * 2. 操作按钮卡片：按 group 分组渲染 STRING_OPERATIONS（case/naming/lines/other）
 * 3. 结果卡片：结果输出 + 复制 + "应用到输入"（链式操作）
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 操作按钮 → tool_use 事件
 * - 复制结果 → copy 事件
 */
import { AlertCircle, Check, Copy, RefreshCw, Trash2, Type } from 'lucide-vue-next'
import {
  analyzeString,
  applyStringOperation,
  STRING_OPERATIONS,
  type StringOperation,
  type StringOperationMeta,
} from '~/utils/tools/stringToolkit'

useHead({
  titleTemplate: null,
  title: '字符串工具箱 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线字符串工具箱，提供大小写转换、命名风格转换（camelCase/PascalCase/snake_case/kebab-case/CONSTANT_CASE）、行级处理（排序/去重/去空行/加行号）等功能，附实时字符统计，免登录打开即用，本地处理保障数据安全。',
    },
    {
      name: 'keywords',
      content: '字符串工具,大小写转换,camelCase,snake_case,kebab-case,行排序,行去重',
    },
    {
      property: 'og:title',
      content: '字符串工具箱 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线字符串工具箱，提供大小写转换、命名风格转换、行级处理等功能，附实时字符统计，免登录打开即用，本地处理保障数据安全。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'string-toolkit',
)

// 预填充示例数据
const SAMPLE_INPUT = 'hello world\nfoo bar baz\nhello world\n  trim me  '
const input = ref(SAMPLE_INPUT)
const output = ref('')
const errorMsg = ref('')
const copied = ref(false)

// 实时统计
const analysis = computed(() => analyzeString(input.value))

// 分组操作列表
const groupedOperations = computed(() => {
  const groups: Record<string, StringOperationMeta[]> = {
    case: [],
    naming: [],
    lines: [],
    other: [],
  }
  for (const op of STRING_OPERATIONS) {
    groups[op.group]!.push(op)
  }
  return groups
})

const groupLabels: Record<string, string> = {
  case: '大小写转换',
  naming: '命名风格',
  lines: '行级处理',
  other: '其他',
}

function applyOp(op: StringOperation) {
  reportEvent('tool_use', effectiveSlug.value)
  errorMsg.value = ''
  const result = applyStringOperation(input.value, op)
  if (result.success) {
    output.value = result.output ?? ''
  } else {
    output.value = ''
    errorMsg.value = result.error ?? '操作失败'
  }
}

function applyToInput() {
  if (!output.value) return
  input.value = output.value
  output.value = ''
}

function doClearInput() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}

function doClearOutput() {
  output.value = ''
  errorMsg.value = ''
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (import.meta.server) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 降级
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

async function doCopy() {
  if (!output.value) return
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(output.value)
  if (ok) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }
}
</script>

<template>
  <div>
    <!-- 1. 输入区 + 统计 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label
          class="text-xs font-semibold"
          style="color: var(--pz-color-text-secondary)"
          for="pz-str-input"
        >
          输入文本
        </label>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          style="padding: 0.25rem 0.75rem"
          @click="doClearInput"
        >
          <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />
          清空
        </button>
      </div>
      <textarea
        id="pz-str-input"
        v-model="input"
        class="pz-url-textarea"
        rows="6"
        placeholder="输入要处理的文本，支持多行..."
      />

      <!-- 统计栏 -->
      <div
        class="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 rounded-md"
        style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
      >
        <div class="flex flex-col">
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">字符数</span>
          <span
            class="text-sm font-semibold"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)"
          >{{ analysis.chars }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">去空白</span>
          <span
            class="text-sm font-semibold"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)"
          >{{ analysis.charsNoSpace }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">字数</span>
          <span
            class="text-sm font-semibold"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)"
          >{{ analysis.words }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">行数</span>
          <span
            class="text-sm font-semibold"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)"
          >{{ analysis.lines }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">字节数</span>
          <span
            class="text-sm font-semibold"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-mono)"
          >{{ analysis.bytes }}</span>
        </div>
      </div>
    </div>

    <!-- 2. 操作按钮（按 group 分组） -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Type
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          字符串操作
        </h2>
      </div>
      <div class="flex flex-col gap-4">
        <div
          v-for="(ops, group) in groupedOperations"
          :key="group"
          class="flex flex-col gap-2"
        >
          <div
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
          >
            {{ groupLabels[group] }}
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="op in ops"
              :key="op.value"
              type="button"
              class="pz-mode-btn"
              @click="applyOp(op.value)"
            >
              {{ op.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 结果区 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label
          class="text-xs font-semibold"
          style="color: var(--pz-color-text-secondary)"
          for="pz-str-output"
        >
          结果
        </label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            :disabled="!output"
            @click="applyToInput"
          >
            <RefreshCw class="w-[14px] h-[14px]" aria-hidden="true" />
            应用到输入
          </button>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            :disabled="!output"
            @click="doCopy"
          >
            <component
              :is="copied ? Check : Copy"
              class="w-[14px] h-[14px]"
              aria-hidden="true"
            />
            {{ copied ? '已复制' : '复制' }}
          </button>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            @click="doClearOutput"
          >
            <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />
            清空
          </button>
        </div>
      </div>

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

      <pre
        id="pz-str-output"
        class="pz-batch-output"
        style="min-height: 100px"
      >{{ output || '// 点击上方操作按钮查看结果' }}</pre>
    </div>
  </div>
</template>
