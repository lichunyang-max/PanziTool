/**
 * baseConvert.ts - 进制转换纯函数
 *
 * 支持 2 / 8 / 10 / 16 进制之间的互转，使用 BigInt 处理任意大数，
 * 保证超大整数（如 256 位以上）也能精确转换。
 *
 * 设计要点：
 * - parseToBigInt 手动按位解析输入字符串，避免 Number 精度丢失
 * - 兼容十六进制 0x 前缀（如 0xFF）
 * - 空输入返回 outputs 全为 '-'
 * - 非法字符返回 error
 *
 * 所有函数为纯函数，可在 SSR 与 Vitest 中独立运行。
 */

/** 进制类型 */
export type Radix = 2 | 8 | 10 | 16

/** 进制名称映射 */
export const RADIX_NAMES: Record<Radix, string> = {
  2: '二进制',
  8: '八进制',
  10: '十进制',
  16: '十六进制',
}

/** 所有支持的进制列表（用于 UI 渲染） */
export const RADICES: Radix[] = [2, 8, 10, 16]

/** 各进制对应的合法字符集 */
const RADIX_CHARS: Record<Radix, string> = {
  2: '01',
  8: '01234567',
  10: '0123456789',
  16: '0123456789abcdefABCDEF',
}

/** 进制转换结果 */
export interface BaseConvertResult {
  success: boolean
  /** 各进制对应的输出（键为进制数） */
  outputs?: Record<Radix, string>
  error?: string
}

/**
 * 将指定进制的字符串解析为 BigInt。
 *
 * 手动按位解析，避免 parseInt/Number 在大数下的精度丢失。
 * 兼容十六进制 0x 前缀。
 *
 * @param input     输入字符串
 * @param fromRadix 源进制
 * @returns 解析后的 BigInt，非法字符返回 null
 */
function parseToBigInt(input: string, fromRadix: Radix): bigint | null {
  let text = input.trim()
  if (text === '') return null

  // 兼容十六进制 0x 前缀
  if (fromRadix === 16 && /^0x/i.test(text)) {
    text = text.slice(2)
  }
  if (text === '') return null

  const validChars = RADIX_CHARS[fromRadix]
  let result = 0n
  const base = BigInt(fromRadix)

  for (const ch of text) {
    if (!validChars.includes(ch)) return null
    let digit: number
    if (ch >= '0' && ch <= '9') {
      digit = ch.charCodeAt(0) - 48 // '0' = 48
    } else if (ch >= 'a' && ch <= 'f') {
      digit = ch.charCodeAt(0) - 87 // 'a' = 97, 97 - 87 = 10
    } else {
      // A-F
      digit = ch.charCodeAt(0) - 55 // 'A' = 65, 65 - 55 = 10
    }
    result = result * base + BigInt(digit)
  }
  return result
}

/**
 * 将 BigInt 转换为指定进制的字符串。
 *
 * @param value  BigInt 值
 * @param toRadix 目标进制
 */
function bigIntToString(value: bigint, toRadix: Radix): string {
  if (value === 0n) return '0'

  const base = BigInt(toRadix)
  let n = value
  const digits: string[] = []

  while (n > 0n) {
    const rem = Number(n % base)
    n = n / base
    if (rem < 10) {
      digits.unshift(String(rem))
    } else {
      digits.unshift(String.fromCharCode(87 + rem)) // 10 -> 'a', ... 15 -> 'f'
    }
  }
  return digits.join('')
}

/**
 * 在指定进制下，将输入字符串转换为四种进制的字符串输出。
 *
 * @param input     输入字符串（可为空）
 * @param fromRadix 源进制
 */
export function convertBase(
  input: string,
  fromRadix: Radix,
): BaseConvertResult {
  const text = input.trim()

  // 空输入：所有输出置为 '-'
  if (text === '' || (fromRadix === 16 && /^0x$/i.test(text))) {
    return {
      success: true,
      outputs: { 2: '-', 8: '-', 10: '-', 16: '-' },
    }
  }

  const value = parseToBigInt(text, fromRadix)
  if (value === null) {
    return {
      success: false,
      error: `${RADIX_NAMES[fromRadix]}输入包含非法字符`,
    }
  }

  return {
    success: true,
    outputs: {
      2: bigIntToString(value, 2),
      8: bigIntToString(value, 8),
      10: bigIntToString(value, 10),
      16: bigIntToString(value, 16).toUpperCase(),
    },
  }
}
