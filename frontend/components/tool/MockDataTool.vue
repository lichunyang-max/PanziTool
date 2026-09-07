<script setup lang="ts">
/**
 * MockDataTool.vue - Mock 随机数据生成工具组件
 *
 * 严格参照 panziui/tools/mock-data.html 交互区结构：
 * 1. 字段配置卡片（字段勾选 + 生成数量 + 输出格式切换 + 操作按钮 + 错误展示）
 * 2. 生成结果卡片（带行数/格式元信息 + 代码块输出）
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 生成按钮 / Ctrl+Enter → tool_use 事件
 * - 复制结果 → copy 事件
 */
import {
  AlertCircle,
  Check,
  Copy,
  Database,
  Download,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-vue-next'
import {
  MOCK_FIELD_OPTIONS,
  MOCK_FORMAT_OPTIONS,
  type MockField,
  type MockFormat,
  generateMockRows,
  renderMock,
} from '~/utils/tools/mockData'

useHead({
  titleTemplate: null,
  title: 'Mock数据生成 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线Mock数据生成工具，批量生成手机号、姓名、地址、邮箱、身份证号等模拟数据，支持JSON/CSV/SQL输出，免登录打开即用，本地浏览器随机生成保障数据安全。',
    },
    {
      name: 'keywords',
      content: 'Mock数据,随机数据生成,手机号生成,身份证生成,测试数据,假数据',
    },
    {
      property: 'og:title',
      content: 'Mock数据生成 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线Mock数据生成工具，批量生成手机号、姓名、地址、邮箱、身份证号等模拟数据，支持JSON/CSV/SQL输出，免登录打开即用，本地浏览器随机生成保障数据安全。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'mock-data',
)

// === 状态 ===
const checked = ref<Record<MockField, boolean>>(
  MOCK_FIELD_OPTIONS.reduce(
    (acc, o) => {
      acc[o.value] = o.checked
      return acc
    },
    {} as Record<MockField, boolean>,
  ),
)
const count = ref(3)
const format = ref<MockFormat>('json')
const output = ref('')
const errorMsg = ref('')
const copied = ref(false)

// 保存最近一次生成的行与字段，便于切换格式时实时重渲染
const lastRows = ref<Record<string, string>[]>([])
const lastFields = ref<MockField[]>([])

const selectedFields = computed(() =>
  MOCK_FIELD_OPTIONS.filter((o) => checked.value[o.value]).map((o) => o.value),
)

const metaText = computed(() => {
  if (lastRows.value.length === 0) return ''
  const labels = lastFields.value
    .map((f) => MOCK_FIELD_OPTIONS.find((o) => o.value === f)?.label ?? f)
    .join('、')
  return `已生成 ${lastRows.value.length} 条记录 · 字段：${labels} · ${format.value.toUpperCase()} 格式`
})

// 预填充示例输出，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const SAMPLE_FIELDS: MockField[] = ['name', 'phone', 'email']
const initRows = generateMockRows(SAMPLE_FIELDS, 3)
lastRows.value = initRows
lastFields.value = [...SAMPLE_FIELDS]
output.value = renderMock(initRows, SAMPLE_FIELDS, 'json')

// === 方法 ===
function toggleFormat(fmt: MockFormat) {
  format.value = fmt
  // 已有数据时切换格式实时重渲染
  if (lastRows.value.length > 0) {
    output.value = renderMock(lastRows.value, lastFields.value, fmt)
  }
}

function doGenerate() {
  errorMsg.value = ''
  const fields = selectedFields.value
  if (fields.length === 0) {
    errorMsg.value = '请至少勾选一个字段'
    return
  }
  let c = count.value
  if (!Number.isFinite(c) || c < 1 || c > 500) {
    errorMsg.value = '生成数量必须在 1-500 之间'
    return
  }
  c = Math.floor(c)
  count.value = c

  const rows = generateMockRows(fields, c)
  lastRows.value = rows
  lastFields.value = fields
  output.value = renderMock(rows, fields, format.value)

  reportEvent('tool_use', effectiveSlug.value)
}

function doClear() {
  output.value = ''
  lastRows.value = []
  lastFields.value = []
  errorMsg.value = ''
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

function doDownload() {
  if (import.meta.server) return
  if (!output.value || lastRows.value.length === 0) {
    errorMsg.value = '请先生成数据'
    return
  }
  const ext =
    format.value === 'json' ? 'json' : format.value === 'csv' ? 'csv' : 'sql'
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mock-data-${lastRows.value.length}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  reportEvent('tool_use', effectiveSlug.value)
}

/** Ctrl/Cmd + Enter 触发生成 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    doGenerate()
  }
}
</script>

<template>
  <div>
    <!-- 1. 字段配置 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-4">
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
          字段配置
        </h2>
      </div>

      <!-- 字段勾选 -->
      <div class="flex flex-col gap-1">
        <div
          class="text-xs font-semibold mb-1"
          style="color: var(--pz-color-text-secondary)"
        >
          字段类型
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-1">
          <label
            v-for="opt in MOCK_FIELD_OPTIONS"
            :key="opt.value"
            class="pz-option-row"
          >
            <input
              v-model="checked[opt.value]"
              type="checkbox"
              class="pz-option-radio"
            />
            <span class="pz-option-label">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- 生成数量 -->
      <div class="flex flex-wrap items-center gap-3">
        <label
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
          for="pz-mock-count"
        >
          生成数量（1-500）
        </label>
        <input
          id="pz-mock-count"
          v-model.number="count"
          type="number"
          min="1"
          max="500"
          class="pz-input"
          style="width: 120px"
          @keydown="onKeydown"
        />
      </div>

      <!-- 输出格式 -->
      <div class="flex items-center gap-2 flex-wrap">
        <span
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
        >
          输出格式
        </span>
        <button
          v-for="opt in MOCK_FORMAT_OPTIONS"
          :key="opt.value"
          type="button"
          class="pz-tab"
          :data-active="format === opt.value ? 'true' : undefined"
          @click="toggleFormat(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="doGenerate"
        >
          <RefreshCw class="w-4 h-4" aria-hidden="true" />
          <span>生成数据</span>
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doCopy"
        >
          <component
            :is="copied ? Check : Copy"
            class="w-4 h-4"
            aria-hidden="true"
          />
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doDownload"
        >
          <Download class="w-4 h-4" aria-hidden="true" />
          <span>下载</span>
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doClear"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          <span>清空</span>
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

    <!-- 2. 生成结果 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Database
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            生成结果
          </h2>
        </div>
        <span
          v-if="metaText"
          class="text-xs"
          style="color: var(--pz-color-text-tertiary)"
        >
          {{ metaText }}
        </span>
      </div>
      <pre class="pz-code-block" style="max-height: 480px; overflow: auto">{{ output }}</pre>
    </div>
  </div>
</template>
