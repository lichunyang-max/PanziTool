<script setup lang="ts">
/**
 * MobileHash.vue - 移动端哈希计算工具
 *
 * 支持文本和文件两种模式
 * 算法选择（MD5/SHA1/SHA256/SHA512）
 * 结果展示
 */
import { computeTextHash, computeFileHash, type HashAlgorithm } from '~/utils/tools/hash'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'hash',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const mode = ref<'text' | 'file'>('text')
const textInput = ref('Hello, World!')
const fileInputRef = ref<HTMLInputElement | null>(null)
const fileName = ref('')

const algorithms = ref<HashAlgorithm[]>(['MD5', 'SHA-256'])
const availableAlgorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

const results = ref<Record<string, string>>({})
const errorMsg = ref('')
const loading = ref(false)
const copiedAlgo = ref('')

const SAMPLE_TEXT = 'Hello, World!'

function toggleAlgo(algo: HashAlgorithm) {
  const idx = algorithms.value.indexOf(algo)
  if (idx >= 0) {
    algorithms.value.splice(idx, 1)
  } else {
    algorithms.value.push(algo)
  }
}

async function handleCompute() {
  if (algorithms.value.length === 0) {
    errorMsg.value = '请至少选择一种算法'
    return
  }

  errorMsg.value = ''
  results.value = {}
  loading.value = true
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)

  try {
    if (mode.value === 'text') {
      const text = textInput.value
      for (const algo of algorithms.value) {
        results.value[algo] = await computeTextHash(text, algo)
      }
    } else {
      if (!fileInputRef.value?.files?.[0]) {
        errorMsg.value = '请先选择文件'
        loading.value = false
        return
      }
      const file = fileInputRef.value.files[0]
      for (const algo of algorithms.value) {
        results.value[algo] = await computeFileHash(file, algo)
      }
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '计算失败'
  } finally {
    loading.value = false
  }
}

function handleClear() {
  textInput.value = ''
  fileName.value = ''
  results.value = {}
  errorMsg.value = ''
}

function handleLoadSample() {
  textInput.value = SAMPLE_TEXT
  errorMsg.value = ''
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

function handleFilePick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    fileName.value = file.name
  }
}

async function handleCopy(text: string, algo: string) {
  try {
    await navigator.clipboard.writeText(text)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copiedAlgo.value = algo
    setTimeout(() => { copiedAlgo.value = '' }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 模式切换 -->
    <div class="m-tool__card">
      <div class="m-tool__tabs">
        <button
          type="button"
          class="m-tool__tab"
          :class="{ 'is-active': mode === 'text' }"
          @click="mode = 'text'"
        >文本模式</button>
        <button
          type="button"
          class="m-tool__tab"
          :class="{ 'is-active': mode === 'file' }"
          @click="mode = 'file'"
        >文件模式</button>
      </div>
    </div>

    <!-- 文本输入 -->
    <div v-if="mode === 'text'" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">待计算文本</span>
        <button type="button" class="m-tool__link" @click="handleLoadSample">示例</button>
      </div>
      <textarea
        v-model="textInput"
        class="m-tool__textarea"
        placeholder="输入要计算哈希的文本..."
        aria-label="哈希文本输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 文件输入 -->
    <div v-else class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">选择文件</span>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        class="m-tool__file-input"
        @change="handleFilePick"
      />
      <button
        type="button"
        class="m-tool__file-btn"
        @click="triggerFilePick"
      >
        <span>{{ fileName ? `已选: ${fileName}` : '点击选择文件' }}</span>
      </button>
      <p class="m-tool__hint">文件仅在本地浏览器读取，不会上传服务器。</p>
    </div>

    <!-- 算法选择 -->
    <div class="m-tool__card">
      <span class="m-tool__label">哈希算法（可多选）</span>
      <div class="m-tool__algos">
        <button
          v-for="algo in availableAlgorithms"
          :key="algo"
          type="button"
          class="m-tool__algo"
          :class="{ 'is-active': algorithms.includes(algo) }"
          @click="toggleAlgo(algo)"
        >{{ algo }}</button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button
        type="button"
        class="m-btn m-btn--primary"
        :disabled="loading"
        @click="handleCompute"
      >{{ loading ? '计算中...' : '计算哈希' }}</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 结果展示 -->
    <div v-if="Object.keys(results).length > 0" class="m-tool__card">
      <span class="m-tool__label">计算结果</span>
      <div class="m-tool__results">
        <div
          v-for="(hash, algo) in results"
          :key="algo"
          class="m-tool__result"
        >
          <div class="m-tool__result-head">
            <span class="m-tool__result-algo">{{ algo }}</span>
            <button
              type="button"
              class="m-tool__copy-btn"
              @click="handleCopy(hash, algo)"
            >{{ copiedAlgo === algo ? '已复制' : '复制' }}</button>
          </div>
          <code class="m-tool__result-hash">{{ hash }}</code>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
      <span class="m-tool__alert-title">计算失败</span>
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

.m-tool__tabs {
  display: flex;
  gap: 0;
  background: var(--m-color-bg);
  border-radius: 10px;
  padding: 4px;
}

.m-tool__tab {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  color: var(--m-color-text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__tab.is-active {
  background: var(--m-color-surface);
  color: var(--m-color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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

.m-tool__hint {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  margin: 0;
}

.m-tool__algos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-tool__algo {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--m-color-border);
  border-radius: 18px;
  background: var(--m-color-surface);
  font-size: 13px;
  font-weight: 500;
  color: var(--m-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__algo.is-active {
  background: var(--m-color-primary);
  border-color: var(--m-color-primary);
  color: #ffffff;
}

.m-tool__algo:active {
  transform: scale(0.95);
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

.m-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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

.m-tool__results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-tool__result {
  padding: 10px;
  background: var(--m-color-bg);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-tool__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.m-tool__result-algo {
  font-size: 13px;
  font-weight: 600;
  color: var(--m-color-primary);
}

.m-tool__copy-btn {
  background: none;
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  min-height: 32px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--m-color-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__copy-btn:active {
  background: var(--m-color-primary-light);
}

.m-tool__result-hash {
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  word-break: break-all;
  background: var(--m-color-surface);
  padding: 8px 10px;
  border-radius: 6px;
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