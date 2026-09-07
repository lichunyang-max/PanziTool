<script setup lang="ts">
/**
 * UuidGeneratorTool.vue - UUID 生成工具组件
 *
 * 严格参照 ui/pages/uuid-generator.html 的交互区结构：
 * 1. 模式切换（UUID v4 / UUID v7）— pz-mode-toggle
 * 2. 格式选项卡片：noHyphen / upper / braces 复选框
 * 3. 单条结果卡片：生成按钮 + 结果输出 + 复制
 * 4. 批量生成卡片：数量输入 + 批量生成 + 列表输出 + 复制全部
 *
 * SSR 注意：UUID 生成是随机的，禁止在 setup 顶层调用 generate
 * 产生输出预填（会水合不匹配）—— 用静态示例字符串预填 output，
 * 按钮点击时才客户端生成。
 */
import {
  AlertCircle,
  Check,
  Copy,
  Dices,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-vue-next'
import {
  generateUuid,
  generateUuidBatch,
  type UuidFormatOptions,
  type UuidVersion,
} from '~/utils/tools/uuid'

useHead({
  titleTemplate: null,
  title: 'UUID生成 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线UUID生成工具，支持UUID v4（纯随机）与v7（时间有序）双版本，可批量生成、自定义格式（去连字符/大写/大括号），免登录打开即用，本地生成保障安全。',
    },
    {
      name: 'keywords',
      content: 'UUID生成,UUID v4,UUID v7,GUID,批量生成',
    },
    {
      property: 'og:title',
      content: 'UUID生成 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线UUID生成工具，支持UUID v4（纯随机）与v7（时间有序）双版本，可批量生成、自定义格式，免登录打开即用，本地生成保障安全。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'uuid-generator',
)

// === 状态 ===
const version = ref<UuidVersion>('v4')
const noHyphen = ref(false)
const upper = ref(false)
const braces = ref(false)

// 静态示例 UUID（避免 SSR 水合不匹配，按钮点击才真生成）
const SAMPLE_OUTPUT = '550e8400-e29b-41d4-a716-446655440000'
const SAMPLE_BATCH = `550e8400-e29b-41d4-a716-446655440000
6ba7b810-9dad-11d1-80b4-00c04fd430c8
f47ac10b-58cc-4372-a567-0e02b2c3d479`

const output = ref(SAMPLE_OUTPUT)
const batchInput = ref('10')
const batchOutput = ref(SAMPLE_BATCH)
const batchCount = ref(10)
const error = ref('')

const copied = ref(false)
const batchCopied = ref(false)

const formatOptions = computed<UuidFormatOptions>(() => ({
  noHyphen: noHyphen.value,
  upper: upper.value,
  braces: braces.value,
}))

const versionHint = computed(() =>
  version.value === 'v4'
    ? 'UUID v4：纯随机 122 位，最常用版本'
    : 'UUID v7：毫秒时间戳前缀 + 随机，时间有序适合数据库主键',
)

const batchOutputText = computed(() => {
  if (!batchOutput.value) return '// 点击"批量生成"按钮'
  return batchOutput.value
})

const batchLineCount = computed(() =>
  batchOutput.value ? batchOutput.value.split('\n').length : 0,
)

// === 方法 ===
function setVersion(v: UuidVersion) {
  version.value = v
}

function generateSingle() {
  reportEvent('tool_use', effectiveSlug.value)
  error.value = ''
  try {
    output.value = generateUuid(version.value)
    if (noHyphen.value || upper.value || braces.value) {
      output.value = applyFormat(output.value)
    }
  } catch (err) {
    error.value = `生成失败：${err instanceof Error ? err.message : String(err)}`
    output.value = ''
  }
}

function applyFormat(uuid: string): string {
  let out = uuid
  if (noHyphen.value) out = out.replace(/-/g, '')
  if (upper.value) out = out.toUpperCase()
  if (braces.value) out = `{${out}}`
  return out
}

function doBatch() {
  const count = parseInt(batchInput.value, 10)
  if (!Number.isFinite(count) || count < 1 || count > 1000) {
    error.value = '生成数量必须在 1-1000 之间'
    return
  }
  reportEvent('tool_use', effectiveSlug.value)
  error.value = ''
  batchCount.value = count
  const result = generateUuidBatch(version.value, count, formatOptions.value)
  if (result.success && result.list) {
    batchOutput.value = result.list.join('\n')
  } else {
    batchOutput.value = ''
    error.value = result.error ?? '批量生成失败'
  }
}

function doClear() {
  output.value = ''
  error.value = ''
}

function doBatchClear() {
  batchOutput.value = ''
  batchCount.value = 0
  error.value = ''
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

async function doBatchCopy() {
  if (!batchOutput.value) return
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(batchOutput.value)
  if (ok) {
    batchCopied.value = true
    setTimeout(() => {
      batchCopied.value = false
    }, 1500)
  }
}
</script>

<template>
  <div>
    <!-- 1. 模式切换 -->
    <div class="flex items-center gap-3 mb-4">
      <div class="pz-mode-toggle" role="tablist" aria-label="UUID 版本">
        <button
          type="button"
          class="pz-mode-btn"
          role="tab"
          :data-active="version === 'v4' ? 'true' : undefined"
          :aria-selected="version === 'v4'"
          @click="setVersion('v4')"
        >
          UUID v4
        </button>
        <button
          type="button"
          class="pz-mode-btn"
          role="tab"
          :data-active="version === 'v7' ? 'true' : undefined"
          :aria-selected="version === 'v7'"
          @click="setVersion('v7')"
        >
          UUID v7
        </button>
      </div>
      <span
        class="text-xs whitespace-nowrap"
        style="color: var(--pz-color-text-tertiary)"
      >
        {{ versionHint }}
      </span>
    </div>

    <!-- 2. 格式选项 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Settings
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          格式选项
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="pz-option-row">
          <input
            v-model="noHyphen"
            type="checkbox"
            class="pz-option-checkbox"
          />
          <span class="pz-option-label">去除连字符</span>
        </label>
        <label class="pz-option-row">
          <input
            v-model="upper"
            type="checkbox"
            class="pz-option-checkbox"
          />
          <span class="pz-option-label">大写输出</span>
        </label>
        <label class="pz-option-row">
          <input
            v-model="braces"
            type="checkbox"
            class="pz-option-checkbox"
          />
          <span class="pz-option-label">大括号包裹 { }</span>
        </label>
      </div>
    </div>

    <!-- 3. 单条生成 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-uuid-output"
          >
            单条结果
          </label>
          <span
            class="text-xs"
            style="color: var(--pz-color-text-tertiary)"
          >
            {{ output.length }} 字符
          </span>
        </div>
        <textarea
          id="pz-uuid-output"
          v-model="output"
          class="pz-url-textarea"
          rows="2"
          readonly
          placeholder="点击生成按钮产生 UUID"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="generateSingle"
        >
          <RefreshCw class="w-4 h-4" aria-hidden="true" />
          生成
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doClear"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          清空
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
          {{ copied ? '已复制' : '复制结果' }}
        </button>
      </div>

      <div
        v-if="error"
        class="pz-error-text flex items-start gap-2"
        role="alert"
      >
        <AlertCircle
          class="w-4 h-4 shrink-0 mt-0.5"
          style="color: var(--pz-state-error)"
          aria-hidden="true"
        />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- 4. 批量生成 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Dices
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          批量生成
        </h2>
        <span
          class="text-sm"
          style="color: var(--pz-color-text-secondary)"
        >
          — 一次最多 1000 个，使用上方格式选项
        </span>
      </div>
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-uuid-count"
          >
            生成数量
          </label>
          <input
            id="pz-uuid-count"
            v-model="batchInput"
            type="number"
            min="1"
            max="1000"
            class="pz-input"
            style="width: 6rem"
            placeholder="1-1000"
          />
          <button
            type="button"
            class="pz-btn-primary whitespace-nowrap"
            @click="doBatch"
          >
            <RefreshCw class="w-4 h-4" aria-hidden="true" />
            批量生成
          </button>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            @click="doBatchClear"
          >
            <Trash2 class="w-4 h-4" aria-hidden="true" />
            清空
          </button>
        </div>

        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-uuid-batch-output"
          >
            批量结果（共 {{ batchLineCount }} 条）
          </label>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            @click="doBatchCopy"
          >
            <component
              :is="batchCopied ? Check : Copy"
              class="w-[14px] h-[14px]"
              aria-hidden="true"
            />
            {{ batchCopied ? '已复制' : '复制全部' }}
          </button>
        </div>
        <pre
          id="pz-uuid-batch-output"
          class="pz-batch-output"
        >{{ batchOutputText }}</pre>
      </div>
    </div>
  </div>
</template>
