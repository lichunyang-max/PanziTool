<script setup lang="ts">
/**
 * QrCodeTool.vue - 二维码生成工具组件
 *
 * 严格参照 prd/qr-code-generator.html 交互区结构：
 * 1. 内容类型 tabs（文本 / 链接 / WiFi / 邮箱）+ 动态内容输入区
 * 2. 纠错等级 segmented（L·7% / M·15% / Q·25% / H·30%）
 * 3. 尺寸滑块（128~1024，默认 280）+ 边距滑块（0~10 模块，默认 2）
 * 4. 前景色 / 背景色：color input + hex 输入 + 预设色板 + 重置
 * 5. Logo 嵌入：开关 + 点击/拖拽上传 + 大小滑块（10~35%）+ 预览/移除
 * 6. 实时预览：canvas 渲染，支持 PNG / SVG 下载
 * 7. 使用说明 4 卡片 + 底部居中 toast
 *
 * 依赖 qrcode-generator（ESM named export qrcode），其 d.ts 为过时 export= 声明，
 * 因此采用动态 import + 本地接口断言，避免顶层静态导入。
 *
 * 交互事件（通过 useAnalytics 上报）：
 * - 成功渲染 → tool_use 事件（3 秒节流）
 * - 下载 PNG / SVG → download 事件
 */
useHead({
  titleTemplate: null,
  title: '二维码生成器 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线二维码生成工具，支持自定义颜色、尺寸、纠错等级和 Logo 嵌入。所有处理均在浏览器本地完成，不上传任何数据，打开即用。'
    },
    {
      name: 'keywords',
      content: '二维码生成,二维码制作,在线二维码,WiFi二维码,二维码Logo'
    },
    {
      property: 'og:title',
      content: '二维码生成器 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线二维码生成工具，支持自定义颜色、尺寸、纠错等级和 Logo 嵌入。所有处理均在浏览器本地完成，不上传任何数据，打开即用。'
    }
  ]
})

import {
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Link,
  Mail,
  Palette,
  QrCode,
  ShieldCheck,
  Text,
  Trash2,
  UploadCloud,
  Wifi,
} from 'lucide-vue-next'
import { useAnalytics } from '~/composables/useAnalytics'

interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

const { data: adData } = await useAsyncData<AdItem | null>(
  'qr-code-middle-ad',
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    try {
      const response = await $fetch<{
        code: number
        data: AdItem[]
      }>('/api/v1/ads', {
        baseURL,
        params: { locationSymbol: 'dev_tool_middle' },
      })
      if (response.code === 0 && response.data && response.data.length > 0) {
        return response.data[0]
      }
      return null
    } catch {
      return null
    }
  },
  { default: () => null }
)

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

// slug 优先取 props，降级取路由参数
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'qr-code',
)

// ===== qrcode-generator 动态加载（启用 UTF-8 编码支持中文等非 ASCII 字符） =====
interface QrInstance {
  addData(data: string): void
  make(): void
  getModuleCount(): number
  isDark(row: number, col: number): boolean
}
type QrEcl = 'L' | 'M' | 'Q' | 'H'

// qrcode 工厂是可调用对象，同时挂载 stringToBytes 属性
interface QrFactory {
  (typeNumber: number, ecl: QrEcl): QrInstance
  stringToBytes: (s: string) => number[]
}

/**
 * 将字符串编码为 UTF-8 字节数组
 * qrcode-generator 的 .mjs 版本不包含 UTF-8 支持，
 * 默认的 stringToBytes 只取 charCodeAt & 0xff（低 8 位），中文高位丢失导致乱码。
 */
function utf8StringToBytes(s: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < s.length; i++) {
    let code = s.charCodeAt(i)
    // 处理 UTF-16 代理对（emoji 等超过 BMP 的字符）
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < s.length) {
      const next = s.charCodeAt(i + 1)
      if (next >= 0xDC00 && next <= 0xDFFF) {
        code = 0x10000 + ((code - 0xD800) << 10) + (next - 0xDC00)
        i++
      }
    }
    if (code <= 0x7F) {
      bytes.push(code)
    } else if (code <= 0x7FF) {
      bytes.push(0xC0 | (code >>> 6), 0x80 | (code & 0x3F))
    } else if (code <= 0xFFFF) {
      bytes.push(0xE0 | (code >>> 12), 0x80 | ((code >>> 6) & 0x3F), 0x80 | (code & 0x3F))
    } else if (code <= 0x10FFFF) {
      bytes.push(0xF0 | (code >>> 18), 0x80 | ((code >>> 12) & 0x3F), 0x80 | ((code >>> 6) & 0x3F), 0x80 | (code & 0x3F))
    }
  }
  return bytes
}

let qrFactoryPromise: Promise<QrFactory> | null = null
function getQrFactory(): Promise<QrFactory> {
  if (!qrFactoryPromise) {
    qrFactoryPromise = import('qrcode-generator').then((mod) => {
      const factory = (mod as unknown as { qrcode: QrFactory }).qrcode
      // 替换默认编码为 UTF-8，确保中文等多字节字符能正确编码
      factory.stringToBytes = utf8StringToBytes
      return factory
    })
  }
  return qrFactoryPromise
}

// ===== 内容类型 =====
type ContentType = 'text' | 'url' | 'wifi' | 'email'

const contentType = ref<ContentType>('text')
const typeTabs: { value: ContentType; label: string; icon: typeof Text }[] = [
  { value: 'text', label: '文本', icon: Text },
  { value: 'url', label: '链接', icon: Link },
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'email', label: '邮箱', icon: Mail },
]

const text = ref('')
const wifiSsid = ref('')
const wifiPassword = ref('')
const wifiEncryption = ref<'WPA' | 'WEP' | 'nopass'>('WPA')
const emailTo = ref('')
const emailSubject = ref('')
const emailBody = ref('')

const contentHint = computed(() => {
  switch (contentType.value) {
    case 'text':
      return '输入任意文本内容'
    case 'url':
      return '输入完整的网址链接'
    case 'wifi':
      return '填写 WiFi 连接信息'
    case 'email':
      return '填写邮箱信息'
  }
})
const textPlaceholder = computed(() =>
  contentType.value === 'url'
    ? '例如：https://example.com'
    : '输入任意文本内容...',
)

/** WiFi 参数字符转义（在 \ , ; : " 前加反斜杠） */
function escapeQRWifi(str: string): string {
  return str.replace(/([\\;,:"])/g, '\\$1')
}

/** 根据当前内容类型组装二维码内容 */
function getContent(): string {
  if (contentType.value === 'text' || contentType.value === 'url') {
    return text.value.trim()
  }
  if (contentType.value === 'wifi') {
    const ssid = wifiSsid.value.trim()
    if (!ssid) return ''
    const escapedSsid = escapeQRWifi(ssid)
    if (wifiEncryption.value === 'nopass') {
      return `WIFI:T:nopass;S:${escapedSsid};;`
    }
    const escapedPass = escapeQRWifi(wifiPassword.value)
    return `WIFI:T:${wifiEncryption.value};S:${escapedSsid};P:${escapedPass};;`
  }
  if (contentType.value === 'email') {
    const to = emailTo.value.trim()
    if (!to) return ''
    let result = `mailto:${to}`
    const params: string[] = []
    const subject = emailSubject.value.trim()
    const body = emailBody.value.trim()
    if (subject) params.push(`subject=${subject.replace(/&/g, '%26')}`)
    if (body) params.push(`body=${body.replace(/&/g, '%26')}`)
    if (params.length) result += `?${params.join('&')}`
    return result
  }
  return ''
}

// ===== 纠错等级 / 尺寸 / 边距 =====
const ecl = ref<QrEcl>('M')
const eclOptions: { value: QrEcl; label: string }[] = [
  { value: 'L', label: 'L · 7%' },
  { value: 'M', label: 'M · 15%' },
  { value: 'Q', label: 'Q · 25%' },
  { value: 'H', label: 'H · 30%' },
]
const size = ref(280)
const margin = ref(2)

// ===== 颜色 =====
const FG_DEFAULT = '#1e293b'
const BG_DEFAULT = '#ffffff'
const FG_PRESETS = [
  '#1e293b',
  '#000000',
  '#4f46e5',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#6366f1',
  '#db2777',
]
const BG_PRESETS = [
  '#ffffff',
  '#f8fafc',
  '#eef2ff',
  '#fef2f2',
  '#f0fdf4',
  '#fffbeb',
  '#0f172a',
  '#1e1b4b',
]

const fgColor = ref(FG_DEFAULT)
const bgColor = ref(BG_DEFAULT)
const fgHex = ref(FG_DEFAULT)
const bgHex = ref(BG_DEFAULT)

/** 颜色 input 变化：同步 hex 文本（重绘由 watch 触发） */
function syncFgHex() {
  fgHex.value = fgColor.value
}
function syncBgHex() {
  bgHex.value = bgColor.value
}

/** hex 文本输入：仅在校验通过时应用颜色 */
function onFgHexInput() {
  let val = fgHex.value.trim()
  if (!val.startsWith('#')) val = '#' + val
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    setFgColor(val)
  }
}
function onBgHexInput() {
  let val = bgHex.value.trim()
  if (!val.startsWith('#')) val = '#' + val
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    setBgColor(val)
  }
}
function setFgColor(color: string) {
  fgColor.value = color.toLowerCase()
  fgHex.value = fgColor.value
}
function setBgColor(color: string) {
  bgColor.value = color.toLowerCase()
  bgHex.value = bgColor.value
}
function resetFg() {
  setFgColor(FG_DEFAULT)
}
function resetBg() {
  setBgColor(BG_DEFAULT)
}
function isPresetActive(preset: string, current: string): boolean {
  return preset.toLowerCase() === current.toLowerCase()
}

// ===== Logo 嵌入 =====
const logoEnabled = ref(false)
const logoImage = ref<HTMLImageElement | null>(null)
const logoDataUrl = ref('')
const logoFileName = ref('')
const logoSize = ref(20)
const logoDragover = ref(false)
const logoFileInput = ref<HTMLInputElement | null>(null)

function onLogoToggle() {
  if (logoEnabled.value && (ecl.value === 'L' || ecl.value === 'M')) {
    showToast('嵌入Logo建议使用 Q 或 H 纠错等级')
  }
}

function triggerLogoFileInput() {
  logoFileInput.value?.click()
}
function onLogoFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    loadLogoFile(target.files[0])
  }
}
function onLogoDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  logoDragover.value = true
}
function onLogoDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  logoDragover.value = true
}
function onLogoDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  logoDragover.value = false
}
function onLogoDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  logoDragover.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0 && files[0].type.startsWith('image/')) {
    loadLogoFile(files[0])
  }
}

/** 读取 Logo 图片（FileReader → Image），供 canvas 绘制与 SVG base64 嵌入 */
function loadLogoFile(file: File) {
  if (!file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    const img = new Image()
    img.onload = () => {
      logoImage.value = img
      logoDataUrl.value = result
      logoFileName.value = file.name
    }
    img.src = result
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  logoImage.value = null
  logoDataUrl.value = ''
  logoFileName.value = ''
  if (logoFileInput.value) logoFileInput.value.value = ''
}

// ===== 实时预览 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)
const qrReady = ref(false)
const qrError = ref(false)

let lastReportAt = 0

/** 渲染二维码到 canvas（SSR 阶段直接返回；tool_use 上报 3 秒节流） */
async function generateQR() {
  if (import.meta.server) return
  const canvas = canvasRef.value
  if (!canvas) return

  const content = getContent()
  if (!content) {
    qrReady.value = false
    qrError.value = false
    return
  }

  try {
    const factory = await getQrFactory()
    const qr = factory(0, ecl.value)
    qr.addData(content)
    qr.make()

    const moduleCount = qr.getModuleCount()
    const s = size.value
    const m = margin.value
    const totalModules = moduleCount + m * 2
    const pixelSize = s / totalModules

    canvas.width = s
    canvas.height = s
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.maxWidth = `${s}px`
    canvas.style.maxHeight = `${s}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 背景铺满
    ctx.fillStyle = bgColor.value
    ctx.fillRect(0, 0, s, s)

    // 绘制模块
    ctx.fillStyle = fgColor.value
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            (col + m) * pixelSize,
            (row + m) * pixelSize,
            pixelSize + 0.5,
            pixelSize + 0.5,
          )
        }
      }
    }

    // Logo 居中绘制：先背景色衬底，再 drawImage
    if (logoEnabled.value && logoImage.value) {
      const logoPixelSize = s * (logoSize.value / 100)
      const logoX = (s - logoPixelSize) / 2
      const logoY = (s - logoPixelSize) / 2
      const padding = logoPixelSize * 0.1
      ctx.fillStyle = bgColor.value
      ctx.fillRect(
        logoX - padding,
        logoY - padding,
        logoPixelSize + padding * 2,
        logoPixelSize + padding * 2,
      )
      ctx.drawImage(logoImage.value, logoX, logoY, logoPixelSize, logoPixelSize)
    }

    qrReady.value = true
    qrError.value = false

    // 节流上报 tool_use（3 秒内最多一次）
    const now = Date.now()
    if (now - lastReportAt >= 3000) {
      lastReportAt = now
      reportEvent('tool_use', effectiveSlug.value)
    }
  } catch {
    qrReady.value = false
    qrError.value = true
  }
}

// 所有输入 / 切换 / 滑块 / 颜色 / Logo 变化都触发重绘
watch(
  [
    contentType,
    text,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    emailTo,
    emailSubject,
    emailBody,
    ecl,
    size,
    margin,
    fgColor,
    bgColor,
    logoEnabled,
    logoImage,
    logoSize,
  ],
  () => {
    generateQR()
  },
)

// ===== 下载 =====
async function downloadPng() {
  if (import.meta.server) return
  if (!qrReady.value) {
    showToast('请先输入内容')
    return
  }
  const canvas = canvasRef.value
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `qrcode_${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
  showToast('PNG 已下载')
  reportEvent('download', effectiveSlug.value)
}

async function downloadSvg() {
  if (import.meta.server) return
  const content = getContent()
  if (!content) {
    showToast('请先输入内容')
    return
  }
  try {
    const factory = await getQrFactory()
    const qr = factory(0, ecl.value)
    qr.addData(content)
    qr.make()

    const moduleCount = qr.getModuleCount()
    const s = size.value
    const m = margin.value
    const totalModules = moduleCount + m * 2
    const pixelSize = s / totalModules

    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">`,
      `<rect width="${s}" height="${s}" fill="${bgColor.value}"/>`,
    ]

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          parts.push(
            `<rect x="${((col + m) * pixelSize).toFixed(2)}" y="${((row + m) * pixelSize).toFixed(2)}" width="${(pixelSize + 0.5).toFixed(2)}" height="${(pixelSize + 0.5).toFixed(2)}" fill="${fgColor.value}"/>`,
          )
        }
      }
    }

    // Logo 以 base64 <image> 嵌入
    if (logoEnabled.value && logoImage.value && logoDataUrl.value) {
      const logoPixelSize = s * (logoSize.value / 100)
      const logoX = (s - logoPixelSize) / 2
      const logoY = (s - logoPixelSize) / 2
      const padding = logoPixelSize * 0.1
      parts.push(
        `<rect x="${(logoX - padding).toFixed(2)}" y="${(logoY - padding).toFixed(2)}" width="${(logoPixelSize + padding * 2).toFixed(2)}" height="${(logoPixelSize + padding * 2).toFixed(2)}" fill="${bgColor.value}"/>`,
        `<image x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${logoPixelSize.toFixed(2)}" height="${logoPixelSize.toFixed(2)}" href="${logoDataUrl.value}"/>`,
      )
    }

    parts.push('</svg>')
    const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `qrcode_${Date.now()}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    showToast('SVG 已下载')
    reportEvent('download', effectiveSlug.value)
  } catch {
    showToast('生成失败，请重试')
  }
}

// ===== Toast =====
const toastMsg = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  if (import.meta.server) return
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

// ===== 使用说明 =====
const infoCards = [
  {
    icon: FileText,
    title: '内容类型',
    description:
      '支持纯文本、网址链接、WiFi 信息和邮箱地址四种类型。WiFi 二维码扫描后可直接连接网络，邮箱二维码可预填收件人和主题。',
  },
  {
    icon: ShieldCheck,
    title: '纠错等级',
    description:
      '纠错等级越高，二维码的抗污损能力越强，但数据密度也越高。嵌入 Logo 时建议选择 Q 或 H 等级以保证可识别性。',
  },
  {
    icon: ImageIcon,
    title: 'Logo 嵌入',
    description:
      '上传 Logo 图片后可调整大小比例，Logo 会居中放置在二维码上。建议使用正方形图片，并配合较高纠错等级使用。',
  },
  {
    icon: Palette,
    title: '颜色定制',
    description:
      '可自定义前景色和背景色，提供预设色板快速选择。注意保持足够的对比度以确保扫码成功率，深色前景配浅色背景效果最佳。',
  },
]

// 首次生成（客户端水合后渲染默认内容二维码）
onMounted(() => {
  generateQR()
})
</script>

<template>
  <div>
    <!-- 交互区：左配置 + 右预览 -->
    <div
      class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start"
    >
      <!-- ========== 左：配置卡片 ========== -->
      <div class="pz-card p-5">
        <!-- 内容类型 tabs -->
        <div class="pz-form-group">
          <label class="pz-label">内容类型</label>
          <div class="pz-tab-group" role="tablist" aria-label="内容类型">
            <button
              v-for="t in typeTabs"
              :key="t.value"
              type="button"
              class="pz-tab-btn"
              :data-active="contentType === t.value"
              role="tab"
              :aria-selected="contentType === t.value"
              @click="contentType = t.value"
            >
              <component
                :is="t.icon"
                class="w-[14px] h-[14px]"
                aria-hidden="true"
              />
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 文本 / 链接 共用 textarea -->
        <div
          v-if="contentType === 'text' || contentType === 'url'"
          class="pz-form-group"
        >
          <label class="pz-label">
            输入内容 <span class="pz-label-hint">{{ contentHint }}</span>
          </label>
          <textarea
            v-model="text"
            class="pz-textarea w-full"
            rows="3"
            :placeholder="textPlaceholder"
          />
        </div>

        <!-- WiFi 输入组 -->
        <template v-else-if="contentType === 'wifi'">
          <div class="flex gap-3">
            <div class="pz-form-group flex-1">
              <label class="pz-label">WiFi 名称 (SSID)</label>
              <input
                v-model="wifiSsid"
                type="text"
                class="pz-input"
                placeholder="MyWiFi"
              />
            </div>
            <div class="pz-form-group flex-1">
              <label class="pz-label">密码</label>
              <input
                v-model="wifiPassword"
                type="text"
                class="pz-input"
                placeholder="输入WiFi密码"
              />
            </div>
            <div class="pz-form-group flex-1">
              <label class="pz-label">加密方式</label>
              <select v-model="wifiEncryption" class="pz-select">
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">无密码</option>
              </select>
            </div>
          </div>
        </template>

        <!-- 邮箱输入组 -->
        <template v-else-if="contentType === 'email'">
          <div class="pz-form-group">
            <label class="pz-label">收件人邮箱</label>
            <input
              v-model="emailTo"
              type="email"
              class="pz-input w-full"
              placeholder="recipient@example.com"
            />
          </div>
          <div class="pz-form-group">
            <label class="pz-label">主题 <span class="pz-label-hint">可选</span></label>
            <input
              v-model="emailSubject"
              type="text"
              class="pz-input w-full"
              placeholder="邮件主题"
            />
          </div>
          <div class="pz-form-group">
            <label class="pz-label">正文 <span class="pz-label-hint">可选</span></label>
            <textarea
              v-model="emailBody"
              class="pz-textarea w-full"
              rows="3"
              placeholder="邮件正文内容..."
            />
          </div>
        </template>

        <div class="pz-divider" />

        <!-- 纠错等级 -->
        <div class="pz-form-group">
          <label class="pz-label">
            纠错等级 <span class="pz-label-hint">越高抗损坏能力越强</span>
          </label>
          <div class="pz-segmented" role="radiogroup" aria-label="纠错等级">
            <button
              v-for="e in eclOptions"
              :key="e.value"
              type="button"
              class="pz-seg-btn"
              :data-active="ecl === e.value"
              role="radio"
              :aria-checked="ecl === e.value"
              @click="ecl = e.value"
            >
              {{ e.label }}
            </button>
          </div>
        </div>

        <!-- 尺寸 -->
        <div class="pz-form-group">
          <label class="pz-label">
            尺寸 <span class="pz-label-hint">{{ size }} × {{ size }} px</span>
          </label>
          <div class="pz-slider-row">
            <input
              v-model.number="size"
              type="range"
              class="pz-slider"
              min="128"
              max="1024"
              step="8"
            />
            <span class="pz-slider-value">{{ size }}</span>
          </div>
        </div>

        <!-- 边距 -->
        <div class="pz-form-group">
          <label class="pz-label">边距 <span class="pz-label-hint">模块数</span></label>
          <div class="pz-slider-row">
            <input
              v-model.number="margin"
              type="range"
              class="pz-slider"
              min="0"
              max="10"
              step="1"
            />
            <span class="pz-slider-value">{{ margin }}</span>
          </div>
        </div>

        <div class="pz-divider" />

        <!-- 前景色 -->
        <div class="pz-form-group">
          <label class="pz-label">前景色</label>
          <div class="pz-color-row">
            <div class="pz-color-swatch">
              <input v-model="fgColor" type="color" @input="syncFgHex" />
            </div>
            <input
              v-model="fgHex"
              type="text"
              class="pz-input pz-color-hex"
              spellcheck="false"
              @input="onFgHexInput"
            />
            <button type="button" class="pz-color-reset" @click="resetFg">
              重置
            </button>
          </div>
          <div class="pz-presets">
            <button
              v-for="c in FG_PRESETS"
              :key="c"
              type="button"
              class="pz-preset-color"
              :style="{ backgroundColor: c }"
              :data-active="isPresetActive(c, fgColor)"
              :aria-label="`前景色 ${c}`"
              @click="setFgColor(c)"
            />
          </div>
        </div>

        <!-- 背景色 -->
        <div class="pz-form-group">
          <label class="pz-label">背景色</label>
          <div class="pz-color-row">
            <div class="pz-color-swatch">
              <input v-model="bgColor" type="color" @input="syncBgHex" />
            </div>
            <input
              v-model="bgHex"
              type="text"
              class="pz-input pz-color-hex"
              spellcheck="false"
              @input="onBgHexInput"
            />
            <button type="button" class="pz-color-reset" @click="resetBg">
              重置
            </button>
          </div>
          <div class="pz-presets">
            <button
              v-for="c in BG_PRESETS"
              :key="c"
              type="button"
              class="pz-preset-color"
              :style="{ backgroundColor: c }"
              :data-active="isPresetActive(c, bgColor)"
              :aria-label="`背景色 ${c}`"
              @click="setBgColor(c)"
            />
          </div>
        </div>

        <div class="pz-divider" />

        <!-- 嵌入 Logo -->
        <div class="pz-form-group">
          <div class="pz-switch-row">
            <label
              class="pz-label"
              style="margin-bottom: 0"
              for="pz-qr-logo-switch"
            >
              嵌入 Logo <span class="pz-label-hint">中心放置图片</span>
            </label>
            <label class="pz-switch">
              <input
                id="pz-qr-logo-switch"
                v-model="logoEnabled"
                type="checkbox"
                @change="onLogoToggle"
              />
              <span class="pz-switch-slider" />
            </label>
          </div>
        </div>

        <div v-if="logoEnabled" class="flex flex-col gap-3">
          <!-- Logo 上传 / 预览 -->
          <input
            ref="logoFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onLogoFileChange"
          />
          <div
            v-if="!logoImage"
            class="pz-file-drop"
            :class="{ 'pz-dragover': logoDragover }"
            role="button"
            tabindex="0"
            aria-label="上传 Logo 图片"
            @click="triggerLogoFileInput"
            @keydown.enter.prevent="triggerLogoFileInput"
            @keydown.space.prevent="triggerLogoFileInput"
            @dragover="onLogoDragOver"
            @dragenter="onLogoDragEnter"
            @dragleave="onLogoDragLeave"
            @drop="onLogoDrop"
          >
            <div class="pz-file-drop-text">
              <UploadCloud
                class="w-5 h-5 inline-block mr-1 align-text-bottom"
                style="color: var(--pz-color-text-tertiary)"
                aria-hidden="true"
              />
              <strong>点击上传</strong> 或拖拽图片到此处
            </div>
          </div>
          <div v-else class="pz-file-preview">
            <img :src="logoDataUrl" alt="logo" />
            <span class="pz-file-name truncate">{{ logoFileName }}</span>
            <button
              type="button"
              class="pz-file-clear"
              aria-label="移除 Logo"
              @click="removeLogo"
            >
              <Trash2 class="w-[14px] h-[14px]" aria-hidden="true" />
              移除
            </button>
          </div>

          <!-- Logo 大小 -->
          <div class="pz-form-group">
            <label class="pz-label">
              Logo 大小 <span class="pz-label-hint">占二维码比例</span>
            </label>
            <div class="pz-slider-row">
              <input
                v-model.number="logoSize"
                type="range"
                class="pz-slider"
                min="10"
                max="35"
                step="1"
              />
              <span class="pz-slider-value">{{ logoSize }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 右：实时预览卡片 ========== -->
      <div class="pz-card p-5 lg:sticky lg:top-20">
        <div class="flex items-center gap-2 mb-4">
          <Eye
            class="w-[18px] h-[18px]"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          />
          <h2
            class="text-base font-semibold"
            style="color: var(--pz-color-text-primary)"
          >
            实时预览
          </h2>
        </div>

        <div class="flex flex-col items-center gap-4">
          <div class="pz-qr-canvas-wrapper">
            <canvas v-show="qrReady" ref="canvasRef" />
            <div v-if="!qrReady" class="pz-qr-empty">
              <QrCode class="w-12 h-12 mx-auto mb-2 opacity-40" aria-hidden="true" />
              <p>
                {{ qrError ? '内容过长，请减少输入或降低纠错等级' : '输入内容生成二维码' }}
              </p>
            </div>
          </div>

          <div class="pz-download-row">
            <button
              type="button"
              class="pz-btn-primary whitespace-nowrap"
              @click="downloadPng"
            >
              <Download class="w-4 h-4" aria-hidden="true" />
              <span>下载 PNG</span>
            </button>
            <button
              type="button"
              class="pz-btn-secondary whitespace-nowrap"
              @click="downloadSvg"
            >
              <Download class="w-4 h-4" aria-hidden="true" />
              <span>下载 SVG</span>
            </button>
          </div>

          <div
            class="text-center text-xs"
            style="color: var(--pz-color-text-tertiary); line-height: 1.6"
          >
            <span class="pz-badge pz-badge-primary mb-1">本地处理</span>
            <p>数据不上传服务器，隐私安全有保障</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 广告位（使用说明上方） ========== -->
    <div class="mt-8">
      <StaticAdCard
        v-if="adData"
        id="qrCodeMiddle"
        :title="adData.product_description"
        :image-url="adData.product_url"
        :link-url="adData.ad_url"
      />
    </div>

    <!-- ========== 使用说明 ========== -->
    <section class="mt-8" aria-label="使用说明">
      <h2
        class="text-xl font-semibold mb-5"
        style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display)"
      >
        使用说明
      </h2>
      <div class="pz-info-grid">
        <div v-for="card in infoCards" :key="card.title" class="pz-info-card">
          <h3>
            <component
              :is="card.icon"
              class="w-[18px] h-[18px]"
              aria-hidden="true"
            />
            {{ card.title }}
          </h3>
          <p>{{ card.description }}</p>
        </div>
      </div>
    </section>

    <!-- ========== Toast ========== -->
    <Transition name="pz-toast-fade">
      <div v-if="toastVisible" class="pz-toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* === 表单分组 / 标签 === */
.pz-form-group {
  margin-bottom: 1.25rem;
}
.pz-form-group:last-child {
  margin-bottom: 0;
}
.pz-label {
  display: block;
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  margin-bottom: 0.375rem;
}
.pz-label-hint {
  font-weight: var(--pz-weight-normal);
  color: var(--pz-color-text-tertiary);
  font-size: var(--pz-text-xs);
  margin-left: 0.25rem;
}

/* === 内容类型 tabs === */
.pz-tab-group {
  display: inline-flex;
  gap: 0.25rem;
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-full);
  padding: 0.25rem;
}
.pz-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: transparent;
  border: none;
  border-radius: var(--pz-radius-full);
  color: var(--pz-color-text-secondary);
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  padding: 0.375rem 1rem;
  transition: all 0.15s;
  white-space: nowrap;
  cursor: pointer;
}
.pz-tab-btn:hover {
  color: var(--pz-color-text-primary);
}
.pz-tab-btn[data-active='true'] {
  background-color: var(--pz-color-primary);
  color: var(--pz-color-text-inverse);
}

/* === 分割线 === */
.pz-divider {
  height: 1px;
  background-color: var(--pz-color-border-light);
  margin: 1.25rem 0;
}

/* === 纠错等级 segmented === */
.pz-segmented {
  display: flex;
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-md);
  padding: 3px;
  gap: 2px;
}
.pz-seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--pz-color-text-secondary);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  padding: 0.4375rem 0.5rem;
  transition: all 0.15s;
  cursor: pointer;
  white-space: nowrap;
}
.pz-seg-btn:hover {
  color: var(--pz-color-text-primary);
}
.pz-seg-btn[data-active='true'] {
  background-color: var(--pz-color-surface);
  color: var(--pz-color-primary);
  box-shadow: var(--pz-shadow-xs);
}

/* === 滑块 === */
.pz-slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.pz-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-full);
  outline: none;
}
.pz-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--pz-color-primary);
  cursor: pointer;
  border: 2px solid var(--pz-color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.1s;
}
.pz-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.pz-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--pz-color-primary);
  cursor: pointer;
  border: 2px solid var(--pz-color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.pz-slider-value {
  min-width: 48px;
  text-align: center;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-sm);
  padding: 0.125rem 0.375rem;
}

/* === 颜色控件 === */
.pz-color-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.pz-color-swatch {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--pz-radius-md);
  border: 1px solid var(--pz-color-border);
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}
.pz-color-swatch input[type='color'] {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  border: none;
  cursor: pointer;
  background: none;
}
.pz-color-hex {
  flex: 1;
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  text-transform: uppercase;
}
.pz-color-reset {
  background: transparent;
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  color: var(--pz-color-text-secondary);
  font-size: var(--pz-text-xs);
  padding: 0.375rem 0.625rem;
  transition: all 0.15s;
  white-space: nowrap;
  cursor: pointer;
}
.pz-color-reset:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}
.pz-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
.pz-preset-color {
  width: 24px;
  height: 24px;
  border-radius: var(--pz-radius-sm);
  border: 2px solid var(--pz-color-border);
  cursor: pointer;
  transition:
    transform 0.1s,
    border-color 0.15s;
  padding: 0;
}
.pz-preset-color:hover {
  transform: scale(1.15);
  border-color: var(--pz-color-primary);
}
.pz-preset-color[data-active='true'] {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 2px var(--pz-color-primary-lighter);
}

/* === 下拉选择 === */
.pz-select {
  width: 100%;
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  color: var(--pz-color-text-primary);
  font-size: var(--pz-text-sm);
  outline: none;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  padding-right: 2rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.pz-select:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}

/* === 开关 === */
.pz-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.pz-switch {
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.pz-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.pz-switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--pz-color-border-strong);
  border-radius: var(--pz-radius-full);
  transition: background-color 0.2s;
}
.pz-switch-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  top: 3px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.pz-switch input:checked + .pz-switch-slider {
  background-color: var(--pz-color-primary);
}
.pz-switch input:checked + .pz-switch-slider::before {
  transform: translateX(18px);
}

/* === Logo 上传 / 预览 === */
.pz-file-drop {
  border: 1.5px dashed var(--pz-color-border-strong);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem 1rem;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}
.pz-file-drop:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-file-drop.pz-dragover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}
.pz-file-drop-text {
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
}
.pz-file-drop-text strong {
  color: var(--pz-color-primary);
  font-weight: var(--pz-weight-medium);
}
.pz-file-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--pz-color-bg-tertiary);
  border-radius: var(--pz-radius-md);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
}
.pz-file-preview img {
  width: 28px;
  height: 28px;
  border-radius: var(--pz-radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}
.pz-file-name {
  flex: 1;
  min-width: 0;
}
.pz-file-clear {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  color: var(--pz-color-text-secondary);
  font-size: var(--pz-text-sm);
  padding: 0.25rem 0.625rem;
  transition: all 0.15s;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.pz-file-clear:hover {
  border-color: var(--pz-state-error);
  color: var(--pz-state-error);
}

/* === 实时预览 === */
.pz-qr-canvas-wrapper {
  position: relative;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-lg);
  padding: 1rem;
}
.pz-qr-canvas-wrapper canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--pz-radius-sm);
}
.pz-qr-empty {
  text-align: center;
  color: var(--pz-color-text-tertiary);
}
.pz-qr-empty p {
  font-size: var(--pz-text-sm);
}
.pz-download-row {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

/* === 使用说明卡片 === */
.pz-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
.pz-info-card {
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-lg);
  padding: 1.25rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.pz-info-card:hover {
  border-color: var(--pz-color-primary-border);
  box-shadow: var(--pz-shadow-md);
  transform: translateY(-2px);
}
.pz-info-card h3 {
  font-family: var(--pz-font-display);
  font-size: var(--pz-text-base);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-primary);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.pz-info-card h3 svg {
  color: var(--pz-color-primary);
  flex-shrink: 0;
}
.pz-info-card p {
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
  line-height: var(--pz-leading-relaxed);
}

/* === Toast === */
.pz-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%) translateY(0);
  background-color: var(--pz-color-text-primary);
  color: var(--pz-color-bg);
  padding: 0.625rem 1.25rem;
  border-radius: var(--pz-radius-md);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  box-shadow: var(--pz-shadow-floating);
  z-index: 100;
  pointer-events: none;
  max-width: calc(100vw - 2rem);
}
.pz-toast-fade-enter-active,
.pz-toast-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.pz-toast-fade-enter-from,
.pz-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(100px);
}

@media (prefers-reduced-motion: reduce) {
  .pz-tab-btn,
  .pz-seg-btn,
  .pz-slider,
  .pz-color-reset,
  .pz-preset-color,
  .pz-switch-slider,
  .pz-file-drop,
  .pz-file-clear,
  .pz-info-card {
    transition: none;
  }
}
</style>
