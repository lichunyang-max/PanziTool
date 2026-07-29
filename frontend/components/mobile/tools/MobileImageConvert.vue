<script setup lang="ts">
/**
 * MobileImageConvert.vue - 移动端图片格式转换工具
 *
 * 功能：
 * - 图片上传（支持拍照/相册）
 * - 目标格式选择（PNG/JPEG/WebP）
 * - 质量滑块（JPEG/WebP 时）
 * - 格式转换结果预览
 * - 下载转换后图片
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
  () => props.slug || (route.params.slug as string) || 'image-convert',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'download', slug: string): void
}>()

// ============ 格式选项 ============
interface FormatOption {
  value: ImageFormat
  label: string
  ext: string
  needQuality: boolean
}

const formatOptions: FormatOption[] = [
  { value: 'image/jpeg', label: 'JPEG', ext: 'jpg', needQuality: true },
  { value: 'image/png', label: 'PNG', ext: 'png', needQuality: false },
  { value: 'image/webp', label: 'WebP', ext: 'webp', needQuality: true },
]

// ============ 状态 ============
const fileInputRef = ref<HTMLInputElement | null>(null)
const originalFile = ref<File | null>(null)
const originalCanvas = ref<HTMLCanvasElement | null>(null)
const originalSize = ref(0)
const originalName = ref('')
const originalPreview = ref('')

const targetFormat = ref<ImageFormat>('image/jpeg')
const quality = ref(0.92)
const isProcessing = ref(false)
const errorMsg = ref('')

const convertedBlob = ref<Blob | null>(null)
const convertedSize = ref(0)
const convertedPreview = ref('')

// 当前格式是否需要质量参数
const currentFormat = computed(() =>
  formatOptions.find((f) => f.value === targetFormat.value),
)

const showQuality = computed(() => currentFormat.value?.needQuality ?? false)

// ============ 文件选择 ============
function triggerFilePick() {
  fileInputRef.value?.click()
}

async function handleFilePick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  resetState()
  errorMsg.value = ''

  if (!file.type.startsWith('image/')) {
    errorMsg.value = '请选择图片文件'
    return
  }

  originalFile.value = file
  originalSize.value = file.size
  originalName.value = file.name
  originalPreview.value = URL.createObjectURL(file)

  try {
    isProcessing.value = true
    const canvas = await loadImageWithOrientation(file)
    originalCanvas.value = canvas

    // 自动执行一次转换
    await doConvert()
  } catch (e) {
    errorMsg.value = `图片加载失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

// ============ 格式转换 ============
async function doConvert() {
  if (!originalCanvas.value) return

  try {
    isProcessing.value = true
    errorMsg.value = ''
    reportEvent('tool_use', effectiveSlug.value)
    emit('tool_use', effectiveSlug.value)

    const format = targetFormat.value
    const qualityValue = showQuality.value ? quality.value : undefined

    // 对于 JPEG，需要先绘制白色背景（因为 JPEG 不支持透明）
    let sourceCanvas = originalCanvas.value
    if (format === 'image/jpeg' && hasTransparency(originalCanvas.value)) {
      sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = originalCanvas.value.width
      sourceCanvas.height = originalCanvas.value.height
      const ctx = sourceCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height)
        ctx.drawImage(originalCanvas.value, 0, 0)
      }
    }

    const blob = await canvasToBlob(sourceCanvas, format, qualityValue)

    if (convertedPreview.value) {
      URL.revokeObjectURL(convertedPreview.value)
    }

    convertedBlob.value = blob
    convertedSize.value = blob.size
    convertedPreview.value = URL.createObjectURL(blob)
  } catch (e) {
    errorMsg.value = `转换失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

// 检查 canvas 是否有透明像素
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    // 采样检查 alpha 通道
    const step = 400 // 每 400 个像素采样一次
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 250) return true
    }
    return false
  } catch {
    // 跨域等问题时默认视为不透明
    return false
  }
}

// ============ 下载 ============
function handleDownload() {
  if (!convertedBlob.value || !originalFile.value) return

  const filename = getOutputFilename(originalFile.value.name, targetFormat.value)
  downloadBlob(convertedBlob.value, filename)

  reportEvent('download', effectiveSlug.value)
  emit('download', effectiveSlug.value)
}

// ============ 重置 ============
function resetState() {
  if (originalPreview.value) URL.revokeObjectURL(originalPreview.value)
  if (convertedPreview.value) URL.revokeObjectURL(convertedPreview.value)

  originalFile.value = null
  originalCanvas.value = null
  originalSize.value = 0
  originalName.value = ''
  originalPreview.value = ''
  convertedBlob.value = null
  convertedSize.value = 0
  convertedPreview.value = ''
  errorMsg.value = ''
}

function handleReset() {
  resetState()
}

// 组件卸载时清理
onBeforeUnmount(() => {
  if (originalPreview.value) URL.revokeObjectURL(originalPreview.value)
  if (convertedPreview.value) URL.revokeObjectURL(convertedPreview.value)
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

      <!-- 预览 -->
      <div v-if="originalPreview" class="m-convert-preview">
        <div class="m-convert-preview__item">
          <img :src="originalPreview" alt="原图预览" class="m-convert-preview__img" />
          <div class="m-convert-preview__meta">
            <span>原图</span>
            <span class="m-convert-preview__size">{{ formatFileSize(originalSize) }}</span>
          </div>
        </div>

        <div v-if="convertedPreview" class="m-convert-preview__arrow" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div v-if="convertedPreview" class="m-convert-preview__item">
          <img :src="convertedPreview" alt="转换后预览" class="m-convert-preview__img" />
          <div class="m-convert-preview__meta">
            <span>{{ currentFormat?.label || '' }}</span>
            <span class="m-convert-preview__size m-convert-preview__size--converted">
              {{ formatFileSize(convertedSize) }}
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

    <!-- 格式选择 -->
    <div class="m-tool__card" v-if="originalFile">
      <div class="m-tool__header">
        <span class="m-tool__label">目标格式</span>
      </div>
      <div class="m-format-list">
        <button
          v-for="fmt in formatOptions"
          :key="fmt.value"
          type="button"
          class="m-format-btn"
          :class="{ 'm-format-btn--active': targetFormat === fmt.value }"
          @click="targetFormat = fmt.value; doConvert()"
        >
          <span class="m-format-btn__label">{{ fmt.label }}</span>
          <span class="m-format-btn__ext">.{{ fmt.ext }}</span>
        </button>
      </div>
    </div>

    <!-- 质量选项 -->
    <div class="m-tool__card" v-if="originalFile && showQuality">
      <div class="m-tool__header">
        <span class="m-tool__label">输出质量</span>
        <span class="m-tool__value">{{ Math.round(quality * 100) }}%</span>
      </div>
      <input
        type="range"
        v-model="quality"
        min="0.1"
        max="1"
        step="0.05"
        class="m-tool__slider"
        @change="doConvert"
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
        :disabled="isProcessing || !convertedBlob"
        @click="handleDownload"
      >
        {{ isProcessing ? '处理中...' : '下载转换图' }}
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

/* 预览对比 */
.m-convert-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.m-convert-preview__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-convert-preview__img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: var(--m-color-bg);
  border-radius: 10px;
  border: 1px solid var(--m-color-border-light);
}

.m-convert-preview__meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.m-convert-preview__meta span {
  font-size: 12px;
  color: var(--m-color-text-secondary);
}

.m-convert-preview__size {
  font-size: 13px !important;
  font-weight: 500;
  color: var(--m-color-text-primary) !important;
}

.m-convert-preview__size--converted {
  color: var(--m-color-primary) !important;
}

.m-convert-preview__arrow {
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

/* 格式按钮 */
.m-format-list {
  display: flex;
  gap: 8px;
}

.m-format-btn {
  flex: 1;
  min-height: 56px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-format-btn:active {
  transform: scale(0.97);
}

.m-format-btn--active {
  background: var(--m-color-primary);
  color: #ffffff;
  border-color: var(--m-color-primary);
}

.m-format-btn__label {
  font-size: 14px;
  font-weight: 600;
}

.m-format-btn__ext {
  font-size: 11px;
  opacity: 0.8;
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