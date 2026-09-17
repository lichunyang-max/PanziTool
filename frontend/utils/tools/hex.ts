/**
 * hex.ts - 十六进制编解码纯函数
 *
 * 严格移植自 panziui/tools/hex-encode.html 内联 script 的核心转换逻辑：
 * - encodeHex：使用 TextEncoder 将文本编码为 UTF-8 字节，再以十六进制表示
 *   支持四种分隔格式：none（连续）/ space（空格）/ 0x（0x 前缀）/ \x（\x 前缀）
 * - decodeHex：自动清理常见分隔符与前缀（0x、\x、空格、逗号等），按 UTF-8 解码
 *   使用 fatal: true 的 TextDecoder，遇到非法字节序列会抛错
 *
 * 所有函数无副作用，可在 SSR 与测试环境中运行。
 */

/** 分隔符格式 */
export type HexSeparator = 'none' | 'space' | '0x' | 'backslash-x'

/** 编码/解码操作结果 */
export interface HexResult {
  success: boolean
  output?: string
  error?: string
}

/**
 * 将文本编码为十六进制字符串
 *
 * @param input     原始文本
 * @param separator 分隔格式（默认 space）
 * @returns 成功返回 { success: true, output }，失败返回 { success: false, error }
 */
export function encodeHex(
  input: string,
  separator: HexSeparator = 'space',
): HexResult {
  if (input === '') return { success: true, output: '' }

  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(input)
    let out: string

    switch (separator) {
      case 'none':
        out = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        break
      case 'space':
        out = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ')
        break
      case '0x':
        out = Array.from(bytes, (b) => '0x' + b.toString(16).padStart(2, '0')).join(' ')
        break
      case 'backslash-x':
        out = Array.from(bytes, (b) => '\\x' + b.toString(16).padStart(2, '0')).join('')
        break
    }

    return { success: true, output: out }
  } catch (err) {
    return {
      success: false,
      error: `编码失败：${err instanceof Error ? err.message : '输入包含无法处理的字符'}`,
    }
  }
}

/**
 * 将十六进制字符串解码为文本
 *
 * 自动清理常见分隔符与前缀（0x、\x、空格、逗号、分号、冒号、点、连字符、下划线）。
 *
 * @param input 十六进制字符串（可含分隔符与前缀）
 * @returns 成功返回 { success: true, output }，失败返回 { success: false, error }
 */
export function decodeHex(input: string): HexResult {
  if (input === '') return { success: true, output: '' }

  // 清理常见分隔符与前缀
  const cleaned = input
    .replace(/0[xX]/g, '')
    .replace(/\\x/gi, '')
    .replace(/[\s,;:.\-_]/g, '')
    .trim()

  if (cleaned === '') return { success: true, output: '' }

  // 字符集校验
  if (/[^0-9a-fA-F]/.test(cleaned)) {
    return {
      success: false,
      error: '包含非法的十六进制字符（合法字符：0-9、A-F，可含空格或 0x/\\x 前缀）',
    }
  }

  // 长度必须为偶数（每两个字符表示一个字节）
  if (cleaned.length % 2 !== 0) {
    return {
      success: false,
      error: '十六进制字符数为奇数，每两个字符表示一个字节，请检查输入是否完整',
    }
  }

  try {
    const bytes = new Uint8Array(cleaned.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16)
    }
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return { success: true, output: decoder.decode(bytes) }
  } catch (err) {
    return {
      success: false,
      error: `解码失败：${err instanceof Error ? err.message : '输入内容无法按 UTF-8 解码，请检查字节序列是否完整'}`,
    }
  }
}
