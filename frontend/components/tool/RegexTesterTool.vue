<script setup lang="ts">
/**
 * RegexTesterTool.vue - 正则表达式测试工具组件
 *
 * 严格参照 ui/pages/正则表达式测试工具.html 的交互区结构：
 * 1. 正则输入栏卡片（正则 input + flags 按钮组 g/i/m/s/u + 执行按钮）
 * 2. 测试文本卡片（textarea + 示例/清空链接 + 匹配数提示）
 * 3. 匹配结果卡片（高亮展示区，<mark> 标记命中片段）
 * 4. 分组信息表卡片（动态列：匹配序号/完整匹配/分组1~N/位置）
 *
 * - 匹配逻辑调用 ~/utils/tools/regex 中的纯函数（含 ReDoS 防护）
 * - 高亮使用 highlightMatches 返回的 HTML（已转义防 XSS）
 * - 执行触发 reportEvent('tool_use', slug)，复制触发 reportEvent('copy', slug)
 * - 输入变化 300ms 防抖自动执行
 */
import { Play, Check, Copy, AlertCircle } from 'lucide-vue-next'
import {
  executeRegex,
  highlightMatches,
  type RegexResult,
} from '~/utils/tools/regex'
import { useAnalytics } from '~/composables/useAnalytics'

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

// === 默认值 ===
const DEFAULT_PATTERN = '\\b(\\w+)@(\\w+)\\.(\\w+)\\b'
const DEFAULT_TEXT =
  'Contact us at support@panzipool.com or admin@example.org for help.'

// === 响应式状态 ===
const pattern = ref(DEFAULT_PATTERN)
const testText = ref(DEFAULT_TEXT)
const flags = ref<Record<string, boolean>>({
  g: true,
  i: true,
  m: false,
  s: false,
  u: false,
})

const FLAG_LIST = ['g', 'i', 'm', 's', 'u'] as const

const flagsStr = computed(() =>
  FLAG_LIST.filter((f) => flags.value[f]).join(''),
)

const result = ref<RegexResult>({ success: true, matches: [] })

// === 计算属性 ===
const hasMatches = computed(
  () => result.value.success && result.value.matches.length > 0,
)
const matchCount = computed(() => result.value.matches.length)
const errorMessage = computed(() =>
  result.value.success ? '' : result.value.error || '执行出错',
)

const highlightedHtml = computed(() => {
  if (!result.value.success || result.value.matches.length === 0) {
    // 转义纯文本展示
    return escapeHtml(testText.value)
  }
  return highlightMatches(testText.value, result.value.matches)
})

const maxGroups = computed(() =>
  Math.max(0, ...result.value.matches.map((m) => m.groups.length)),
)

// === 方法 ===
function toggleFlag(flag: string) {
  flags.value[flag] = !flags.value[flag]
}

function execute() {
  reportEvent('tool_use', props.slug)
  result.value = executeRegex(pattern.value, flagsStr.value, testText.value)
}

function loadSample() {
  pattern.value = DEFAULT_PATTERN
  testText.value = DEFAULT_TEXT
  flags.value = { g: true, i: true, m: false, s: false, u: false }
  execute()
}

function clearAll() {
  pattern.value = ''
  testText.value = ''
  result.value = { success: true, matches: [] }
}

/** HTML 转义（用于无匹配时安全展示文本） */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// === 复制 ===
const copied = ref(false)

async function copyResults() {
  if (!hasMatches.value) return
  reportEvent('copy', props.slug)
  const text = result.value.matches.map((m) => m.fullMatch).join('\n')
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // 静默忽略复制失败
  }
}

// === 防抖自动执行 ===
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch([pattern, testText, flagsStr], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    execute()
  }, 300)
})

onMounted(() => {
  // 初始执行一次
  execute()
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- ============ 1. 正则输入栏卡片 ============ -->
    <div class="pz-card p-4">
      <div class="flex flex-col lg:flex-row lg:items-center gap-3">
        <label
          class="shrink-0 whitespace-nowrap"
          style="
            font-family: var(--pz-font-sans);
            font-size: var(--pz-text-sm);
            font-weight: var(--pz-weight-medium);
            color: var(--pz-color-text-primary);
          "
          for="pz-regex-input"
        >
          正则
        </label>
        <input
          id="pz-regex-input"
          v-model="pattern"
          type="text"
          class="pz-input flex-1 min-w-0"
          style="font-family: var(--pz-font-mono)"
          placeholder="输入正则表达式..."
          aria-label="正则表达式"
          spellcheck="false"
          @keydown.enter.prevent="execute"
        />
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span
            class="whitespace-nowrap"
            style="
              font-family: var(--pz-font-sans);
              font-size: var(--pz-text-xs);
              color: var(--pz-color-text-tertiary);
            "
          >
            Flags
          </span>
          <button
            v-for="flag in FLAG_LIST"
            :key="flag"
            type="button"
            class="pz-flag-toggle"
            :aria-pressed="flags[flag] ? 'true' : 'false'"
            :aria-label="`${flag} 标志`"
            @click="toggleFlag(flag)"
          >
            {{ flag }}
          </button>
        </div>
        <button
          type="button"
          class="pz-btn-primary shrink-0"
          @click="execute"
        >
          <Play class="pz-btn-icon-slide w-4 h-4" aria-hidden="true" />
          执行
        </button>
      </div>
      <!-- ReDoS 风险提示 -->
      <p
        class="mt-2"
        style="
          font-family: var(--pz-font-sans);
          font-size: var(--pz-text-xs);
          color: var(--pz-color-text-tertiary);
        "
      >
        try-catch 包裹执行，最大匹配数 10000 防止灾难性回溯
      </p>
    </div>

    <!-- ============ 2. 测试文本卡片 ============ -->
    <div class="pz-card p-4">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label
            class="shrink-0 whitespace-nowrap"
            style="
              font-family: var(--pz-font-sans);
              font-size: var(--pz-text-sm);
              font-weight: var(--pz-weight-medium);
              color: var(--pz-color-text-primary);
            "
            for="pz-test-text"
          >
            测试文本
          </label>
          <div class="flex items-center gap-4 shrink-0">
            <button
              type="button"
              class="pz-text-link whitespace-nowrap"
              style="
                font-family: var(--pz-font-sans);
                font-size: var(--pz-text-sm);
                color: var(--pz-color-primary);
              "
              @click="loadSample"
            >
              示例
            </button>
            <button
              type="button"
              class="pz-text-link whitespace-nowrap"
              style="
                font-family: var(--pz-font-sans);
                font-size: var(--pz-text-sm);
                color: var(--pz-color-text-secondary);
              "
              @click="clearAll"
            >
              清空
            </button>
          </div>
        </div>
        <textarea
          id="pz-test-text"
          v-model="testText"
          class="pz-textarea"
          style="height: 8rem"
          aria-label="测试文本"
          spellcheck="false"
        />
        <!-- 匹配数提示 -->
        <div
          v-if="result.success"
          class="flex items-center gap-1.5"
          style="
            font-family: var(--pz-font-sans);
            font-size: var(--pz-text-sm);
            color: var(--pz-color-text-secondary);
          "
        >
          <Check
            class="w-4 h-4"
            style="color: var(--pz-state-success)"
            aria-hidden="true"
          />
          找到 {{ matchCount }} 个匹配
        </div>
        <!-- 错误提示 -->
        <div
          v-else
          role="alert"
          class="flex items-center gap-1.5"
          style="
            font-family: var(--pz-font-sans);
            font-size: var(--pz-text-sm);
            color: var(--pz-state-error);
          "
        >
          <AlertCircle class="w-4 h-4" aria-hidden="true" />
          {{ errorMessage }}
        </div>
      </div>
    </div>

    <!-- ============ 3. 匹配结果卡片 ============ -->
    <div class="pz-card p-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <h2
            style="
              font-family: var(--pz-font-sans);
              font-size: var(--pz-text-sm);
              font-weight: var(--pz-weight-medium);
              color: var(--pz-color-text-primary);
            "
          >
            匹配结果
          </h2>
          <button
            type="button"
            class="pz-btn-secondary"
            :disabled="!hasMatches"
            @click="copyResults"
          >
            <Check v-if="copied" class="w-3.5 h-3.5" aria-hidden="true" />
            <Copy v-else class="w-3.5 h-3.5" aria-hidden="true" />
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
        <div
          class="overflow-x-auto pz-regex-highlight-box"
          style="
            font-family: var(--pz-font-mono);
            font-size: var(--pz-text-sm);
            background-color: var(--pz-color-bg-secondary);
            border: 1px solid var(--pz-color-border);
            border-radius: var(--pz-radius-md);
            padding: 0.75rem;
            color: var(--pz-color-text-primary);
            line-height: var(--pz-leading-relaxed);
          "
        >
          <span v-html="highlightedHtml" />
        </div>
      </div>
    </div>

    <!-- ============ 4. 分组信息表卡片 ============ -->
    <div class="pz-card p-4">
      <div class="flex flex-col gap-3">
        <h2
          style="
            font-family: var(--pz-font-sans);
            font-size: var(--pz-text-sm);
            font-weight: var(--pz-weight-medium);
            color: var(--pz-color-text-primary);
          "
        >
          分组信息
        </h2>
        <!-- 有匹配时显示表格 -->
        <div v-if="hasMatches" class="overflow-x-auto">
          <table
            class="w-full"
            style="
              font-family: var(--pz-font-sans);
              font-size: var(--pz-text-sm);
              border-collapse: collapse;
            "
          >
            <thead>
              <tr>
                <th
                  class="text-left whitespace-nowrap pz-regex-th"
                  style="min-width: 70px"
                >
                  匹配序号
                </th>
                <th
                  class="text-left whitespace-nowrap pz-regex-th"
                  style="min-width: 180px"
                >
                  完整匹配
                </th>
                <th
                  v-for="n in maxGroups"
                  :key="n"
                  class="text-left whitespace-nowrap pz-regex-th"
                  style="min-width: 90px"
                >
                  分组{{ n }}
                </th>
                <th
                  class="text-left whitespace-nowrap pz-regex-th"
                  style="min-width: 80px"
                >
                  位置
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(match, idx) in result.matches" :key="idx">
                <td class="pz-regex-td-whitespace">
                  {{ idx + 1 }}
                </td>
                <td class="pz-regex-td-mono">
                  {{ match.fullMatch }}
                </td>
                <td
                  v-for="(group, gi) in match.groups"
                  :key="gi"
                  class="pz-regex-td-mono"
                >
                  {{ group || '—' }}
                </td>
                <td class="pz-regex-td-whitespace pz-regex-td-mono">
                  {{ match.start }}-{{ match.end }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 无匹配时显示空状态 -->
        <div
          v-else
          class="text-center py-6"
          style="color: var(--pz-color-text-tertiary); font-size: var(--pz-text-sm)"
        >
          {{ result.success ? '暂无匹配结果' : '正则执行失败，请检查表达式' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === Flag toggle button === */
.pz-flag-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 0.1875rem 0.5625rem;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  border-radius: var(--pz-radius-full);
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.pz-flag-toggle[aria-pressed='true'] {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
}

.pz-flag-toggle[aria-pressed='false'] {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-secondary);
}

.pz-flag-toggle[aria-pressed='false']:hover {
  color: var(--pz-color-primary);
  border-color: var(--pz-color-primary-border);
}

.pz-flag-toggle:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}

/* === Textarea === */
.pz-textarea {
  width: 100%;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  color: var(--pz-color-text-primary);
  padding: 0.75rem;
  outline: none;
  resize: vertical;
  line-height: var(--pz-leading-relaxed);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.pz-textarea:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}

/* === Match highlight (inside v-html, use :deep) === */
.pz-regex-highlight-box :deep(.pz-match-highlight) {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
  border-radius: var(--pz-radius-sm);
  padding: 1px 3px;
  font-weight: var(--pz-weight-medium);
}

/* === Execute button icon slide micro-interaction === */
.pz-btn-icon-slide {
  transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pz-btn-primary:hover .pz-btn-icon-slide {
  transform: translateX(1px);
}

/* === Text link === */
.pz-text-link {
  transition: color 0.15s ease;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.pz-text-link:hover {
  color: var(--pz-color-primary-hover);
}

.pz-text-link:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}

/* === Group table cell styles === */
.pz-regex-th {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-primary);
  font-weight: var(--pz-weight-medium);
  border: 1px solid var(--pz-color-border);
  padding: 0.5rem 0.75rem;
}

.pz-regex-td-mono {
  border: 1px solid var(--pz-color-border);
  padding: 0.5rem 0.75rem;
  font-family: var(--pz-font-mono);
  color: var(--pz-color-text-primary);
}

.pz-regex-td-whitespace {
  border: 1px solid var(--pz-color-border);
  padding: 0.5rem 0.75rem;
  color: var(--pz-color-text-secondary);
  white-space: nowrap;
}

.pz-regex-td-whitespace.pz-regex-td-mono {
  font-family: var(--pz-font-mono);
}

@media (prefers-reduced-motion: reduce) {
  .pz-flag-toggle,
  .pz-textarea,
  .pz-btn-icon-slide,
  .pz-text-link {
    transition: none;
  }
}
</style>
