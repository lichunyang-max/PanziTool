/**
 * json.ts - JSON 格式化纯函数
 *
 * 提供 JSON 格式化、压缩、校验能力：
 * - formatJson：美化 JSON（支持 2/4 空格缩进）
 * - compressJson：压缩 JSON（无多余空格）
 * - validateJson：校验 JSON 合法性，返回错误位置（行列）
 *
 * 所有函数为纯函数，无副作用，便于单元测试。
 * 错误位置提取兼容多种 V8 错误格式：
 * - Node 22+ "Expected ... at position N (line X column Y)"
 * - Node 22+ "Unexpected token 'X', ..." （无位置，best-effort 定位 token）
 * - 旧版 V8 "at position N"（无 line/column，需手动换算）
 */

/** 格式化 / 压缩操作结果 */
export interface FormatResult {
  success: boolean
  output?: string
  error?: string
}

/** 校验结果（含错误位置） */
export interface ValidationResult {
  valid: boolean
  error?: string
  line?: number
  column?: number
}

/**
 * 将字符偏移转换为 1-indexed 行列号
 *
 * @param input 原始输入字符串
 * @param offset 字符偏移（0-indexed）
 */
function offsetToLineColumn(
  input: string,
  offset: number,
): { line: number; column: number } {
  let line = 1
  let column = 1
  const max = Math.min(offset, input.length)
  for (let i = 0; i < max; i++) {
    if (input[i] === '\n') {
      line++
      column = 1
    } else {
      column++
    }
  }
  return { line, column }
}

/**
 * 从 JSON.parse 错误信息中提取行列位置
 *
 * 兼容三种 V8 错误格式：
 * 1. Node 22+: "...at position N (line X column Y)" — 直接提取
 * 2. 旧版 V8: "...at position N" — 由偏移换算行列
 * 3. Node 22+: "Unexpected token 'X', ..." — best-effort 定位 token 首次出现位置
 *
 * @param message 错误信息
 * @param input 原始输入字符串（用于换算 / token 定位）
 */
function extractErrorPosition(
  message: string,
  input: string,
): { line: number; column: number } | null {
  // 格式 1：直接包含 "line X column Y"
  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
  if (lineColMatch) {
    return {
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
    }
  }

  // 格式 2：仅包含 "position N"（旧版 V8）
  const posMatch = message.match(/position\s+(\d+)/i)
  if (posMatch) {
    return offsetToLineColumn(input, parseInt(posMatch[1], 10))
  }

  // 格式 3："Unexpected token 'X'" — best-effort 定位 token 首次出现位置
  const tokenMatch = message.match(/Unexpected token '(.+?)'/i)
  if (tokenMatch) {
    const token = tokenMatch[1]
    const idx = input.indexOf(token)
    if (idx >= 0) {
      return offsetToLineColumn(input, idx)
    }
  }

  return null
}

/**
 * 格式化 JSON 字符串（美化输出）
 *
 * @param input 输入 JSON 字符串
 * @param indent 缩进空格数（2 或 4），默认 2；非 4 时回退为 2
 * @returns 格式化结果，失败时返回 error 信息
 */
export function formatJson(input: string, indent: number = 2): FormatResult {
  if (!input || !input.trim()) {
    return { success: false, error: '输入为空' }
  }

  try {
    const parsed = JSON.parse(input)
    const safeIndent = indent === 4 ? 4 : 2
    const output = JSON.stringify(parsed, null, safeIndent)
    return { success: true, output }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}

/**
 * 压缩 JSON 字符串（移除所有多余空格，单行输出）
 *
 * @param input 输入 JSON 字符串
 * @returns 压缩结果，失败时返回 error 信息
 */
export function compressJson(input: string): FormatResult {
  if (!input || !input.trim()) {
    return { success: false, error: '输入为空' }
  }

  try {
    const parsed = JSON.parse(input)
    const output = JSON.stringify(parsed)
    return { success: true, output }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}

/**
 * 校验 JSON 字符串合法性
 *
 * @param input 输入 JSON 字符串
 * @returns 校验结果，失败时包含错误信息与行列位置（若可提取）
 */
export function validateJson(input: string): ValidationResult {
  if (!input || !input.trim()) {
    return { valid: false, error: '输入为空' }
  }

  try {
    JSON.parse(input)
    return { valid: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const position = extractErrorPosition(message, input)
    if (position) {
      return {
        valid: false,
        error: message,
        line: position.line,
        column: position.column,
      }
    }
    return { valid: false, error: message }
  }
}
