/**
 * url.ts - URL 编码/解码纯函数
 *
 * 提供 URL 编码与解码能力，支持：
 * - 编码函数切换：encodeURIComponent（编码所有特殊字符）/ encodeURI（保留 URL 结构字符）
 * - 空格编码方式：%20（RFC 3986 标准）/ +（application/x-www-form-urlencoded 表单提交）
 * - 单条与批量（每行一个）处理
 *
 * 解码统一使用 decodeURIComponent，可正确还原 encodeURI / encodeURIComponent 的输出。
 */

/** 编码函数类型 */
export type EncodeFunction = 'encodeURIComponent' | 'encodeURI'

/** 空格编码方式 */
export type SpaceMode = 'percent20' | 'plus'

/** 编码/解码操作结果 */
export interface UrlResult {
  success: boolean
  output?: string
  error?: string
}

/**
 * 编码单个字符串
 *
 * @param input 原始文本
 * @param fn 编码函数（encodeURIComponent / encodeURI）
 * @param spaceMode 空格编码方式（%20 / +）
 * @returns 编码结果或错误信息
 */
export function encodeUrl(
  input: string,
  fn: EncodeFunction,
  spaceMode: SpaceMode,
): UrlResult {
  if (input === '') {
    return { success: true, output: '' }
  }

  try {
    const encoder = fn === 'encodeURI' ? encodeURI : encodeURIComponent
    let result = encoder(input)

    // 表单模式：将空格的 %20 编码替换为 +
    if (spaceMode === 'plus') {
      result = result.replace(/%20/g, '+')
    }

    return { success: true, output: result }
  } catch (err) {
    const message = err instanceof URIError ? err.message : String(err)
    return { success: false, error: `编码失败：${message}` }
  }
}

/**
 * 解码单个字符串
 *
 * 统一使用 decodeURIComponent，可正确还原 encodeURI / encodeURIComponent 的输出。
 * 当 spaceMode 为 'plus' 时，先将 + 转换为 %20 再解码（表单提交场景）。
 *
 * @param input URL 编码文本
 * @param spaceMode 空格编码方式（%20 / +）
 * @returns 解码结果或错误信息
 */
export function decodeUrl(input: string, spaceMode: SpaceMode): UrlResult {
  if (input === '') {
    return { success: true, output: '' }
  }

  try {
    let prepared = input

    // 表单模式：先将 + 转换为 %20，使 decode 能正确还原空格
    // 注意：已编码的 %2B（字面 +）不受影响，仍会还原为 +
    if (spaceMode === 'plus') {
      prepared = prepared.replace(/\+/g, '%20')
    }

    const result = decodeURIComponent(prepared)
    return { success: true, output: result }
  } catch (err) {
    const message = err instanceof URIError ? err.message : String(err)
    return {
      success: false,
      error: `解码失败：输入包含无效的 URL 编码序列（${message}）`,
    }
  }
}

/**
 * 批量编码（每行一个）
 *
 * @param input 多行文本（每行一个待编码字符串）
 * @param fn 编码函数
 * @param spaceMode 空格编码方式
 * @returns 每行对应的编码结果数组；空行返回空字符串；失败行返回 [错误] 前缀信息
 */
export function batchEncode(
  input: string,
  fn: EncodeFunction,
  spaceMode: SpaceMode,
): string[] {
  const lines = input.split(/\r?\n/)
  return lines.map((line) => {
    if (line === '') return ''
    const result = encodeUrl(line, fn, spaceMode)
    return result.success && result.output !== undefined
      ? result.output
      : `[错误] ${result.error ?? '未知错误'}`
  })
}

/**
 * 批量解码（每行一个）
 *
 * @param input 多行文本（每行一个待解码字符串）
 * @param spaceMode 空格编码方式
 * @returns 每行对应的解码结果数组；空行返回空字符串；失败行返回 [错误] 前缀信息
 */
export function batchDecode(input: string, spaceMode: SpaceMode): string[] {
  const lines = input.split(/\r?\n/)
  return lines.map((line) => {
    if (line === '') return ''
    const result = decodeUrl(line, spaceMode)
    return result.success && result.output !== undefined
      ? result.output
      : `[错误] ${result.error ?? '未知错误'}`
  })
}
