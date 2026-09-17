<script setup lang="ts">
/**
 * MobileBaseConvert.vue - 移动端进制转换工具
 *
 * 单列布局：
 * 1. 输入框 + 源进制 select（2/8/10/16）
 * 2. 操作按钮（转换 / 清空）
 * 3. 四种进制输出列表（每行可复制）
 * 4. 前 16 个数的对照表
 */
import {
  convertBase,
  RADIX_NAMES,
  RADICES,
  type Radix,
} from '~/utils/tools/baseConvert'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'base-convert',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

// 预填充示例：255（十进制）→ 各进制
const SAMPLE_INPUT = '255'
const SAMPLE_RESULT = convertBase(SAMPLE_INPUT, 10)

const input = ref(SAMPLE_INPUT)
const fromRadix = ref<Radix>(10)
const outputs = ref<Record<Radix, string>>(
  SAMPLE_RESULT.success && SAMPLE_RESULT.outputs
    ? SAMPLE_RESULT.outputs
    : { 2: '11111111', 8: '377', 10: '255', 16: 'FF' },
)
const errorMsg = ref('')
const copiedRadix = ref<Radix | null>(null)

const refTable: ReadonlyArray<{ dec: number; bin: string; oct: string; hex: string }> = Array.from(
  { length: 16 },
  (_, i) => ({
    dec: i,
    bin: i.toString(2).padStart(4, '0'),
    oct: i.toString(8),
    hex: i.toString(16).toUpperCase(),
  }),
)

function handleConvert() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  if (input.value.trim() === '') {
    outputs.value = { 2: '-', 8: '-', 10: '-', 16: '-' }
    return
  }

  const result = convertBase(input.value, fromRadix.value)
  if (result.success && result.outputs) {
    outputs.value = result.outputs
  } else {
    outputs.value = { 2: '-', 8: '-', 10: '-', 16: '-' }
    errorMsg.value = result.error ?? '转换失败'
  }
}

function handleClear() {
  input.value = ''
  outputs.value = { 2: '-', 8: '-', 10: '-', 16: '-' }
  errorMsg.value = ''
}

async function handleCopyRadix(r: Radix) {
  const text = outputs.value[r]
  if (!text || text === '-') return
  try {
    await navigator.clipboard.writeText(text)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copiedRadix.value = r
    setTimeout(() => { copiedRadix.value = null }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输入数字</span>
      </div>
      <input
        v-model="input"
        type="text"
        class="m-tool__input"
        placeholder="输入数字，如 255 或 0xFF"
        aria-label="数字输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      />
      <div class="m-tool__row">
        <span class="m-tool__label">源进制</span>
        <select v-model="fromRadix" class="m-tool__select">
          <option v-for="r in RADICES" :key="r" :value="r">
            {{ RADIX_NAMES[r] }}（{{ r }}）
          </option>
        </select>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleConvert">转换</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">操作失败</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}</span>
    </div>

    <!-- 输出区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">转换结果</span>
      </div>
      <div class="m-tool__format-list">
        <div
          v-for="r in RADICES"
          :key="r"
          class="m-tool__format-row"
        >
          <span class="m-tool__format-label">{{ RADIX_NAMES[r] }}（{{ r }}）</span>
          <code class="m-tool__format-val">{{ outputs[r] }}</code>
          <button
            type="button"
            class="m-tool__link"
            :disabled="!outputs[r] || outputs[r] === '-'"
            @click="handleCopyRadix(r)"
          >{{ copiedRadix === r ? '已复制' : '复制' }}</button>
        </div>
      </div>
    </div>

    <!-- 对照表 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">前 16 个数对照表</span>
      </div>
      <div class="m-tool__table">
        <div class="m-tool__table-row m-tool__table-row--head">
          <span>十进制</span>
          <span>二进制</span>
          <span>八进制</span>
          <span>十六进制</span>
        </div>
        <div
          v-for="(row, idx) in refTable"
          :key="idx"
          class="m-tool__table-row"
        >
          <span class="m-tool__table-val">{{ row.dec }}</span>
          <span class="m-tool__table-val">{{ row.bin }}</span>
          <span class="m-tool__table-val">{{ row.oct }}</span>
          <span class="m-tool__table-val">{{ row.hex }}</span>
        </div>
      </div>
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
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
  box-sizing: border-box;
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

.m-btn--ghost {
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  border: 1px solid var(--m-color-border);
}

.m-btn--ghost:active {
  background: var(--m-color-bg);
}

.m-tool__format-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-tool__format-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--m-color-bg);
  border: 1px solid var(--m-color-border-light);
}

.m-tool__format-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--m-color-text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.m-tool__format-val {
  flex: 1;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  word-break: break-all;
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

.m-tool__table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--m-color-border-light);
}

.m-tool__table-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px 10px;
  font-size: 13px;
  align-items: center;
}

.m-tool__table-row--head {
  background: var(--m-color-bg);
  font-weight: 600;
  color: var(--m-color-text-primary);
}

.m-tool__table-row:not(.m-tool__table-row--head) {
  border-top: 1px solid var(--m-color-border-light);
}

.m-tool__table-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-secondary);
  word-break: break-all;
}
</style>
