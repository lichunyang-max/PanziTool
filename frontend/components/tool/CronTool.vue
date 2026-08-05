<script setup lang="ts">
/**
 * CronTool.vue - Cron 表达式工具组件
 *
 * 严格参照 panzitool-extension/pages/cron-tool.html 的交互区结构：
 * 1. 格式选择卡片（5 段 / 6 段切换）
 * 2. 表达式输入卡片（输入 + 校验按钮 + 错误提示）
 * 3. 常用模板卡片（一键填入）
 * 4. 中文解释卡片
 * 5. 未来触发时间预览卡片（默认 5 次，可配置）
 *
 * - 复用 utils/tools/cron.ts 纯函数业务逻辑
 * - 校验触发 reportEvent('tool_use')，复制触发 reportEvent('copy')
 */
import { ref, computed, watch } from 'vue'
import {
  CalendarClock,
  Settings2,
  PenTool,
  Languages,
  List,
  LayoutGrid,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-vue-next'
import {
  validateCron,
  explainCron,
  getNextTriggerTimes,
  getFieldInfos,
  type CronMode,
  type CronValidationResult,
} from '~/utils/tools/cron'
import { useAnalytics } from '~/composables/useAnalytics'

interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

const { data: adData } = await useAsyncData<AdItem | null>(
  'cron-dev-tool-middle-ad',
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    try {
      const response = await $fetch<{
        code: number
        data: AdItem[]
      }>('/api/v1/ads', {
        baseURL,
        params: { locationSymbol: 'dev_tool_middle' },
      })
      if (response.code === 0 && response.data && response.data.length > 0) {
        return response.data[0]
      }
      return null
    } catch {
      return null
    }
  },
  { default: () => null }
)

useHead({
  // 关闭全局标题模板，避免后缀重复拼接
  titleTemplate: null,
  // 页面主标题
  title: 'Cron表达式 | 盘子工具站',
  meta: [
    // 页面描述
    {
      name: 'description',
      content:
        '在线Cron表达式解析、合法性校验、中文释义、未来触发时间预览，支持5段/6段格式，适配Java、Linux定时任务调试，网页离线快速使用。',
    },
    // 关键词
    {
      name: 'keywords',
      content: 'Cron表达式,在线cron解析,定时任务校验,cron时间预览',
    },
    // 社交分享标题
    {
      property: 'og:title',
      content: 'Cron表达式 | 盘子工具站',
    },
    // 社交分享描述
    {
      property: 'og:description',
      content:
        '在线Cron表达式解析、合法性校验、中文释义、未来触发时间预览，支持5段/6段格式，适配Java、Linux定时任务调试，网页离线快速使用。',
    },
  ],
})

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

// === 模式切换 ===
const mode = ref<CronMode>('6-field')

const fieldInfos = computed(() => getFieldInfos(mode.value))

// === 表达式输入 ===
const expression = ref('0 30 9 ? * MON-FRI')

const validationResult = ref<CronValidationResult>({ valid: true })

function validate() {
  reportEvent('tool_use', props.slug)
  validationResult.value = validateCron(expression.value, mode.value)
  if (validationResult.value.valid) {
    computeDerived()
  } else {
    explanation.value = ''
    triggerTimes.value = []
  }
}

// === 中文解释 ===
const explanation = ref('')

// === 触发时间预览 ===
const previewCount = ref(5)
const triggerTimes = ref<Date[]>([])

function formatTriggerTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function computeDerived() {
  if (!validationResult.value.valid) {
    explanation.value = ''
    triggerTimes.value = []
    return
  }
  explanation.value = explainCron(expression.value, mode.value)
  triggerTimes.value = getNextTriggerTimes(
    expression.value,
    mode.value,
    previewCount.value
  )
}

// 次数变化时重新计算
watch(previewCount, () => {
  if (validationResult.value.valid) {
    triggerTimes.value = getNextTriggerTimes(
      expression.value,
      mode.value,
      previewCount.value
    )
  }
})

// 模式切换时重新校验与计算
watch(mode, () => {
  validate()
})

// === 常用模板 ===
interface CronTemplate {
  label: string
  expression: string
  mode: CronMode
}

const TEMPLATES: CronTemplate[] = [
  { label: '每分钟', expression: '* * * * *', mode: '5-field' },
  { label: '每小时整点', expression: '0 0 * * * ?', mode: '6-field' },
  { label: '每天 8 点', expression: '0 0 8 * * ?', mode: '6-field' },
  { label: '每天凌晨', expression: '0 0 0 * * ?', mode: '6-field' },
  { label: '工作日 9:30', expression: '0 30 9 ? * MON-FRI', mode: '6-field' },
  { label: '每月 1 日 0 点', expression: '0 0 0 1 * ?', mode: '6-field' },
  { label: '每 5 分钟', expression: '0 */5 * * * ?', mode: '6-field' },
  { label: '每 10 分钟', expression: '*/10 * * * *', mode: '5-field' },
  { label: '每周一 0 点', expression: '0 0 0 ? * MON', mode: '6-field' },
]

function applyTemplate(t: CronTemplate) {
  mode.value = t.mode
  expression.value = t.expression
  validate()
}

// === 复制 ===
const copiedKey = ref<string | null>(null)

async function copyToClipboard(text: string, key: string) {
  reportEvent('copy', props.slug)
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
    copiedKey.value = key
    setTimeout(() => {
      copiedKey.value = null
    }, 1500)
  } catch {
    // 静默忽略复制失败
  }
}

function copyTriggerTimes() {
  const text = triggerTimes.value
    .map((t, i) => `${i + 1}. ${formatTriggerTime(t)}`)
    .join('\n')
  copyToClipboard(text, 'trigger-times')
}

function copyExplanation() {
  copyToClipboard(explanation.value, 'explanation')
}

function copyExpression() {
  copyToClipboard(expression.value, 'expression')
}

// 初始校验与计算（客户端水合后）
onMounted(() => {
  validate()
})

// 字段含义说明
const fieldExamples = computed(() => {
  if (mode.value === '5-field') {
    return [
      { label: '分', range: '0-59', example: '0' },
      { label: '时', range: '0-23', example: '30' },
      { label: '日', range: '1-31', example: '*' },
      { label: '月', range: '1-12', example: '*' },
      { label: '周', range: '0-7（0 与 7 均为周日）', example: 'MON-FRI' },
    ]
  }
  return [
    { label: '秒', range: '0-59', example: '0' },
    { label: '分', range: '0-59', example: '30' },
    { label: '时', range: '0-23', example: '9' },
    { label: '日', range: '1-31', example: '?' },
    { label: '月', range: '1-12', example: '*' },
    { label: '周', range: '0-7（0 与 7 均为周日）', example: 'MON-FRI' },
  ]
})

const specialChars = [
  { char: '*', desc: '任意值' },
  { char: '?', desc: '不指定（仅日/周）' },
  { char: '-', desc: '范围，如 1-5' },
  { char: ',', desc: '列表，如 1,3,5' },
  { char: '/', desc: '步长，如 */5' },
  { char: 'L', desc: '最后，如 L 或 5L' },
  { char: 'W', desc: '工作日，如 15W' },
  { char: '#', desc: '第几个，如 6#3' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ===== 1. 格式选择 ===== -->
    <div class="pz-card p-5">
      <div class="flex items-center gap-2 mb-4">
        <Settings2
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          格式选择
        </h2>
      </div>
      <div class="pz-cron-mode-tabs">
        <button
          type="button"
          class="pz-cron-mode-tab"
          :class="{ 'is-active': mode === '6-field' }"
          @click="mode = '6-field'"
        >
          6段 秒-分-时-日-月-周
        </button>
        <button
          type="button"
          class="pz-cron-mode-tab"
          :class="{ 'is-active': mode === '5-field' }"
          @click="mode = '5-field'"
        >
          5段 分-时-日-月-周
        </button>
      </div>
      <!-- 字段含义提示 -->
      <div class="mt-4 pz-cron-fields">
        <div
          v-for="(f, i) in fieldExamples"
          :key="i"
          class="pz-cron-field-pill"
        >
          <span class="pz-cron-field-label">{{ f.label }}</span>
          <span class="pz-cron-field-range">{{ f.range }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 2. 表达式输入 ===== -->
    <div class="pz-card p-5">
      <div class="flex items-center gap-2 mb-4">
        <PenTool
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          输入 Cron 表达式
        </h2>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row">
        <input
          v-model="expression"
          type="text"
          class="pz-cron-input"
          placeholder="例如：0 30 9 ? * MON-FRI"
          aria-label="Cron 表达式输入"
          spellcheck="false"
          @keydown.enter.prevent="validate"
        />
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="validate"
        >
          <CheckCircle2 class="w-4 h-4" aria-hidden="true" />
          校验
        </button>
      </div>

      <!-- 校验结果 -->
      <div
        v-if="!validationResult.valid && validationResult.error"
        class="pz-cron-alert pz-cron-alert-error mt-4"
        role="alert"
      >
        <AlertCircle class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{{ validationResult.error }}</span>
      </div>
      <div
        v-else-if="validationResult.valid && expression"
        class="pz-cron-alert pz-cron-alert-success mt-4"
      >
        <CheckCircle2 class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>表达式合法</span>
      </div>

      <!-- 特殊字符说明 -->
      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="sc in specialChars"
          :key="sc.char"
          class="pz-cron-special-char"
        >
          <code>{{ sc.char }}</code>
          <span style="color: var(--pz-color-text-secondary)">{{ sc.desc }}</span>
        </span>
      </div>
    </div>

    <!-- ===== 3. 常用模板 ===== -->
    <div class="pz-card p-5">
      <div class="flex items-center gap-2 mb-4">
        <LayoutGrid
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          常用模板
        </h2>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="t in TEMPLATES"
          :key="t.label"
          type="button"
          class="pz-cron-template"
          @click="applyTemplate(t)"
        >
          <span class="pz-cron-template-label">{{ t.label }}</span>
          <code class="pz-cron-template-code">{{ t.expression }}</code>
        </button>
      </div>
    </div>

    <!-- ===== 4. 中文解释 ===== -->
    <div class="pz-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Languages
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            中文解释
          </h2>
        </div>
        <button
          v-if="explanation"
          type="button"
          class="pz-btn-secondary pz-cron-copy-btn"
          @click="copyExplanation"
        >
          <Check
            v-if="copiedKey === 'explanation'"
            class="w-3.5 h-3.5"
            aria-hidden="true"
          />
          <Copy v-else class="w-3.5 h-3.5" aria-hidden="true" />
          {{ copiedKey === 'explanation' ? '已复制' : '复制' }}
        </button>
      </div>
      <div class="pz-cron-explain">
        <p v-if="explanation" style="color: var(--pz-color-text-primary)">
          {{ explanation }}
        </p>
        <p v-else style="color: var(--pz-color-text-tertiary)">
          输入合法表达式后展示中文解释
        </p>
      </div>
    </div>

    <!-- ===== 5. 触发时间预览 ===== -->
    <div class="pz-card p-5">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <List
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            未来 {{ previewCount }} 次触发时间
          </h2>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <label
            class="text-xs flex items-center gap-1"
            style="color: var(--pz-color-text-secondary)"
            for="pz-cron-count"
          >
            次数
          </label>
          <input
            id="pz-cron-count"
            v-model.number="previewCount"
            type="number"
            min="1"
            max="50"
            class="pz-cron-count-input"
          />
          <button
            v-if="triggerTimes.length > 0"
            type="button"
            class="pz-btn-secondary pz-cron-copy-btn"
            @click="copyTriggerTimes"
          >
            <Check
              v-if="copiedKey === 'trigger-times'"
              class="w-3.5 h-3.5"
              aria-hidden="true"
            />
            <Copy v-else class="w-3.5 h-3.5" aria-hidden="true" />
            {{ copiedKey === 'trigger-times' ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
      <div v-if="triggerTimes.length > 0" class="pz-cron-table-wrap">
        <table class="pz-cron-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>触发时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, i) in triggerTimes" :key="i">
              <td style="color: var(--pz-color-text-secondary)">{{ i + 1 }}</td>
              <td class="pz-cron-mono-cell">{{ formatTriggerTime(t) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="pz-cron-empty"
        style="color: var(--pz-color-text-tertiary)"
      >
        请输入合法表达式后查看触发时间
      </div>
    </div>

    <!-- ============ 广告位 ============ -->
    <StaticAdCard
      v-if="adData"
      id="cronMiddle"
      :title="adData.product_description"
      :image-url="adData.product_url"
      :link-url="adData.ad_url"
    />

    <!-- ===== 6. 字段信息表 ===== -->
    <div class="pz-card p-5">
      <div class="flex items-center gap-2 mb-4">
        <Clock
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          字段信息（{{ mode === '5-field' ? '5 段' : '6 段' }}模式）
        </h2>
        <button
          type="button"
          class="pz-btn-secondary pz-cron-copy-btn ml-auto"
          @click="copyExpression"
        >
          <Check
            v-if="copiedKey === 'expression'"
            class="w-3.5 h-3.5"
            aria-hidden="true"
          />
          <Copy v-else class="w-3.5 h-3.5" aria-hidden="true" />
          {{ copiedKey === 'expression' ? '已复制' : '复制表达式' }}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-cron-table">
          <thead>
            <tr>
              <th>字段</th>
              <th>最小值</th>
              <th>最大值</th>
              <th>示例</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, i) in fieldInfos" :key="i">
              <td style="color: var(--pz-color-text-primary); font-weight: 500">
                {{ f.label }}
              </td>
              <td class="pz-cron-mono-cell">{{ f.min }}</td>
              <td class="pz-cron-mono-cell">{{ f.max }}</td>
              <td class="pz-cron-mono-cell" style="color: var(--pz-color-text-secondary)">
                {{ fieldExamples[i]?.example || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === Mode tabs === */
.pz-cron-mode-tabs {
  display: inline-flex;
  gap: 0;
  background: var(--pz-color-bg-secondary);
  border-radius: var(--pz-radius-md);
  padding: 4px;
  border: 1px solid var(--pz-color-border-light);
}
.pz-cron-mode-tab {
  padding: 0.5rem 1rem;
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--pz-radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.pz-cron-mode-tab:hover {
  color: var(--pz-color-text-primary);
}
.pz-cron-mode-tab.is-active {
  background: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.pz-cron-mode-tab:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}

/* === Field pills === */
.pz-cron-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.pz-cron-field-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border-light);
  border-radius: var(--pz-radius-full);
  font-size: var(--pz-text-xs);
}
.pz-cron-field-label {
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-primary);
}
.pz-cron-field-range {
  color: var(--pz-color-text-secondary);
  font-family: var(--pz-font-mono);
}

/* === Expression input === */
.pz-cron-input {
  flex: 1;
  min-width: 0;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-base);
  color: var(--pz-color-text-primary);
  background: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.625rem 0.875rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.pz-cron-input:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}

/* === Alerts === */
.pz-cron-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--pz-radius-md);
  font-size: var(--pz-text-sm);
}
.pz-cron-alert-error {
  background: var(--pz-state-error-bg);
  border: 1px solid var(--pz-state-error-border);
  color: var(--pz-state-error);
}
.pz-cron-alert-success {
  background: var(--pz-state-success-bg);
  border: 1px solid var(--pz-state-success-border);
  color: var(--pz-state-success);
}

/* === Special chars === */
.pz-cron-special-char {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: var(--pz-color-bg-secondary);
  border-radius: var(--pz-radius-sm);
  font-size: var(--pz-text-xs);
}
.pz-cron-special-char code {
  font-family: var(--pz-font-mono);
  color: var(--pz-color-primary);
  font-weight: var(--pz-weight-semibold);
}

/* === Explanation box === */
.pz-cron-explain {
  background: var(--pz-color-bg-secondary);
  border-radius: var(--pz-radius-md);
  padding: 0.875rem 1rem;
  font-size: var(--pz-text-sm);
}

/* === Count input === */
.pz-cron-count-input {
  width: 64px;
  padding: 0.25rem 0.5rem;
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  background: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-sm);
  outline: none;
  text-align: center;
}
.pz-cron-count-input:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 2px var(--pz-color-primary-lighter);
}

/* === Table === */
.pz-cron-table-wrap {
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  overflow: hidden;
}
.pz-cron-table {
  width: 100%;
  border-collapse: collapse;
}
.pz-cron-table th {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  text-align: left;
  padding: 0.625rem 0.875rem;
  background: var(--pz-color-bg-secondary);
  border-bottom: 1px solid var(--pz-color-border);
  white-space: nowrap;
}
.pz-cron-table td {
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}
.pz-cron-table tr:last-child td {
  border-bottom: none;
}
.pz-cron-mono-cell {
  font-family: var(--pz-font-mono);
}

.pz-cron-empty {
  padding: 1.5rem;
  text-align: center;
  font-size: var(--pz-text-sm);
  background: var(--pz-color-bg-secondary);
  border-radius: var(--pz-radius-md);
}

/* === Copy button === */
.pz-cron-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  font-size: var(--pz-text-xs);
}

/* === Template cards === */
.pz-cron-template {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem;
  background: var(--pz-color-bg);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pz-cron-template:hover {
  border-color: var(--pz-color-primary-border);
  box-shadow: var(--pz-shadow-sm);
}
.pz-cron-template:active {
  transform: translateY(1px);
}
.pz-cron-template:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}
.pz-cron-template-label {
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  transition: color 0.15s ease;
}
.pz-cron-template:hover .pz-cron-template-label {
  color: var(--pz-color-primary);
}
.pz-cron-template-code {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-secondary);
  word-break: break-all;
}

@media (prefers-reduced-motion: reduce) {
  .pz-cron-mode-tab,
  .pz-cron-input,
  .pz-cron-template {
    transition: none;
  }
}
</style>
