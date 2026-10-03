<script setup lang="ts">
/**
 * TextWorkflowTool.vue - 文本处理工作流
 *
 * 从操作库添加多个步骤，按顺序串联执行；步骤可删除、上下移动、配置参数。
 * 工作流自动保存到 localStorage，最多 20 步。
 */
import { AlertCircle, ArrowDown, ArrowUp, Check, Copy, Play, Trash2, Workflow } from 'lucide-vue-next'
import {
  WORKFLOW_OPS,
  WORKFLOW_MAX_STEPS,
  createWorkflowStep,
  getWorkflowOpMeta,
  runWorkflow,
  type WorkflowStep,
} from '~/utils/tools/text/textWorkflow'
import { analyzeText, CASE_MODES, copyToClipboard } from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: '文本处理工作流 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线文本处理工作流，自由组合大小写转换、替换、正则、前后缀、去空行、去重、排序、行号等步骤，自动保存，批量文本一键流水线处理，本地浏览器运行。' },
    { name: 'keywords', content: '文本工作流,批量文本处理,文本流水线,多步处理,正则替换,行处理' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-workflow')

const STORAGE_KEY = 'pz-text-workflow-steps'

const input = ref('hello World\n\nfoo bar\nfoo bar\n  trim me  \nBanana\napple')
const output = ref('')
const copied = ref(false)
const steps = ref<WorkflowStep[]>([])
const errorMsg = ref('')
const charDelta = ref<number | null>(null)

function exampleSteps(): WorkflowStep[] {
  return [
    createWorkflowStep('trimLines'),
    createWorkflowStep('removeEmptyLines'),
    createWorkflowStep('dedupeLines'),
    createWorkflowStep('sortLines', 'asc'),
    createWorkflowStep('addLineNumbers'),
  ]
}

function addStep(op: WorkflowStep['op']) {
  if (steps.value.length >= WORKFLOW_MAX_STEPS) return
  const defaultParam = op === 'case' ? 'upper' : ''
  steps.value.push(createWorkflowStep(op, defaultParam))
}
function removeStep(id: string) {
  steps.value = steps.value.filter((s) => s.id !== id)
}
function moveStep(index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= steps.value.length) return
  const arr = [...steps.value]
  ;[arr[index], arr[target]] = [arr[target]!, arr[index]!]
  steps.value = arr
}
function clearSteps() {
  steps.value = []
  output.value = ''
  errorMsg.value = ''
}

function persist() {
  if (import.meta.client) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(steps.value))
    } catch {
      // 忽略写入异常
    }
  }
}
function restore() {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) steps.value = JSON.parse(raw) as WorkflowStep[]
    } catch {
      steps.value = []
    }
  }
  if (steps.value.length === 0) steps.value = exampleSteps()
}

function execute() {
  reportEvent('tool_use', effectiveSlug.value)
  errorMsg.value = ''
  const result = runWorkflow(input.value, steps.value)
  output.value = result.output
  charDelta.value = analyzeText(result.output).chars - analyzeText(input.value).chars
  if (result.error) errorMsg.value = result.error.message
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

watch(steps, persist, { deep: true })
onMounted(restore)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 操作库 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Workflow class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">操作库（点击添加到工作流）</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="op in WORKFLOW_OPS"
          :key="op.type"
          type="button"
          class="pz-mode-btn"
          :disabled="steps.length >= WORKFLOW_MAX_STEPS"
          @click="addStep(op.type)"
        >＋ {{ op.label }}</button>
      </div>
    </div>

    <!-- 当前工作流 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h3 class="text-sm font-semibold" style="color: var(--pz-color-text-primary)">
          当前工作流（{{ steps.length }}/{{ WORKFLOW_MAX_STEPS }} 步）
        </h3>
        <div class="flex gap-2">
          <button type="button" class="pz-btn-secondary" style="padding: 0.25rem 0.75rem" @click="steps = exampleSteps()">载入示例</button>
          <button type="button" class="pz-btn-secondary" style="padding: 0.25rem 0.75rem" @click="clearSteps">清除</button>
        </div>
      </div>

      <div v-if="steps.length === 0" class="text-center py-8 text-sm" style="color: var(--pz-color-text-tertiary)">
        还没有步骤，从上方操作库点击添加
      </div>

      <ol v-else class="flex flex-col gap-2">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
        >
          <span class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style="background: var(--pz-color-primary); color: #fff">{{ index + 1 }}</span>
          <span class="text-sm font-medium w-28 shrink-0" style="color: var(--pz-color-text-primary)">{{ getWorkflowOpMeta(step.op).label }}</span>

          <!-- 参数 -->
          <select
            v-if="getWorkflowOpMeta(step.op).paramType === 'caseMode'"
            v-model="step.param"
            class="pz-input"
            style="padding: 0.3rem 0.5rem; height: auto; flex: 1"
          >
            <option v-for="m in CASE_MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <select
            v-else-if="getWorkflowOpMeta(step.op).paramType === 'sortMode'"
            v-model="step.param"
            class="pz-input"
            style="padding: 0.3rem 0.5rem; height: auto; flex: 1"
          >
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>
          <input
            v-else-if="getWorkflowOpMeta(step.op).hasParam"
            v-model="step.param"
            type="text"
            class="pz-input"
            style="padding: 0.3rem 0.6rem; height: auto; flex: 1"
            :placeholder="getWorkflowOpMeta(step.op).paramPlaceholder"
          >
          <span v-else class="flex-1 text-xs" style="color: var(--pz-color-text-tertiary)">无参数</span>

          <div class="flex items-center gap-1 shrink-0">
            <button type="button" class="p-1.5 rounded" :disabled="index === 0" style="color: var(--pz-color-text-secondary)" aria-label="上移" @click="moveStep(index, -1)">
              <ArrowUp class="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" class="p-1.5 rounded" :disabled="index === steps.length - 1" style="color: var(--pz-color-text-secondary)" aria-label="下移" @click="moveStep(index, 1)">
              <ArrowDown class="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" class="p-1.5 rounded" style="color: var(--pz-state-error)" aria-label="删除" @click="removeStep(step.id)">
              <Trash2 class="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ol>
      <p class="text-xs" style="color: var(--pz-color-text-tertiary)">替换类参数格式：查找内容=&gt;替换内容（如 \\d+=&gt;# 表示把数字替换成 #）。工作流自动保存在本地浏览器。</p>
    </div>

    <!-- 输入 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="wf-input">输入文本</label>
      <textarea id="wf-input" v-model="input" class="pz-url-textarea" rows="6" placeholder="输入要按工作流处理的文本..." />
      <div class="flex items-center gap-3">
        <button type="button" class="pz-btn-primary" :disabled="steps.length === 0" @click="execute">
          <Play class="w-4 h-4" aria-hidden="true" />马上执行
        </button>
        <span v-if="charDelta !== null" class="text-xs" style="color: var(--pz-color-text-tertiary)">
          字符数变化 {{ charDelta >= 0 ? '+' : '' }}{{ charDelta }}
        </span>
      </div>
    </div>

    <!-- 输出 -->
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出结果</label>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.25rem 0.75rem" :disabled="!output" @click="doCopy">
          <component :is="copied ? Check : Copy" class="w-[14px] h-[14px]" aria-hidden="true" />{{ copied ? '已复制' : '复制结果' }}
        </button>
      </div>
      <div v-if="errorMsg" class="pz-error-text flex items-start gap-2" role="alert">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" style="color: var(--pz-state-error)" aria-hidden="true" /><span>{{ errorMsg }}</span>
      </div>
      <pre class="pz-batch-output">{{ output || '// 工作流执行结果将显示在这里' }}</pre>
    </div>
  </div>
</template>
