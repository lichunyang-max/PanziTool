<script setup lang="ts">
/**
 * MobileImageBase64.vue - 移动端图片 Base64 互转工具
 *
 * 单列布局，双模式切换：
 * - 图片 → Base64：点击/选择图片，自动生成 Data URI
 * - Base64 → 图片：粘贴 Base64 字符串，实时预览还原图片
 */
import {
  fileToImageBase64,
  normalizeBase64ToImageSrc,
} from '~/utils/tools/imageBase64'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'image-base64',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

// 1x1 透明 PNG Data URI，用于 SSR 预填示例
const SAMPLE_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const mode = ref<'to-base64' | 'to-image'>('to-image')

// 图片 → Base64 状态
const fileName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

// Base64 → 图片状态
const base64Input = ref(SAMPLE_DATA_URI)

// 共享结果 / 预览状态
const output = ref(normalizeBase64ToImageSrc(SAMPLE_DATA_URI).output ?? '')
const previewSrc = ref(output.value)
const previewMeta = ref('')
const downloadName = ref('decoded-image.png')
const errorMsg = ref('')

const copied = ref(false)

function setMode(next: 'to-base64' | 'to-image') {
  if (mode.value === next) return
  mode.value = next
  errorMsg.value = ''
  output.value = ''
  previewSrc.value = ''
  previewMeta.value = ''
  fileName.value = ''
}

// ===== 图片 → Base64 =====
function triggerFilePick() {
  fileInputRef.value?.click()
}

async function handleFilePick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  errorMsg.value = ''
  const result = await fileToImageBase64(file)
  if (!result.success || !result.output) {
    errorMsg.value = result.error || '文件读取失败'
    return
  }

  fileName.value = file.name
  output.value = result.output
  previewSrc.value = ''
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
}

function clearFile() {
  fileName.value = ''
  output.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
  errorMsg.value = ''
}

// ===== Base64 → 图片 =====
function handleBase64Input() {
  errorMsg.value = ''
  const raw = base64Input.value.trim()
  if (!raw) {
    output.value = ''
    previewSrc.value = ''
    previewMeta.value = ''
    return
  }

  const result = normalizeBase64ToImageSrc(raw)
  if (!result.success || !result.output) {
    errorMsg.value = result.error || '格式错误'
    output.value = ''
    previewSrc.value = ''
    previewMeta.value = ''
    return
  }

  output.value = result.output
  previewSrc.value = result.output

  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  previewMeta.value = `${img.naturalWidth} × ${img.naturalHeight}`
  const m = output.value.match(/^data:(image\/[a-z+]+);/i)
  const type = m ? m[1].toLowerCase() : 'image/png'
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  downloadName.value = 'decoded-image.' + (extMap[type] || 'png')
}

function onImgError() {
  errorMsg.value = 'Base64 内容无法解析为图片，请检查字符串是否完整'
  previewSrc.value = ''
}

function clearBase64() {
  base64Input.value = ''
  output.value = ''
  previewSrc.value = ''
  previewMeta.value = ''
  errorMsg.value = ''
}

// ===== 复制 =====
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
</script>

<template>
  <div class="m-tool">
    <!-- 模式切换 -->
    <div class="m-tool__actions">
      <button
        type="button"
        class="m-btn"
        :class="mode === 'to-base64' ? 'm-btn--primary' : 'm-btn--ghost'"
        @click="setMode('to-base64')"
      >
        图片→Base64
      </button>
      <button
        type="button"
        class="m-btn"
        :class="mode === 'to-image' ? 'm-btn--primary' : 'm-btn--ghost'"
        @click="setMode('to-image')"
      >
        Base64→图片
      </button>
    </div>

    <!-- 图片 → Base64 -->
    <div v-if="mode === 'to-base64'" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">选择图片</span>
        <button v-if="fileName" type="button" class="m-tool__link" @click="clearFile">清除</button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="m-tool__file-input"
        @change="handleFilePick"
      />
      <button type="button" class="m-tool__file-btn" @click="triggerFilePick">
        <span>{{ fileName ? `已选: ${fileName}` : '点击选择图片' }}</span>
      </button>
    </div>

    <!-- Base64 → 图片 -->
    <div v-else class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">Base64 输入</span>
        <button type="button" class="m-tool__link" @click="clearBase64">清空</button>
      </div>
      <textarea
        v-model="base64Input"
        class="m-tool__textarea"
        placeholder="粘贴 Data URI 或纯 Base64 字符串..."
        aria-label="Base64 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        @input="handleBase64Input"
      ></textarea>
    </div>

    <!-- 图片预览（Base64 → 图片模式） -->
    <div v-if="mode === 'to-image' && previewSrc" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">
          预览{{ previewMeta ? ` · ${previewMeta}` : '' }}
        </span>
        <a
          class="m-tool__link"
          :href="previewSrc"
          :download="downloadName"
          @click.stop
        >下载</a>
      </div>
      <div
        style="
          text-align: center;
          padding: 8px;
          background: var(--m-color-bg);
          border-radius: 10px;
        "
      >
        <img
          :src="previewSrc"
          alt="预览"
          style="max-width: 100%; max-height: 300px"
          @load="onImgLoad"
          @error="onImgError"
        />
      </div>
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
