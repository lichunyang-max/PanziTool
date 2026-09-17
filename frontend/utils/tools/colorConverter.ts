/**
 * colorConverter.ts - 颜色格式转换纯函数
 *
 * 支持 HEX / RGB / HSL 三种颜色表示的互转，提供：
 * - hexToRgb / rgbToHex：HEX 与 RGB 互转（支持 #RGB / #RRGGBB / #RRGGBBAA）
 * - rgbToHsl / hslToRgb：RGB 与 HSL 互转（H:0-360, S/L:0-100）
 * - parseColor：自动识别输入格式并解析为 RGB + HSL 双向数据
 * - formatColor：按目标格式输出字符串
 *
 * 所有函数为纯函数，可在 SSR 与 Vitest 中独立运行。
 * 颜色计算参考 CSS Color Module Level 4 规范。
 */

/** RGB 颜色（0-255），a 为 0-1 透明度（可选） */
export interface RgbColor {
  r: number
  g: number
  b: number
  a?: number
}

/** HSL 颜色（H:0-360, S/L:0-100），a 为 0-1 透明度（可选） */
export interface HslColor {
  h: number
  s: number
  l: number
  a?: number
}

/** 颜色字符串格式 */
export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla'

/** parseColor 返回结果 */
export interface ColorParseResult {
  success: boolean
  format?: ColorFormat
  rgb?: RgbColor
  hsl?: HslColor
  error?: string
}

/** 将数值钳制到 [min, max] 区间 */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** 将 0-255 的数值转为两位十六进制 */
function toHexByte(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
}

/**
 * HEX 字符串转 RGB。
 *
 * 支持格式：
 * - #RGB（4 位短形式）
 * - #RRGGBB
 * - #RRGGBBAA
 * - 不带 # 前缀
 *
 * @param hex HEX 字符串
 * @returns RgbColor 或 null（格式不合法）
 */
export function hexToRgb(hex: string): RgbColor | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]!
  // 短形式 #RGB → #RRGGBB
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const a =
    h.length === 8
      ? Math.round((parseInt(h.slice(6, 8), 16) / 255) * 1000) / 1000
      : undefined
  return {
    r,
    g,
    b,
    a: a !== undefined ? Number(a.toFixed(3)) : undefined,
  }
}

/**
 * RGB 转 HEX 字符串。
 *
 * 当 a < 1 时输出 8 位 #RRGGBBAA 形式，否则输出 6 位 #RRGGBB。
 */
export function rgbToHex(rgb: RgbColor): string {
  const hex =
    '#' + toHexByte(rgb.r) + toHexByte(rgb.g) + toHexByte(rgb.b)
  if (rgb.a !== undefined && rgb.a < 1) {
    return hex + toHexByte(Math.round(clamp(rgb.a, 0, 1) * 255))
  }
  return hex
}

/**
 * RGB 转 HSL。
 *
 * 算法参考 CSS Color Module Level 4，H 单位为度（0-360），
 * S/L 为百分比（0-100），均四舍五入为整数。
 */
export function rgbToHsl(rgb: RgbColor): HslColor {
  const r = clamp(rgb.r, 0, 255) / 255
  const g = clamp(rgb.g, 0, 255) / 255
  const b = clamp(rgb.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6
    } else if (max === g) {
      h = (b - r) / d + 2
    } else {
      h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: rgb.a,
  }
}

/**
 * HSL 转 RGB。
 *
 * 算法参考 CSS Color Module Level 4，输入 H:0-360, S/L:0-100，
 * 输出 RGB:0-255。
 */
export function hslToRgb(hsl: HslColor): RgbColor {
  const h = (((hsl.h % 360) + 360) % 360) / 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsl.a,
  }
}

/** HEX → HSL */
export function hexToHsl(hex: string): HslColor | null {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHsl(rgb) : null
}

/** HSL → HEX */
export function hslToHex(hsl: HslColor): string {
  return rgbToHex(hslToRgb(hsl))
}

/**
 * 自动识别并解析颜色字符串。
 *
 * 支持 HEX / rgb() / rgba() / hsl() / hsla() 五种格式。
 * 同时返回 RGB 与 HSL 双向数据，方便 UI 展示。
 *
 * @param input 颜色字符串
 */
export function parseColor(input: string): ColorParseResult {
  const text = input.trim()
  if (!text) return { success: false, error: '请输入颜色值' }

  // HEX
  if (/^#?[0-9a-f]{3}([0-9a-f]{3}|[0-9a-f]{5})?$/i.test(text)) {
    const rgb = hexToRgb(text)
    if (rgb) {
      return {
        success: true,
        format: 'hex',
        rgb,
        hsl: rgbToHsl(rgb),
      }
    }
  }

  // rgb() / rgba()
  const rgbMatch =
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/i.exec(
      text,
    )
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!, 10)
    const g = parseInt(rgbMatch[2]!, 10)
    const b = parseInt(rgbMatch[3]!, 10)
    if (r > 255 || g > 255 || b > 255) {
      return { success: false, error: 'RGB 分量必须在 0-255 范围内' }
    }
    const a =
      rgbMatch[4] !== undefined
        ? clamp(parseFloat(rgbMatch[4]), 0, 1)
        : undefined
    const rgb: RgbColor = { r, g, b, a: a ?? undefined }
    return {
      success: true,
      format: a !== undefined ? 'rgba' : 'rgb',
      rgb,
      hsl: rgbToHsl(rgb),
    }
  }

  // hsl() / hsla()
  const hslMatch =
    /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/i.exec(
      text,
    )
  if (hslMatch) {
    const h = parseInt(hslMatch[1]!, 10)
    const s = parseInt(hslMatch[2]!, 10)
    const l = parseInt(hslMatch[3]!, 10)
    if (h > 360 || s > 100 || l > 100) {
      return {
        success: false,
        error: 'HSL 分量超出范围（H:0-360, S:0-100, L:0-100）',
      }
    }
    const a =
      hslMatch[4] !== undefined
        ? clamp(parseFloat(hslMatch[4]), 0, 1)
        : undefined
    const hsl: HslColor = { h, s, l, a: a ?? undefined }
    return {
      success: true,
      format: a !== undefined ? 'hsla' : 'hsl',
      rgb: hslToRgb(hsl),
      hsl,
    }
  }

  return {
    success: false,
    error: '无法识别的颜色格式，支持 HEX / RGB / HSL',
  }
}

/**
 * 按目标格式输出颜色字符串。
 *
 * @param rgb    RGB 颜色
 * @param format 目标格式
 */
export function formatColor(rgb: RgbColor, format: ColorFormat): string {
  switch (format) {
    case 'hex':
      return rgbToHex({ r: rgb.r, g: rgb.g, b: rgb.b })
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    case 'rgba':
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a ?? 1})`
    case 'hsl': {
      const hsl = rgbToHsl(rgb)
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
    }
    case 'hsla': {
      const hsl = rgbToHsl(rgb)
      return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgb.a ?? 1})`
    }
    default:
      return rgbToHex(rgb)
  }
}

/**
 * 生成一个随机 RGB 颜色（用于"随机颜色"按钮）。
 */
export function randomRgb(): RgbColor {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  }
}
