/**
 * unicode.ts - Unicode 转义与中文互转纯函数
 *
 * 严格移植自 panziui/tools/unicode-convert.html 内联 script 的核心转换逻辑，
 * 并在解码侧扩展支持三种常见转义格式：
 * - decodeUnicode（Unicode → 中文）：识别并还原
 *   1. \uXXXX       —— 经典 4 位转义（Java/JSON/JS 字面量）
 *   2. \u{XXXX}     —— ES6 扩展转义（可表示增补平面字符，如 emoji）
 *   3. &#xXXXX;     —— HTML 十六进制字符实体
 *   混合文本中的非转义部分原样保留。
 * - encodeUnicode（中文 → Unicode）：可打印 ASCII（0x20-0x7E）原样保留，
 *   其余字符转为 \uXXXX；增补平面字符使用代理对（与 JS 字面量一致）。
 *
 * 所有函数无副作用，可在 SSR 与测试环境中运行。
 */

/** 编码/解码操作结果 */
export interface UnicodeResult {
  success: boolean
  output?: string
  error?: string
}

/**
 * 匹配三种 Unicode 转义格式（\uXXXX、\u{...}、&#x...;）
 *
 * 注意：\u{...} 分支必须排在 \uXXXX 之前，避免 \u 后紧跟 { 时被误判。
 */
const UNICODE_ESCAPE_RE =
  /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|&#x([0-9a-fA-F]+);/g

/**
 * 将 Unicode 转义序列还原为中文（Unicode → 中文）
 *
 * 支持 \uXXXX、\u{XXXX}、&#xXXXX; 三种格式，混合文本中的非转义部分原样保留。
 *
 * @param input 包含转义序列的文本
 * @returns 成功返回 { success: true, output }，失败返回 { success: false, error }
 */
export function decodeUnicode(input: string): UnicodeResult {
  if (input === '') return { success: true, output: '' }

  try {
    let matched = false
    const out = input.replace(UNICODE_ESCAPE_RE, (_m, braced, quad, entity) => {
      matched = true
      const hex = braced ?? quad ?? entity
      const code = parseInt(hex, 16)
      // fromCodePoint 支持增补平面，也可正确处理 BMP 内字符
      return String.fromCodePoint(code)
    })

    if (!matched) {
      return {
        success: false,
        error: '未检测到 Unicode 转义序列，请检查输入内容（转义形如 \\u76d8、\\u{1f600}、&#x76d8;）',
      }
    }

    return { success: true, output: out }
  } catch (err) {
    return {
      success: false,
      error: `转换失败：${err instanceof Error ? err.message : '未知错误'}`,
    }
  }
}

/**
 * 将中文等非 ASCII 字符转为 Unicode 转义（中文 → Unicode）
 *
 * 可打印 ASCII（0x20-0x7E）原样保留；BMP 内字符转为 \uXXXX；
 * 增补平面字符（码点 > 0xFFFF）使用代理对（两个 \uXXXX）。
 *
 * @param input 原始文本
 * @returns 成功返回 { success: true, output }，失败返回 { success: false, error }
 */
export function encodeUnicode(input: string): UnicodeResult {
  if (input === '') return { success: true, output: '' }

  try {
    let out = ''
    for (const ch of input) {
      const code = ch.codePointAt(0) ?? 0
      if (code >= 0x20 && code <= 0x7e) {
        // 可打印 ASCII 保留原样
        out += ch
      } else if (code <= 0xffff) {
        out += '\\u' + code.toString(16).padStart(4, '0')
      } else {
        // 增补平面：使用代理对
        const cp = code - 0x10000
        const hi = 0xd800 + (cp >> 10)
        const lo = 0xdc00 + (cp & 0x3ff)
        out +=
          '\\u' +
          hi.toString(16).padStart(4, '0') +
          '\\u' +
          lo.toString(16).padStart(4, '0')
      }
    }
    return { success: true, output: out }
  } catch (err) {
    return {
      success: false,
      error: `转换失败：${err instanceof Error ? err.message : '未知错误'}`,
    }
  }
}
