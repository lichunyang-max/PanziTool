<script setup lang="ts">
/**
 * MobileUrlEncode.vue - 移动端 URL 编码/解码工具
 *
 * 单列布局：输入框在上，输出框在下
 * 操作按钮：编码/解码/清空 + 复制
 * 字符说明表
 */
import { encodeUrl, decodeUrl, type EncodeFunction, type SpaceMode } from '~/utils/tools/url'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'url-encode',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const input = ref('https://www.example.com/path?name=张三&city=北京')
const output = ref('')
const errorMsg = ref('')
const encodeFn = ref<EncodeFunction>('encodeURIComponent')
const spaceMode = ref<SpaceMode>('percent20')
const isBatch = ref(false)

const copied = ref(false)

const SAMPLE_TEXT = 'https://www.example.com/path?name=张三&city=北京'

function handleEncode() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  if (isBatch.value) {
    const lines = input.value.split(/\r?\n/)
    const results = lines.map(line => {
      if (line === '') return ''
      const r = encodeUrl(line, encodeFn.value, spaceMode.value)
      return r.success && r.output !== undefined ? r.output : `[错误] ${r.error ?? '未知错误'}`
    })
    output.value = results.join('\n')
  } else {
    const result = encodeUrl(input.value, encodeFn.value, spaceMode.value)
    if (result.success && result.output !== undefined) {
      output.value = result.output
    } else {
      errorMsg.value = result.error || '编码失败'
    }
  }
}

function handleDecode() {
  errorMsg.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  if (isBatch.value) {
    const lines = input.value.split(/\r?\n/)
    const results = lines.map(line => {
      if (line === '') return ''
      const r = decodeUrl(line, spaceMode.value)
      return r.success && r.output !== undefined ? r.output : `[错误] ${r.error ?? '未知错误'}`
    })
    output.value = results.join('\n')
  } else {
    const result = decodeUrl(input.value, spaceMode.value)
    if (result.success && result.output !== undefined) {
      output.value = result.output
    } else {
      errorMsg.value = result.error || '解码失败'
    }
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}

function handleLoadSample() {
  input.value = SAMPLE_TEXT
  errorMsg.value = ''
}

async function handleCopy() {
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

const charTable = [
  { char: '空格', encodeURI: '%20', encodeURIComponent: '%20' },
  { char: '!', encodeURI: '!', encodeURIComponent: '%21' },
  { char: '#', encodeURI: '%23', encodeURIComponent: '%23' },
  { char: '$', encodeURI: '$', encodeURIComponent: '%24' },
  { char: '&', encodeURI: '&', encodeURIComponent: '%26' },
  { char: '+', encodeURI: '+', encodeURIComponent: '%2B' },
  { char: ',', encodeURI: ',', encodeURIComponent: '%2C' },
  { char: '/', encodeURI: '/', encodeURIComponent: '%2F' },
  { char: ':', encodeURI: ':', encodeURIComponent: '%3A' },
  { char: ';', encodeURI: ';', encodeURIComponent: '%3B' },
  { char: '=', encodeURI: '=', encodeURIComponent: '%3D' },
  { char: '?', encodeURI: '?', encodeURIComponent: '%3F' },
  { char: '@', encodeURI: '@', encodeURIComponent: '%40' },
  { char: '[', encodeURI: '%5B', encodeURIComponent: '%5B' },
  { char: ']', encodeURI: '%5D', encodeURIComponent: '%5D' },
  { char: '中文', encodeURI: '%E4%B8%AD%E6%96%87', encodeURIComponent: '%E4%B8%AD%E6%96%87' },
]
</script>

<template>
  <div class="m-tool">
    <!-- 输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输入</span>
        <button type="button" class="m-tool__link" @click="handleLoadSample">示例</button>
      </div>
      <textarea
        v-model="input"
        class="m-tool__textarea"
        placeholder="输入需要编码或解码的文本..."
        aria-label="URL 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 选项区 -->
    <div class="m-tool__card">
      <div class="m-tool__row">
        <span class="m-tool__label">编码函数</span>
        <select v-model="encodeFn" class="m-tool__select">
          <option value="encodeURIComponent">encodeURIComponent</option>
          <option value="encodeURI">encodeURI</option>
        </select>
      </div>
      <div class="m-tool__row">
        <span class="m-tool__label">空格编码</span>
        <select v-model="spaceMode" class="m-tool__select">
          <option value="percent20">%20</option>
          <option value="plus">+ (表单模式)</option>
        </select>
      </div>
      <div class="m-tool__row">
        <span class="m-tool__label">批量模式</span>
        <label class="m-tool__switch">
          <input type="checkbox" v-model="isBatch" />
          <span class="m-tool__switch-slider"></span>
        </label>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleEncode">编码</button>
      <button type="button" class="m-btn m-btn--secondary" @click="handleDecode">解码</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 输出区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">输出</span>
        <button
          type="button"
          class="m-tool__link"
          :disabled="!output"
          @click="handleCopy"
        >{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <pre class="m-tool__code"><code>{{ output }}</code></pre>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">操作失败</span>
      <span class="m-tool__alert-desc">{{ errorMsg }}</span>
    </div>

    <!-- 字符说明表 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">字符编码对照表</span>
      </div>
      <div class="m-tool__table">
        <div class="m-tool__table-row m-tool__table-row--head">
          <span>字符</span>
          <span>encodeURI</span>
          <span>encodeURIComponent</span>
        </div>
        <div
          v-for="(row, idx) in charTable"
          :key="idx"
          class="m-tool__table-row"
        >
          <span class="m-tool__table-char">{{ row.char }}</span>
          <span class="m-tool__table-val">{{ row.encodeURI }}</span>
          <span class="m-tool__table-val">{{ row.encodeURIComponent }}</span>
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
  --m-color-success: #10b981;
  --m-color-success-bg: #ecfdf5;

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
  grid-template-columns: 72px 1fr 1fr;
  gap: 8px;
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

.m-tool__table-char {
  font-weight: 500;
  color: var(--m-color-text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.m-tool__table-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-secondary);
  word-break: break-all;
}
</style>