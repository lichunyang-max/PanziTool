<script setup lang="ts">
/**
 * MobileJsCssBeautify.vue - 移动端 JS/CSS 美化压缩工具
 *
 * 语言/操作切换 + 缩进选择 + 输入 + 执行 + 结果
 */
import {
  BC_EXAMPLES,
  processCode,
  type BcLang,
  type BcOp,
} from '~/utils/tools/jsCssBeautify'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'js-css-beautify',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const lang = ref<BcLang>('js')
const op = ref<BcOp>('beautify')
const indent = ref<number>(2)
const input = ref(BC_EXAMPLES.js)
const output = ref('')
const errorMsg = ref('')
const sizeInfo = ref('')
const copied = ref(false)

const inputPlaceholder = computed(
  () => `粘贴需要处理的 ${lang.value === 'js' ? 'JS' : 'CSS'} 代码...`,
)

// 预填示例输出（beautify 为纯函数，确定性输出，无 SSR 不一致）
{
  const r = processCode(BC_EXAMPLES.js, 'js', 'beautify', 2)
  if (r.success && r.output) {
    output.value = r.output
    sizeInfo.value = `输出 ${r.output.length} 字符`
  }
}

function switchLang(l: BcLang) {
  lang.value = l
  errorMsg.value = ''
}

function switchOp(o: BcOp) {
  op.value = o
  errorMsg.value = ''
}

function handleConvert() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  if (input.value === '' || input.value.trim() === '') {
    output.value = ''
    sizeInfo.value = ''
    return
  }

  const r = processCode(input.value, lang.value, op.value, indent.value)
  if (r.success && r.output !== undefined) {
    output.value = r.output
    if (op.value === 'minify') {
      const saved = input.value.length
        ? Math.round((1 - r.output.length / input.value.length) * 100)
        : 0
      sizeInfo.value = `原始 ${input.value.length} 字符 → 压缩后 ${r.output.length} 字符（节省 ${saved}%）`
    } else {
      sizeInfo.value = `输出 ${r.output.length} 字符`
    }
  } else {
    output.value = ''
    sizeInfo.value = ''
    errorMsg.value = r.error ?? '处理失败'
  }
}

function handleFillExample() {
  input.value = BC_EXAMPLES[lang.value]
  errorMsg.value = ''
}

function handleClear() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
  sizeInfo.value = ''
}

async function handleCopy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 语言与操作 -->
    <div class="m-tool__card">
      <span class="m-tool__label">语言</span>
      <div class="m-tool__actions">
        <button
          type="button"
          class="m-btn"
          :class="lang === 'js' ? 'm-btn--primary' : 'm-btn--ghost'"
          @click="switchLang('js')"
        >JavaScript</button>
        <button
          type="button"
          class="m-btn"
          :class="lang === 'css' ? 'm-btn--primary' : 'm-btn--ghost'"
          @click="switchLang('css')"
        >CSS</button>
      </div>
      <span class="m-tool__label">操作</span>
      <div class="m-tool__actions">
        <button
          type="button"
          class="m-btn"
          :class="op === 'beautify' ? 'm-btn--primary' : 'm-btn--ghost'"
          @click="switchOp('beautify')"
        >美化</button>
        <button
          type="button"
          class="m-btn"
          :class="op === 'minify' ? 'm-btn--primary' : 'm-btn--ghost'"
          @click="switchOp('minify')"
        >压缩</button>
      </div>
    </div>

    <!-- 缩进 -->
    <div v-if="op === 'beautify'" class="m-tool__card">
      <div class="m-tool__row">
        <span class="m-tool__label">缩进</span>
        <select v-model.number="indent" class="m-tool__select">
          <option :value="2">2 空格</option>
          <option :value="4">4 空格</option>
        </select>
      </div>
    </div>

    <!-- 输入 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输入</span>
        <button type="button" class="m-tool__link" @click="handleFillExample">示例</button>
      </div>
      <textarea
        v-model="input"
        class="m-tool__textarea"
        :placeholder="inputPlaceholder"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleConvert">执行</button>
      <button
        type="button"
        class="m-btn m-btn--secondary"
        :disabled="!output"
        @click="handleCopy"
      >{{ copied ? '已复制' : '复制' }}</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">处理失败</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}</span>
    </div>

    <!-- 结果区 -->
    <div v-if="output" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">结果</span>
        <span style="font-size: 12px; color: var(--m-color-text-tertiary)">{{ sizeInfo }}</span>
      </div>
      <pre class="m-tool__code"><code>{{ output }}</code></pre>
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

.m-tool__textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
}

.m-tool__textarea:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-tool__file-input {
  display: none;
}

.m-tool__file-btn {
  min-height: 44px;
  border: 1px dashed var(--m-color-border);
  border-radius: 10px;
  background: var(--m-color-bg);
  color: var(--m-color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__file-btn:active {
  border-color: var(--m-color-primary);
  color: var(--m-color-primary);
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
  min-height: 80px;
  max-height: 240px;
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
