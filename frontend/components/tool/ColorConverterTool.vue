<script setup lang="ts">
/**
 * ColorConverterTool.vue - 颜色格式转换工具组件
 *
 * 严格参照 ui/pages/color-converter.html 的交互区结构：
 * 1. 大色块预览 + 原生 color picker + 随机按钮
 * 2. HEX 输入框（文本）+ RGB 三数字框 + HSL 三数字框
 * 3. 各格式输出卡片（HEX / RGB / HSL / RGBA / HSLA），每行可复制
 *
 * 多字段同步编辑：用 colorLock 标志防递归。
 */
import {
  AlertCircle,
  Check,
  Copy,
  Palette,
  RefreshCw,
  Shuffle,
} from 'lucide-vue-next'
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

useHead({
  titleTemplate: null,
  title: '颜色格式转换 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线颜色格式转换工具，支持 HEX/RGB/RGBA/HSL/HSLA 互转，提供原生 color picker 与随机配色，多字段同步编辑实时预览，免登录打开即用，本地处理保障数据安全。',
    },
    {
      name: 'keywords',
      content: '颜色转换,HEX,RGB,HSL,color picker,颜色值',
    },
    {
      property: 'og:title',
      content: '颜色格式转换 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线颜色格式转换工具，支持 HEX/RGB/RGBA/HSL/HSLA 互转，提供原生 color picker 与随机配色，多字段同步编辑实时预览，免登录打开即用，本地处理保障数据安全。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'color-converter',
)

// 预填充示例：#4f46e5 → rgb(79, 70, 229)
const SAMPLE_RGB: RgbColor = { r: 79, g: 70, b: 229 }
const SAMPLE_HSL = rgbToHsl(SAMPLE_RGB)

const rgb = ref<RgbColor>({ ...SAMPLE_RGB })
const hsl = ref<HslColor>({ ...SAMPLE_HSL })
const hexInput = ref(rgbToHex(SAMPLE_RGB))
const errorMsg = ref('')
const copiedFormat = ref<ColorFormat | null>(null)

// 防递归锁：当某字段更新触发其他字段同步时，避免循环更新
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

function doRandom() {
  reportEvent('tool_use', effectiveSlug.value)
  const random = randomRgb()
  colorLock = true
  rgb.value = random
  hsl.value = rgbToHsl(random)
  hexInput.value = rgbToHex(random)
  colorLock = false
  errorMsg.value = ''
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (import.meta.server) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 降级
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

async function doCopyFormat(fmt: ColorFormat) {
  const text = formatColor(rgb.value, fmt)
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(text)
  if (ok) {
    copiedFormat.value = fmt
    setTimeout(() => {
      copiedFormat.value = null
    }, 1500)
  }
}
</script>

<template>
  <div>
    <!-- 1. 预览 + color picker + 随机按钮 -->
    <div class="pz-card p-4 mb-6">
      <div class="flex items-center gap-2 mb-3">
        <Palette
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          颜色预览
        </h2>
      </div>
      <div class="flex items-center gap-4 flex-wrap">
        <div
          class="rounded-md shrink-0"
          :style="{
            width: '6rem',
            height: '6rem',
            backgroundColor: previewColor,
            border: '1px solid var(--pz-color-border)',
          }"
          aria-label="颜色预览"
        />
        <div class="flex flex-col gap-3 flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <label
              class="text-xs font-semibold"
              style="color: var(--pz-color-text-secondary)"
              for="pz-color-picker"
            >
              选色器
            </label>
            <input
              id="pz-color-picker"
              type="color"
              :value="rgbToHex(rgb)"
              style="width: 3rem; height: 2.5rem; border: 1px solid var(--pz-color-border); border-radius: var(--pz-radius-md); cursor: pointer; background: transparent;"
              @input="onColorPicker"
            />
            <button
              type="button"
              class="pz-btn-secondary whitespace-nowrap"
              @click="doRandom"
            >
              <Shuffle class="w-4 h-4" aria-hidden="true" />
              随机颜色
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="errorMsg"
        class="pz-error-text flex items-start gap-2 mt-3"
        role="alert"
      >
        <AlertCircle
          class="w-4 h-4 shrink-0 mt-0.5"
          style="color: var(--pz-state-error)"
          aria-hidden="true"
        />
        <span>{{ errorMsg }}</span>
      </div>
    </div>

    <!-- 2. 多字段编辑 -->
    <div class="pz-card p-4 mb-6">
      <h2
        class="text-base font-semibold mb-3"
        style="color: var(--pz-color-text-primary)"
      >
        颜色编辑
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- HEX -->
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-color-hex"
          >
            HEX
          </label>
          <input
            id="pz-color-hex"
            v-model="hexInput"
            type="text"
            class="pz-input"
            style="font-family: var(--pz-font-mono)"
            placeholder="#4f46e5"
            @input="onHexInput"
          />
        </div>

        <!-- RGB -->
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
          >
            RGB
          </label>
          <div class="grid grid-cols-3 gap-2">
            <div class="flex flex-col gap-1">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">R</span>
              <input
                v-model.number="rgb.r"
                type="number"
                min="0"
                max="255"
                class="pz-input"
                style="font-family: var(--pz-font-mono)"
                @input="onRgbChange"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">G</span>
              <input
                v-model.number="rgb.g"
                type="number"
                min="0"
                max="255"
                class="pz-input"
                style="font-family: var(--pz-font-mono)"
                @input="onRgbChange"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">B</span>
              <input
                v-model.number="rgb.b"
                type="number"
                min="0"
                max="255"
                class="pz-input"
                style="font-family: var(--pz-font-mono)"
                @input="onRgbChange"
              />
            </div>
          </div>
        </div>

        <!-- HSL -->
        <div class="flex flex-col gap-2 md:col-span-2">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
          >
            HSL
          </label>
          <div class="grid grid-cols-3 gap-2">
            <div class="flex flex-col gap-1">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">H (0-360)</span>
              <input
                v-model.number="hsl.h"
                type="number"
                min="0"
                max="360"
                class="pz-input"
                style="font-family: var(--pz-font-mono)"
                @input="onHslChange"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">S (0-100)</span>
              <input
                v-model.number="hsl.s"
                type="number"
                min="0"
                max="100"
                class="pz-input"
                style="font-family: var(--pz-font-mono)"
                @input="onHslChange"
              />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">L (0-100)</span>
              <input
                v-model.number="hsl.l"
                type="number"
                min="0"
                max="100"
                class="pz-input"
                style="font-family: var(--pz-font-mono)"
                @input="onHslChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 各格式输出 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <RefreshCw
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          各格式输出
        </h2>
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="fmt in formatList"
          :key="fmt.value"
          class="flex items-center gap-3 p-3 rounded-md"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
        >
          <span
            class="rounded-md shrink-0"
            :style="{
              width: '1.5rem',
              height: '1.5rem',
              backgroundColor: previewColor,
              border: '1px solid var(--pz-color-border)',
            }"
            aria-hidden="true"
          />
          <span
            class="text-xs font-semibold shrink-0"
            style="color: var(--pz-color-text-secondary); min-width: 3rem"
          >
            {{ fmt.label }}
          </span>
          <code
            class="flex-1 break-all"
            style="font-family: var(--pz-font-mono); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary)"
          >{{ formatColor(rgb, fmt.value) }}</code>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap shrink-0"
            style="padding: 0.25rem 0.75rem"
            @click="doCopyFormat(fmt.value)"
          >
            <component
              :is="copiedFormat === fmt.value ? Check : Copy"
              class="w-[14px] h-[14px]"
              aria-hidden="true"
            />
            {{ copiedFormat === fmt.value ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
