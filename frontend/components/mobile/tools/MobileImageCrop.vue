<script setup lang="ts">
/**
 * MobileImageCrop.vue - 移动端图片裁剪工具
 *
 * 功能：
 * - 图片上传（支持拍照/相册）
 * - 裁剪框拖动/缩放（触摸手势）
 * - 预设比例（自由、1:1、4:3、16:9、3:4）
 * - 预览裁剪结果
 * - 下载裁剪后图片
 *
 * 复用：utils/tools/image.ts 中的业务逻辑
 * - loadImageWithOrientation 加载图片并修正 EXIF 方向
 * - canvasToBlob Canvas 转 Blob
 * - downloadBlob 触发浏览器下载
 * - getOutputFilename 生成输出文件名
 */
import {
  loadImageWithOrientation,
  canvasToBlob,
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
  () => props.slug || (route.params.slug as string) || 'image-crop',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'download', slug: string): void
}>()

// ============ 比例预设 ============
type CropRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4'

const ratios: { value: CropRatio; label: string }[] = [
  { value: 'free', label: '自由' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: '3:4', label: '3:4' },
]

// ============ 状态 ============
const fileInputRef = ref<HTMLInputElement | null>(null)
const loadedCanvas = ref<HTMLCanvasElement | null>(null)
const imageUrl = ref('')
const imageFileName = ref('')
const imageLoaded = ref(false)
const isProcessing = ref(false)
const errorMsg = ref('')

// 显示尺寸（图片在容器中的实际显示尺寸）
const displayWidth = ref(0)
const displayHeight = ref(0)
const scale = ref(1) // 显示缩放比例

// 裁剪框（基于显示坐标）
const ratio = ref<CropRatio>('free')

// 裁剪框归一化坐标（0-1 相对比例，方便处理）
// x, y 为左上角，w, h 为宽高
const cropBox = reactive({
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.8,
})

// 容器 ref
const containerRef = ref<HTMLElement | null>(null)

// 裁剪结果
const croppedBlob = ref<Blob | null>(null)
const croppedPreview = ref('')
const showPreview = ref(false)

// ============ 计算属性 ============
// 根据比例约束裁剪框
const aspectRatio = computed(() => {
  switch (ratio.value) {
    case '1:1': return 1
    case '4:3': return 4 / 3
    case '16:9': return 16 / 9
    case '3:4': return 3 / 4
    default: return 0 // 自由
  }
})

// 裁剪框在显示坐标中的像素值
const cropPixels = computed(() => ({
  x: Math.round(cropBox.x * displayWidth.value),
  y: Math.round(cropBox.y * displayHeight.value),
  w: Math.round(cropBox.w * displayWidth.value),
  h: Math.round(cropBox.h * displayHeight.value),
}))

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

  imageFileName.value = file.name

  try {
    isProcessing.value = true
    const canvas = await loadImageWithOrientation(file)
    loadedCanvas.value = canvas
    imageUrl.value = URL.createObjectURL(file)
    imageLoaded.value = true
    await nextTick()
    fitImageToContainer()
    initCropBox()
  } catch (e) {
    errorMsg.value = `图片加载失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

// ============ 图片适配容器 ============
function fitImageToContainer() {
  if (!loadedCanvas.value || !containerRef.value) return

  const canvas = loadedCanvas.value
  const container = containerRef.value
  const maxW = container.clientWidth - 16 // padding
  const maxH = container.clientHeight - 16

  const canvasW = canvas.width
  const canvasH = canvas.height

  // 计算等比缩放
  const scaleX = maxW / canvasW
  const scaleY = maxH / canvasH
  const s = Math.min(scaleX, scaleY, 1) // 不放大

  scale.value = s
  displayWidth.value = Math.round(canvasW * s)
  displayHeight.value = Math.round(canvasH * s)
}

// ============ 裁剪框初始化 ============
function initCropBox() {
  // 默认居中 80%
  cropBox.x = 0.1
  cropBox.y = 0.1
  cropBox.w = 0.8
  cropBox.h = 0.8

  // 若有比例限制，调整为合适的裁剪框
  if (aspectRatio.value > 0) {
    applyRatioToCropBox()
  }
}

// 应用比例约束
function applyRatioToCropBox() {
  const ar = aspectRatio.value
  if (ar <= 0) return

  // 以当前裁剪框中心为基准，按比例调整
  const cx = cropBox.x + cropBox.w / 2
  const cy = cropBox.y + cropBox.h / 2

  // 计算最大允许的裁剪框（按比例）
  const maxW = 1 - cropBox.x // 不能超出右边
  const maxH = 1 - cropBox.y // 不能超出下边

  // 按比例计算宽高
  let newW = cropBox.w
  let newH = newW / ar

  if (newH > maxH) {
    newH = maxH
    newW = newH * ar
  }
  if (newW > 1 - cropBox.x) {
    newW = 1 - cropBox.x
    newH = newW / ar
  }

  // 限制最大不超过原图
  const maxByAR = Math.min(cropBox.x + newW, 1) - cropBox.x
  if (maxByAR < newW) {
    newW = maxByAR
    newH = newW / ar
  }

  // 确保不超出边界
  if (newH > 1 - cropBox.y) {
    newH = 1 - cropBox.y
    newW = newH * ar
  }

  // 居中裁剪框
  cropBox.w = newW
  cropBox.h = newH
  cropBox.x = Math.max(0, Math.min(1 - newW, cx - newW / 2))
  cropBox.y = Math.max(0, Math.min(1 - newH, cy - newH / 2))
}

// ============ 裁剪框手势处理 ============
type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'

let dragMode: DragMode = 'move'
let dragStartX = 0
let dragStartY = 0
let dragStartBox = { x: 0, y: 0, w: 0, h: 0 }

function onCropTouchStart(e: TouchEvent | MouseEvent, mode: DragMode) {
  e.preventDefault()
  const point = getPoint(e)
  dragMode = mode
  dragStartX = point.x
  dragStartY = point.y
  dragStartBox = { x: cropBox.x, y: cropBox.y, w: cropBox.w, h: cropBox.h }

  if (e instanceof TouchEvent) {
    document.addEventListener('touchmove', onCropTouchMove, { passive: false })
    document.addEventListener('touchend', onCropTouchEnd)
  } else {
    document.addEventListener('mousemove', onCropTouchMove)
    document.addEventListener('mouseup', onCropTouchEnd)
  }
}

function getPoint(e: TouchEvent | MouseEvent): { x: number; y: number } {
  if (e instanceof TouchEvent) {
    const t = e.touches[0] || e.changedTouches[0]
    return { x: t.clientX, y: t.clientY }
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }
}

function onCropTouchMove(e: TouchEvent | MouseEvent) {
  e.preventDefault()
  const point = getPoint(e)
  const dx = (point.x - dragStartX) / displayWidth.value
  const dy = (point.y - dragStartY) / displayHeight.value

  const box = { ...dragStartBox }

  switch (dragMode) {
    case 'move':
      cropBox.x = Math.max(0, Math.min(1 - box.w, box.x + dx))
      cropBox.y = Math.max(0, Math.min(1 - box.h, box.y + dy))
      break
    case 'resize-br':
      cropBox.w = Math.max(0.05, Math.min(1 - cropBox.x, box.w + dx))
      cropBox.h = Math.max(0.05, Math.min(1 - cropBox.y, box.h + dy))
      break
    case 'resize-bl': {
      const newX = Math.max(0, box.x + dx)
      const newW = Math.max(0.05, box.w - dx)
      cropBox.x = newX
      cropBox.w = Math.min(newW, 1 - newX)
      cropBox.h = Math.max(0.05, Math.min(1 - cropBox.y, box.h + dy))
      break
    }
    case 'resize-tr': {
      const newY = Math.max(0, box.y + dy)
      const newH = Math.max(0.05, box.h - dy)
      cropBox.y = newY
      cropBox.h = Math.min(newH, 1 - newY)
      cropBox.w = Math.max(0.05, Math.min(1 - cropBox.x, box.w + dx))
      break
    }
    case 'resize-tl': {
      const newX = Math.max(0, box.x + dx)
      const newY = Math.max(0, box.y + dy)
      const newW = Math.max(0.05, box.w - dx)
      const newH = Math.max(0.05, box.h - dy)
      cropBox.x = newX
      cropBox.y = newY
      cropBox.w = Math.min(newW, 1 - newX)
      cropBox.h = Math.min(newH, 1 - newY)
      break
    }
  }

  // 自由模式下按比例约束
  if (aspectRatio.value > 0 && dragMode !== 'move') {
    applyRatioToCropBox()
  }
}

function onCropTouchEnd() {
  document.removeEventListener('touchmove', onCropTouchMove)
  document.removeEventListener('touchend', onCropTouchEnd)
  document.removeEventListener('mousemove', onCropTouchMove)
  document.removeEventListener('mouseup', onCropTouchEnd)
}

// ============ 比例切换 ============
function setRatio(r: CropRatio) {
  ratio.value = r
  if (imageLoaded.value) {
    applyRatioToCropBox()
  }
}

// ============ 执行裁剪 ============
async function doCrop() {
  if (!loadedCanvas.value) return

  try {
    isProcessing.value = true
    errorMsg.value = ''
    reportEvent('tool_use', effectiveSlug.value)
    emit('tool_use', effectiveSlug.value)

    const canvas = loadedCanvas.value
    const sx = Math.round(cropBox.x * canvas.width)
    const sy = Math.round(cropBox.y * canvas.height)
    const sw = Math.round(cropBox.w * canvas.width)
    const sh = Math.round(cropBox.h * canvas.height)

    // 创建裁剪结果 canvas
    const outCanvas = document.createElement('canvas')
    outCanvas.width = Math.max(1, sw)
    outCanvas.height = Math.max(1, sh)
    const ctx = outCanvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height)
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height)

    const format: ImageFormat = 'image/jpeg'
    const blob = await canvasToBlob(outCanvas, format, 0.92)

    if (croppedPreview.value) URL.revokeObjectURL(croppedPreview.value)
    croppedBlob.value = blob
    croppedPreview.value = URL.createObjectURL(blob)
    showPreview.value = true
  } catch (e) {
    errorMsg.value = `裁剪失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

// ============ 下载 ============
function handleDownload() {
  if (!croppedBlob.value || !imageFileName.value) return

  const format: ImageFormat = 'image/jpeg'
  const filename = getOutputFilename(imageFileName.value, format)
  downloadBlob(croppedBlob.value, filename)

  reportEvent('download', effectiveSlug.value)
  emit('download', effectiveSlug.value)
}

// ============ 重置 ============
function resetState() {
  if (croppedPreview.value) URL.revokeObjectURL(croppedPreview.value)
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = ''
  }

  loadedCanvas.value = null
  imageFileName.value = ''
  imageLoaded.value = false
  croppedBlob.value = null
  croppedPreview.value = ''
  showPreview.value = false
  errorMsg.value = ''
  displayWidth.value = 0
  displayHeight.value = 0
}

function handleReset() {
  resetState()
}

// 窗口大小变化时重新适配
function onResize() {
  if (imageLoaded.value) {
    fitImageToContainer()
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (croppedPreview.value) URL.revokeObjectURL(croppedPreview.value)
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})
</script>

<template>
  <div class="m-tool">
    <!-- 上传区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">选择图片</span>
        <span v-if="imageFileName" class="m-tool__filename">{{ imageFileName }}</span>
      </div>

      <!-- 图片 + 裁剪框容器 -->
      <div
        v-if="imageLoaded"
        ref="containerRef"
        class="m-crop-container"
      >
        <!-- 图片 -->
        <div
          class="m-crop-image-wrap"
          :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
        >
          <img
            :src="imageUrl"
            class="m-crop-image"
            :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
            alt="图片预览"
          />

          <!-- 裁剪框覆盖层 -->
          <div
            class="m-crop-overlay"
            :style="{
              left: cropPixels.x + 'px',
              top: cropPixels.y + 'px',
              width: cropPixels.w + 'px',
              height: cropPixels.h + 'px',
            }"
          >
            <!-- 半透明遮罩 -->
            <div class="m-crop-mask" aria-hidden="true"></div>

            <!-- 裁剪框边框 -->
            <div
              class="m-crop-box"
              @touchstart="onCropTouchStart($event, 'move')"
              @mousedown="onCropTouchStart($event, 'move')"
            >
              <!-- 网格线 -->
              <div class="m-crop-grid">
                <div class="m-crop-grid-line m-crop-grid-line--v1"></div>
                <div class="m-crop-grid-line m-crop-grid-line--v2"></div>
                <div class="m-crop-grid-line m-crop-grid-line--h1"></div>
                <div class="m-crop-grid-line m-crop-grid-line--h2"></div>
              </div>

              <!-- 四角手柄 -->
              <div
                class="m-crop-handle m-crop-handle--tl"
                @touchstart.stop="onCropTouchStart($event, 'resize-tl')"
                @mousedown.stop="onCropTouchStart($event, 'resize-tl')"
              ></div>
              <div
                class="m-crop-handle m-crop-handle--tr"
                @touchstart.stop="onCropTouchStart($event, 'resize-tr')"
                @mousedown.stop="onCropTouchStart($event, 'resize-tr')"
              ></div>
              <div
                class="m-crop-handle m-crop-handle--bl"
                @touchstart.stop="onCropTouchStart($event, 'resize-bl')"
                @mousedown.stop="onCropTouchStart($event, 'resize-bl')"
              ></div>
              <div
                class="m-crop-handle m-crop-handle--br"
                @touchstart.stop="onCropTouchStart($event, 'resize-br')"
                @mousedown.stop="onCropTouchStart($event, 'resize-br')"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 上传按钮 -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="m-tool__file-input"
        @change="handleFilePick"
      />
      <button
        type="button"
        class="m-tool__file-btn"
        @click="triggerFilePick"
      >
        <span v-if="!imageLoaded">选择图片 / 拍照</span>
        <span v-else>重新选择</span>
      </button>
    </div>

    <!-- 比例选择 -->
    <div class="m-tool__card" v-if="imageLoaded">
      <div class="m-tool__header">
        <span class="m-tool__label">裁剪比例</span>
      </div>
      <div class="m-ratio-list">
        <button
          v-for="r in ratios"
          :key="r.value"
          type="button"
          class="m-ratio-btn"
          :class="{ 'm-ratio-btn--active': ratio === r.value }"
          @click="setRatio(r.value)"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <!-- 裁剪预览 -->
    <div class="m-tool__card" v-if="showPreview && croppedPreview">
      <div class="m-tool__header">
        <span class="m-tool__label">裁剪预览</span>
      </div>
      <img :src="croppedPreview" alt="裁剪结果预览" class="m-crop-preview" />
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions" v-if="imageLoaded">
      <button
        type="button"
        class="m-btn m-btn--primary"
        :disabled="isProcessing"
        @click="doCrop"
      >
        {{ isProcessing ? '处理中...' : '确认裁剪' }}
      </button>
      <button
        type="button"
        class="m-btn m-btn--secondary"
        :disabled="!croppedBlob"
        @click="handleDownload"
      >
        下载
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

/* 裁剪容器 */
.m-crop-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: var(--m-color-bg);
  border-radius: 10px;
  padding: 8px;
  margin: 8px 0;
  overflow: hidden;
}

.m-crop-image-wrap {
  position: relative;
}

.m-crop-image {
  display: block;
  max-width: 100%;
  object-fit: contain;
  pointer-events: none;
}

/* 裁剪框覆盖层 */
.m-crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
}

/* 遮罩层（外部半透明） */
.m-crop-mask {
  position: absolute;
  top: -9999px;
  left: -9999px;
  right: -9999px;
  bottom: -9999px;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.m-crop-mask {
  -webkit-mask-image:
    linear-gradient(#000 0 0),
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

/* 裁剪框主体 */
.m-crop-box {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid var(--m-color-primary);
  cursor: move;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

/* 网格线 */
.m-crop-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.m-crop-grid-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.35);
}

.m-crop-grid-line--v1 {
  left: 33.3%;
  top: 0;
  bottom: 0;
  width: 1px;
}

.m-crop-grid-line--v2 {
  left: 66.6%;
  top: 0;
  bottom: 0;
  width: 1px;
}

.m-crop-grid-line--h1 {
  top: 33.3%;
  left: 0;
  right: 0;
  height: 1px;
}

.m-crop-grid-line--h2 {
  top: 66.6%;
  left: 0;
  right: 0;
  height: 1px;
}

/* 四角手柄 */
.m-crop-handle {
  position: absolute;
  width: 28px;
  height: 28px;
  background: transparent;
  z-index: 10;
}

.m-crop-handle--tl {
  top: -8px;
  left: -8px;
  cursor: nwse-resize;
}

.m-crop-handle--tr {
  top: -8px;
  right: -8px;
  cursor: nesw-resize;
}

.m-crop-handle--bl {
  bottom: -8px;
  left: -8px;
  cursor: nesw-resize;
}

.m-crop-handle--br {
  bottom: -8px;
  right: -8px;
  cursor: nwse-resize;
}

.m-crop-handle::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: var(--m-color-primary);
  border: 2px solid #ffffff;
  border-radius: 4px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 比例列表 */
.m-ratio-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-ratio-btn {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-ratio-btn:active {
  transform: scale(0.97);
}

.m-ratio-btn--active {
  background: var(--m-color-primary);
  color: #ffffff;
  border-color: var(--m-color-primary);
}

/* 裁剪预览 */
.m-crop-preview {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  background: var(--m-color-bg);
  border-radius: 10px;
  border: 1px solid var(--m-color-border-light);
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

.m-btn--secondary {
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
}

.m-btn--secondary:active:not(:disabled) {
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