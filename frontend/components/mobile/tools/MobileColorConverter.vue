<script setup lang="ts">
/**
 * MobileColorConverter.vue - 移动端颜色格式转换工具
 *
 * 单列布局：
 * 1. 预览色块 + 原生 color picker + 随机按钮
 * 2. HEX 输入框 + RGB 三数字框 + HSL 三数字框（多字段同步编辑）
 * 3. 各格式输出（HEX / RGB / RGBA / HSL / HSLA）+ 每行复制
 *
 * 防递归用 colorLock 标志。
 */
import {
  formatColor,
  hslToRgb,
  parseColor,
  randomRgb,
  rgbToHex,
  rgbToHsl,
  type ColorFormat,
  type HslColor,
  type RgbColor,
} from '~/utils/tools/colorConverter'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'color-converter',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

// 预填充示例：#4f46e5 → rgb(79, 70, 229)
const SAMPLE_RGB: RgbColor = { r: 79, g: 70, b: 229 }
const SAMPLE_HSL = rgbToHsl(SAMPLE_RGB)

const rgb = ref<RgbColor>({ ...SAMPLE_RGB })
const hsl = ref<HslColor>({ ...SAMPLE_HSL })
const hexInput = ref(rgbToHex(SAMPLE_RGB))
const errorMsg = ref('')
const copiedFormat = ref<ColorFormat | null>(null)

let colorLock = false

const previewColor = computed(() => formatColor(rgb.value, 'rgba'))

const formatList: ReadonlyArray<{ value: ColorFormat; label: string }> = [
  { value: 'hex', label: 'HEX' },
  { value: 'rgb', label: 'RGB' },
  { value: 'rgba', label: 'RGBA' },
  { value: 'hsl', label: 'HSL' },
  { value: 'hsla', label: 'HSLA' },
]

function syncFromRgb() {
  colorLock = true
  hsl.value = rgbToHsl(rgb.value)
  hexInput.value = rgbToHex(rgb.value)
  colorLock = false
}

function syncFromHsl() {
  if (colorLock) return
  colorLock = true
  rgb.value = hslToRgb(hsl.value)
  hexInput.value = rgbToHex(rgb.value)
  colorLock = false
}

function onHexInput() {
  if (colorLock) return
  const result = parseColor(hexInput.value)
  if (result.success && result.rgb) {
    errorMsg.value = ''
    colorLock = true
    rgb.value = { ...result.rgb }
    if (result.hsl) hsl.value = { ...result.hsl }
    colorLock = false
  } else {
    errorMsg.value = result.error ?? '颜色格式无效'
  }
}

function onColorPicker(e: Event) {
  const target = e.target as HTMLInputElement
  const result = parseColor(target.value)
  if (result.success && result.rgb) {
    colorLock = true
    rgb.value = { ...result.rgb }
    if (result.hsl) hsl.value = { ...result.hsl }
    hexInput.value = rgbToHex(result.rgb)
    colorLock = false
    errorMsg.value = ''
    reportEvent('tool_use', effectiveSlug.value)
    emit('tool_use', effectiveSlug.value)
  }
}

function onRgbChange() {
  if (colorLock) return
  syncFromRgb()
}

function onHslChange() {
  if (colorLock) return
  syncFromHsl()
}

function handleRandom() {
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  const random = randomRgb()
  colorLock = true
  rgb.value = random
  hsl.value = rgbToHsl(random)
  hexInput.value = rgbToHex(random)
  colorLock = false
  errorMsg.value = ''
}

async function handleCopyFormat(fmt: ColorFormat) {
  const text = formatColor(rgb.value, fmt)
  try {
    await navigator.clipboard.writeText(text)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copiedFormat.value = fmt
    setTimeout(() => { copiedFormat.value = null }, 2000)
  } catch {
    // 静默忽略
  }
}
</script>

<template>
  <div class="m-tool">
    <!-- 预览 + 选色器 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">颜色预览</span>
      </div>
      <div class="m-tool__preview-row">
        <div
          class="m-tool__preview-block"
          :style="{ backgroundColor: previewColor }"
          aria-label="颜色预览"
        ></div>
        <input
          type="color"
          :value="rgbToHex(rgb)"
          class="m-tool__picker"
          @input="onColorPicker"
        />
        <button type="button" class="m-btn m-btn--secondary" @click="handleRandom">随机</button>
      </div>
      <div v-if="errorMsg" class="m-tool__alert m-tool__alert--error" role="alert">
        <span class="m-tool__alert-desc">{{ errorMsg }}</span>
      </div>
    </div>

    <!-- HEX 输入 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">HEX</span>
      </div>
      <input
        v-model="hexInput"
        type="text"
        class="m-tool__input"
        placeholder="#4f46e5"
        @input="onHexInput"
      />
    </div>

    <!-- RGB 输入 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">RGB</span>
      </div>
      <div class="m-tool__triple">
        <div class="m-tool__triple-item">
          <span class="m-tool__triple-label">R</span>
          <input
            v-model.number="rgb.r"
            type="number"
            min="0"
            max="255"
            class="m-tool__input"
            @input="onRgbChange"
          />
        </div>
        <div class="m-tool__triple-item">
          <span class="m-tool__triple-label">G</span>
          <input
            v-model.number="rgb.g"
            type="number"
            min="0"
            max="255"
            class="m-tool__input"
            @input="onRgbChange"
          />
        </div>
        <div class="m-tool__triple-item">
          <span class="m-tool__triple-label">B</span>
          <input
            v-model.number="rgb.b"
            type="number"
            min="0"
            max="255"
            class="m-tool__input"
            @input="onRgbChange"
          />
        </div>
      </div>
    </div>

    <!-- HSL 输入 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">HSL</span>
      </div>
      <div class="m-tool__triple">
        <div class="m-tool__triple-item">
          <span class="m-tool__triple-label">H</span>
          <input
            v-model.number="hsl.h"
            type="number"
            min="0"
            max="360"
            class="m-tool__input"
            @input="onHslChange"
          />
        </div>
        <div class="m-tool__triple-item">
          <span class="m-tool__triple-label">S</span>
          <input
            v-model.number="hsl.s"
            type="number"
            min="0"
            max="100"
            class="m-tool__input"
            @input="onHslChange"
          />
        </div>
        <div class="m-tool__triple-item">
          <span class="m-tool__triple-label">L</span>
          <input
            v-model.number="hsl.l"
            type="number"
            min="0"
            max="100"
            class="m-tool__input"
            @input="onHslChange"
          />
        </div>
      </div>
    </div>

    <!-- 各格式输出 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">各格式输出</span>
      </div>
      <div class="m-tool__format-list">
        <div
          v-for="fmt in formatList"
          :key="fmt.value"
          class="m-tool__format-row"
        >
          <span
            class="m-tool__format-swatch"
            :style="{ backgroundColor: previewColor }"
            aria-hidden="true"
          ></span>
          <span class="m-tool__format-label">{{ fmt.label }}</span>
          <code class="m-tool__format-val">{{ formatColor(rgb, fmt.value) }}</code>
          <button
            type="button"
            class="m-tool__link"
            @click="handleCopyFormat(fmt.value)"
          >{{ copiedFormat === fmt.value ? '已复制' : '复制' }}</button>
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

.m-tool__preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.m-tool__preview-block {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  border: 1px solid var(--m-color-border);
  flex-shrink: 0;
}

.m-tool__picker {
  width: 48px;
  height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  padding: 2px;
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
  box-sizing: border-box;
}

.m-tool__triple {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.m-tool__triple-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.m-tool__triple-label {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  padding-left: 4px;
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
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--m-color-bg);
  border: 1px solid var(--m-color-border-light);
}

.m-tool__format-swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid var(--m-color-border);
  flex-shrink: 0;
}

.m-tool__format-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--m-color-text-secondary);
  min-width: 36px;
  flex-shrink: 0;
}

.m-tool__format-val {
  flex: 1;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  word-break: break-all;
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

.m-btn--secondary {
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
}

.m-btn--secondary:active {
  background: var(--m-color-primary-lighter);
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

.m-tool__alert-desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
