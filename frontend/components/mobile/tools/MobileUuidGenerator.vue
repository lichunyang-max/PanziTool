<script setup lang="ts">
/**
 * MobileUuidGenerator.vue - 移动端 UUID 生成工具
 *
 * 单列布局：
 * 1. 版本切换（v4 / v7）select
 * 2. 格式选项（去连字符 / 大写 / 大括号）switch
 * 3. 单条生成：按钮 + 结果 + 复制
 * 4. 批量生成：数量输入 + 按钮 + 结果 + 复制全部
 *
 * SSR 注意：UUID 随机生成，禁止在 setup 顶层调用产生输出预填
 * （会水合不匹配）—— 用静态示例字符串预填 output。
 */
import {
  generateUuid,
  generateUuidBatch,
  type UuidFormatOptions,
  type UuidVersion,
} from '~/utils/tools/uuid'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'uuid-generator',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

// 静态示例 UUID（避免 SSR 水合不匹配，按钮点击才真生成）
const SAMPLE_OUTPUT = '550e8400-e29b-41d4-a716-446655440000'
const SAMPLE_BATCH = `550e8400-e29b-41d4-a716-446655440000
6ba7b810-9dad-11d1-80b4-00c04fd430c8
f47ac10b-58cc-4372-a567-0e02b2c3d479`

const version = ref<UuidVersion>('v4')
const noHyphen = ref(false)
const upper = ref(false)
const braces = ref(false)

const output = ref(SAMPLE_OUTPUT)
const batchCount = ref('10')
const batchOutput = ref(SAMPLE_BATCH)
const errorMsg = ref('')
const copied = ref(false)
const batchCopied = ref(false)

const formatOptions = computed<UuidFormatOptions>(() => ({
  noHyphen: noHyphen.value,
  upper: upper.value,
  braces: braces.value,
}))

function applyFormat(uuid: string): string {
  let out = uuid
  if (noHyphen.value) out = out.replace(/-/g, '')
  if (upper.value) out = out.toUpperCase()
  if (braces.value) out = `{${out}}`
  return out
}

function handleGenerateSingle() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  try {
    output.value = generateUuid(version.value)
    if (noHyphen.value || upper.value || braces.value) {
      output.value = applyFormat(output.value)
    }
  } catch (err) {
    output.value = ''
    errorMsg.value = `生成失败：${err instanceof Error ? err.message : String(err)}`
  }
}

function handleBatch() {
  const count = parseInt(batchCount.value, 10)
  if (!Number.isFinite(count) || count < 1 || count > 1000) {
    errorMsg.value = '生成数量必须在 1-1000 之间'
    return
  }
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  const result = generateUuidBatch(version.value, count, formatOptions.value)
  if (result.success && result.list) {
    batchOutput.value = result.list.join('\n')
  } else {
    batchOutput.value = ''
    errorMsg.value = result.error ?? '批量生成失败'
  }
}

function handleClearSingle() {
  output.value = ''
  errorMsg.value = ''
}

function handleClearBatch() {
  batchOutput.value = ''
  errorMsg.value = ''
}

async function handleCopySingle() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 静默忽略
  }
}

async function handleCopyBatch() {
  if (!batchOutput.value) return
  try {
    await navigator.clipboard.writeText(batchOutput.value)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    batchCopied.value = true
    setTimeout(() => { batchCopied.value = false }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 选项区 -->
    <div class="m-tool__card">
      <div class="m-tool__row">
        <span class="m-tool__label">UUID 版本</span>
        <select v-model="version" class="m-tool__select">
          <option value="v4">UUID v4（纯随机）</option>
          <option value="v7">UUID v7（时间有序）</option>
        </select>
      </div>
      <div class="m-tool__row">
        <span class="m-tool__label">去连字符</span>
        <label class="m-tool__switch">
          <input type="checkbox" v-model="noHyphen" />
          <span class="m-tool__switch-slider"></span>
        </label>
      </div>
      <div class="m-tool__row">
        <span class="m-tool__label">大写输出</span>
        <label class="m-tool__switch">
          <input type="checkbox" v-model="upper" />
          <span class="m-tool__switch-slider"></span>
        </label>
      </div>
      <div class="m-tool__row">
        <span class="m-tool__label">大括号包裹</span>
        <label class="m-tool__switch">
          <input type="checkbox" v-model="braces" />
          <span class="m-tool__switch-slider"></span>
        </label>
      </div>
    </div>

    <!-- 单条生成 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">单条结果</span>
        <button
          type="button"
          class="m-tool__link"
          :disabled="!output"
          @click="handleCopySingle"
        >{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <pre class="m-tool__code"><code>{{ output }}</code></pre>
    </div>

    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleGenerateSingle">生成</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClearSingle">清空</button>
    </div>

    <!-- 批量生成 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">批量生成</span>
        <button
          type="button"
          class="m-tool__link"
          :disabled="!batchOutput"
          @click="handleCopyBatch"
        >{{ batchCopied ? '已复制' : '复制全部' }}</button>
      </div>
      <div class="m-tool__row">
        <span class="m-tool__label">数量</span>
        <input
          v-model="batchCount"
          type="number"
          min="1"
          max="1000"
          class="m-tool__input"
          placeholder="1-1000"
        />
      </div>
      <pre class="m-tool__code m-tool__code--batch"><code>{{ batchOutput }}</code></pre>
    </div>

    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleBatch">批量生成</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClearBatch">清空</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">操作失败</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.m-tool {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #ede9fe;
  --m-color-primary-lighter: #ddd6fe;
  --m-color-surface: #ffffff;
  --m-color-bg: #f9fafb;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-error: #ef4444;
  --m-color-error-bg: #fef2f2;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-tool__card {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-tool__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.m-tool__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
}

.m-tool__link {
  background: none;
  border: none;
  color: var(--m-color-primary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__link:active {
  opacity: 0.7;
}

.m-tool__link:disabled {
  color: var(--m-color-text-tertiary);
  cursor: not-allowed;
}

.m-tool__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.m-tool__select {
  flex: 1;
  max-width: 200px;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
}

.m-tool__input {
  flex: 1;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
}

.m-tool__switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
}

.m-tool__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.m-tool__switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--m-color-border);
  border-radius: 26px;
  transition: 0.2s;
}

.m-tool__switch-slider::before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

.m-tool__switch input:checked + .m-tool__switch-slider {
  background-color: var(--m-color-primary);
}

.m-tool__switch input:checked + .m-tool__switch-slider::before {
  transform: translateX(18px);
}

.m-tool__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-btn {
  flex: 1;
  min-width: 72px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-btn:active {
  transform: scale(0.97);
}

.m-btn--primary {
  background: var(--m-color-primary);
  color: #ffffff;
}

.m-btn--primary:active {
  background: #6d28d9;
}

.m-btn--secondary {
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
}

.m-btn--secondary:active {
  background: var(--m-color-primary-lighter);
}

.m-btn--ghost {
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  border: 1px solid var(--m-color-border);
}

.m-btn--ghost:active {
  background: var(--m-color-bg);
}

.m-tool__code {
  margin: 0;
  min-height: 56px;
  max-height: 120px;
  overflow: auto;
  padding: 10px 12px;
  background: var(--m-color-bg);
  border-radius: 10px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.m-tool__code--batch {
  min-height: 100px;
  max-height: 320px;
}

.m-tool__code code {
  font-family: inherit;
}

.m-tool__alert {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.m-tool__alert--error {
  background: var(--m-color-error-bg);
  border-color: #fecaca;
}

.m-tool__alert--error .m-tool__alert-title {
  color: var(--m-color-error);
}

.m-tool__alert-title {
  font-size: 14px;
  font-weight: 600;
}

.m-tool__alert-desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
