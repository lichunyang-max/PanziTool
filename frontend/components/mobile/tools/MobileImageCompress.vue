<script setup lang="ts">
/**
 * MobileImageCompress.vue - 移动端图片压缩工具
 *
 * 功能：
 * - 图片上传（支持拍照/相册，accept="image/*" capture）
 * - 压缩质量滑块（10-100%）
 * - 显示压缩前后文件大小对比
 * - 一键下载压缩后图片
 *
 * 复用：utils/tools/image.ts 中的业务逻辑
 * - loadImageWithOrientation 加载图片并修正 EXIF 方向
 * - canvasToBlob Canvas 转 Blob
 * - formatFileSize 格式化文件大小
 * - downloadBlob 触发浏览器下载
 * - getOutputFilename 生成输出文件名
 */
import {
  loadImageWithOrientation,
  canvasToBlob,
  formatFileSize,
  downloadBlob,
  getOutputFilename,
  type ImageFormat,
} from '~/utils/tools/image'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'image-compress',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'download', slug: string): void
}>()

// ============ 状态 ============
const fileInputRef = ref<HTMLInputElement | null>(null)
const originalFile = ref<File | null>(null)
const originalCanvas = ref<HTMLCanvasElement | null>(null)
const originalSize = ref(0)
const originalName = ref('')
const originalPreview = ref('')

const quality = ref(0.8) // 80% 默认质量
const isProcessing = ref(false)
const errorMsg = ref('')

const compressedBlob = ref<Blob | null>(null)
const compressedSize = ref(0)
const compressedPreview = ref('')
const compressedCanvas = ref<HTMLCanvasElement | null>(null)

// 节省比例
const savingsRatio = computed(() => {
  if (originalSize.value === 0 || compressedSize.value === 0) return 0
  return Math.round((1 - compressedSize.value / originalSize.value) * 100)
})

// ============ 文件选择 ============
function triggerFilePick() {
  fileInputRef.value?.click()
}

async function handleFilePick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 重置状态
  resetState()
  errorMsg.value = ''

  if (!file.type.startsWith('image/')) {
    errorMsg.value = '请选择图片文件'
    return
  }

  originalFile.value = file
  originalSize.value = file.size
  originalName.value = file.name

  // 生成原图预览
  originalPreview.value = URL.createObjectURL(file)

  try {
    isProcessing.value = true
    const canvas = await loadImageWithOrientation(file)
    originalCanvas.value = canvas

    // 自动压缩一次
    await doCompress()
  } catch (e) {
    errorMsg.value = `图片加载失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

// ============ 压缩 ============
async function doCompress() {
  if (!originalCanvas.value) return

  try {
    isProcessing.value = true
    errorMsg.value = ''
    reportEvent('tool_use', effectiveSlug.value)
    emit('tool_use', effectiveSlug.value)

    // 格式选择：JPEG 不支持透明通道，若原图是 PNG 且质量较高时输出 PNG
    const format: ImageFormat = 'image/jpeg'
    const qualityValue = quality.value

    const blob = await canvasToBlob(originalCanvas.value, format, qualityValue)

    // 释放之前的预览 URL
    if (compressedPreview.value) {
      URL.revokeObjectURL(compressedPreview.value)
    }

    compressedBlob.value = blob
    compressedSize.value = blob.size
    compressedPreview.value = URL.createObjectURL(blob)

    // 创建压缩后的 canvas（用于导出）
    const img = new Image()
    const url = URL.createObjectURL(blob)
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('压缩结果加载失败'))
      img.src = url
    })

    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    if (ctx) {
      // 填充白色背景（防止 JPEG 黑底）
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0)
    }
    compressedCanvas.value = c
    URL.revokeObjectURL(url)
  } catch (e) {
    errorMsg.value = `压缩失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

// ============ 下载 ============
function handleDownload() {
  if (!compressedBlob.value || !originalFile.value) return

  const format: ImageFormat = 'image/jpeg'
  const filename = getOutputFilename(originalFile.value.name, format)
  downloadBlob(compressedBlob.value, filename)

  reportEvent('download', effectiveSlug.value)
  emit('download', effectiveSlug.value)
}

// ============ 重置 ============
function resetState() {
  if (originalPreview.value) URL.revokeObjectURL(originalPreview.value)
  if (compressedPreview.value) URL.revokeObjectURL(compressedPreview.value)

  originalFile.value = null
  originalCanvas.value = null
  originalSize.value = 0
  originalName.value = ''
  originalPreview.value = ''
  compressedBlob.value = null
  compressedSize.value = 0
  compressedPreview.value = ''
  compressedCanvas.value = null
  errorMsg.value = ''
}

function handleReset() {
  resetState()
}

// 组件卸载时清理
onBeforeUnmount(() => {
  if (originalPreview.value) URL.revokeObjectURL(originalPreview.value)
  if (compressedPreview.value) URL.revokeObjectURL(compressedPreview.value)
})
</script>

<template>
  <div class="m-tool">
    <!-- 上传区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">选择图片</span>
        <span v-if="originalName" class="m-tool__filename">{{ originalName }}</span>
      </div>

      <!-- 预览对比 -->
      <div v-if="originalPreview" class="m-compare">
        <div class="m-compare__item">
          <img :src="originalPreview" alt="原图预览" class="m-compare__img" />
          <div class="m-compare__label">
            <span>原图</span>
            <span class="m-compare__size">{{ formatFileSize(originalSize) }}</span>
          </div>
        </div>

        <div v-if="compressedPreview" class="m-compare__arrow" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div v-if="compressedPreview" class="m-compare__item">
          <img :src="compressedPreview" alt="压缩后预览" class="m-compare__img" />
          <div class="m-compare__label">
            <span>压缩后</span>
            <span class="m-compare__size m-compare__size--compressed">
              {{ formatFileSize(compressedSize) }}
              <span v-if="savingsRatio > 0" class="m-compare__savings">省 {{ savingsRatio }}%</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 上传按钮 -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        capture="environment"
        class="m-tool__file-input"
        @change="handleFilePick"
      />
      <button
        type="button"
        class="m-tool__file-btn"
        @click="triggerFilePick"
      >
        <span v-if="!originalFile">选择图片 / 拍照</span>
        <span v-else>重新选择</span>
      </button>
    </div>

    <!-- 压缩选项 -->
    <div class="m-tool__card" v-if="originalFile">
      <div class="m-tool__header">
        <span class="m-tool__label">压缩质量</span>
        <span class="m-tool__value">{{ Math.round(quality * 100) }}%</span>
      </div>
      <input
        type="range"
        v-model="quality"
        min="0.1"
        max="1"
        step="0.05"
        class="m-tool__slider"
        @change="doCompress"
      />
      <div class="m-tool__slider-labels">
        <span>更小</span>
        <span>更清晰</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions" v-if="originalFile">
      <button
        type="button"
        class="m-btn m-btn--primary"
        :disabled="isProcessing || !compressedBlob"
        @click="handleDownload"
      >
        {{ isProcessing ? '处理中...' : '下载压缩图' }}
      </button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleReset">
        清空
      </button>
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

.m-tool__filename {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-tool__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--m-color-primary);
}

/* 对比预览 */
.m-compare {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.m-compare__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-compare__img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: var(--m-color-bg);
  border-radius: 10px;
  border: 1px solid var(--m-color-border-light);
}

.m-compare__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.m-compare__label span {
  font-size: 12px;
  color: var(--m-color-text-secondary);
}

.m-compare__size {
  font-size: 13px !important;
  font-weight: 500;
  color: var(--m-color-text-primary) !important;
}

.m-compare__size--compressed {
  color: var(--m-color-primary) !important;
}

.m-compare__savings {
  color: #10b981 !important;
  font-weight: 600;
  margin-left: 4px;
}

.m-compare__arrow {
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

/* 滑块 */
.m-tool__slider {
  width: 100%;
  height: 36px;
  -webkit-appearance: none;
  appearance: none;
  background: none;
  cursor: pointer;
}

.m-tool__slider::-webkit-slider-runnable-track {
  height: 6px;
  background: var(--m-color-border);
  border-radius: 3px;
}

.m-tool__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  background: var(--m-color-primary);
  border-radius: 50%;
  margin-top: -9px;
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
}

.m-tool__slider::-moz-range-track {
  height: 6px;
  background: var(--m-color-border);
  border-radius: 3px;
  border: none;
}

.m-tool__slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: var(--m-color-primary);
  border-radius: 50%;
  border: none;
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
}

.m-tool__slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--m-color-text-tertiary);
}

/* 文件上传 */
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

/* 操作按钮 */
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
  opacity: 0.5;
  cursor: not-allowed;
}

.m-btn--primary {
  background: var(--m-color-primary);
  color: #ffffff;
}

.m-btn--primary:active:not(:disabled) {
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

/* 错误提示 */
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
}
</style>