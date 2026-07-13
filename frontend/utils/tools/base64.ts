/**
 * base64.ts - UTF-8 安全的 Base64 编解码纯函数
 *
 * 设计要点：
 * - encodeBase64 / decodeBase64 支持 'utf8' 与 'ascii' 两种字符编码方式
 * - UTF-8 模式使用 TextEncoder/TextDecoder 处理多字节字符（如中文），
 *   再通过 btoa/atob 完成 Base64 转换，避免中文乱码
 * - addLineBreaks：RFC 2045 风格每 width 字符插入换行（默认 76）
 * - fileToBase64：浏览器端将 File 转为 Base64 字符串（剥离 data URL 前缀）
 *
 * 所有函数无副作用，可在 SSR 与测试环境（happy-dom）中运行。
 */

export type Base64Charset = 'utf8' | 'ascii'

export interface Base64Result {
  success: boolean
  output?: string
  error?: string
}

/** 合法的 Base64 字符集（末尾可选 0~2 个 = 填充） */
const B64_CHARSET_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * 将 Uint8Array 转为二进制字符串（每字节对应一个 char 码点）
 *
 * 分块拼接以避免对大数组使用 spread 导致调用栈溢出。
 */
function bytesToBinaryString(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
    binary += String.fromCharCode.apply(
      null,
      Array.from(slice) as unknown as number[],
    )
  }
  return binary
}

/**
 * 将二进制字符串转回 Uint8Array
 */
function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Base64 编码（UTF-8 安全）
 *
 * @param input   待编码字符串
 * @param charset 'utf8'（默认，支持中文等多字节字符）| 'ascii'（仅 Latin1）
 * @returns 成功返回 { success: true, output }，失败返回 { success: false, error }
 */
export function encodeBase64(
  input: string,
  charset: Base64Charset = 'utf8',
): Base64Result {
  if (input === '') return { success: true, output: '' }

  try {
    if (charset === 'utf8') {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(input)
      return { success: true, output: btoa(bytesToBinaryString(bytes)) }
    }
    // ASCII / Latin1 模式：直接 btoa（仅支持码点 <= 0xFF 的字符）
    return { success: true, output: btoa(input) }
  } catch (err) {
    return {
      success: false,
      error: `编码失败：${err instanceof Error ? err.message : '输入包含无法处理的字符'}`,
    }
  }
}

/**
 * Base64 解码（UTF-8 安全）
 *
 * @param input   Base64 字符串（允许包含 RFC 2045 风格换行与空白）
 * @param charset 'utf8'（默认）| 'ascii'
 * @returns 成功返回 { success: true, output }，失败返回 { success: false, error }
 */
export function decodeBase64(
  input: string,
  charset: Base64Charset = 'utf8',
): Base64Result {
  if (input === '') return { success: true, output: '' }

  // 移除所有空白与换行（兼容 RFC 2045 风格输出）
  const cleaned = input.replace(/\s+/g, '')
  if (cleaned === '') return { success: true, output: '' }

  // 字符集校验
  if (!B64_CHARSET_REGEX.test(cleaned)) {
    return { success: false, error: '输入包含无效的 Base64 字符' }
  }
  // 长度必须为 4 的倍数
  if (cleaned.length % 4 !== 0) {
    return { success: false, error: 'Base64 字符串长度无效（应为 4 的倍数）' }
  }

  try {
    const binary = atob(cleaned)
    if (charset === 'utf8') {
      const bytes = binaryStringToBytes(binary)
      const decoder = new TextDecoder('utf-8')
      return { success: true, output: decoder.decode(bytes) }
    }
    return { success: true, output: binary }
  } catch (err) {
    return {
      success: false,
      error: `解码失败：${err instanceof Error ? err.message : '格式错误'}`,
    }
  }
}

/**
 * 按 RFC 2045 风格每 width 字符插入换行（默认 76）
 *
 * 末尾不保留多余换行，与 MIME 规范一致。
 *
 * @param b64   Base64 字符串
 * @param width 每行宽度（默认 76）
 */
export function addLineBreaks(b64: string, width: number = 76): string {
  if (!b64) return ''
  const w = width > 0 ? Math.floor(width) : 76
  return b64.replace(new RegExp(`(.{${w}})`, 'g'), '$1\n').replace(/\n$/, '')
}

/**
 * 将浏览器 File 对象转换为 Base64 字符串（剥离 data:...;base64, 前缀）
 *
 * 仅在浏览器环境可用（依赖 FileReader）。
 *
 * @param file 浏览器 File 对象
 * @returns 纯 Base64 字符串
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('读取文件失败：不支持的结果类型'))
        return
      }
      const commaIdx = result.indexOf(',')
      resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
