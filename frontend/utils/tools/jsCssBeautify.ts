/**
 * jsCssBeautify.ts - JS/CSS 美化与压缩纯函数
 *
 * 提供两套能力：
 * - 美化（Beautify）：基于 js-beautify 还原压缩代码为带缩进的可读格式
 * - 压缩（Minify）：基于"逐字符扫描并跟踪字符串/正则/注释状态"的安全方案，
 *   去除注释与多余空白，不做变量重命名
 *
 * 所有函数为纯函数，无 DOM 依赖，可在 SSR 与测试环境运行。
 * 忠实移植自 panziui/tools/js-css-beautify.html 内联脚本。
 */
import { js as jsBeautify, css as cssBeautify } from 'js-beautify'

/** 代码语言 */
export type BcLang = 'js' | 'css'

/** 操作类型 */
export type BcOp = 'beautify' | 'minify'

/** 操作结果 */
export interface BcResult {
  success: boolean
  output?: string
  error?: string
}

/** 示例代码（供"示例"按钮填充） */
export const BC_EXAMPLES: Record<BcLang, string> = {
  js: 'function hello(n){console.log("Hello, "+n+"!");return n*2}var arr=[1,2,3].map(function(x){return x*2});hello("world");',
  css: '.container{display:flex;justify-content:center;align-items:center}.btn{color:#4f46e5;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px}.btn:hover{background:#eef2ff}',
}

/**
 * 美化代码（带缩进）。
 *
 * @param input  原始代码
 * @param lang   js / css
 * @param indent 缩进空格数（默认 2）
 * @returns 美化后的代码
 */
export function beautifyCode(
  input: string,
  lang: BcLang,
  indent = 2,
): string {
  const size = indent || 2
  if (lang === 'js') {
    return jsBeautify(input, {
      indent_size: size,
      space_in_empty_paren: false,
    })
  }
  return cssBeautify(input, { indent_size: size })
}

/**
 * 判断前一个字符是否允许其后出现正则字面量。
 * 用于压缩时区分除号 `/` 与正则起始 `/`。
 */
function bcRegexAllowed(prev: string): boolean {
  if (!prev) return true
  return /[=(:,[!&|?;{}+\-*%<>~^]/.test(prev)
}

/**
 * 安全压缩 JavaScript：逐字符扫描，跟踪字符串/模板字符串/正则字面量/注释状态，
 * 去除注释并合并多余空白。
 *
 * @param code 原始 JS 代码
 * @returns 压缩后的 JS 代码
 */
export function minifyJs(code: string): string {
  let out = ''
  let i = 0
  const n = code.length
  let prevNonSpace = ''
  while (i < n) {
    const c = code[i]
    const next = code[i + 1]
    // 行注释
    if (c === '/' && next === '/') {
      while (i < n && code[i] !== '\n') i++
      continue
    }
    // 块注释
    if (c === '/' && next === '*') {
      i += 2
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      continue
    }
    // 字符串（含模板字符串）
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      out += c
      i++
      while (i < n) {
        if (code[i] === '\\') {
          out += code[i] + (code[i + 1] || '')
          i += 2
          continue
        }
        out += code[i]
        if (code[i] === quote) {
          i++
          break
        }
        i++
      }
      prevNonSpace = quote
      continue
    }
    // 正则字面量（粗略判断：前面是 = ( , : [ ! & | ? ; { } 等之后）
    if (c === '/' && bcRegexAllowed(prevNonSpace)) {
      out += c
      i++
      let inClass = false
      while (i < n) {
        if (code[i] === '\\') {
          out += code[i] + (code[i + 1] || '')
          i += 2
          continue
        }
        if (code[i] === '[') inClass = true
        else if (code[i] === ']') inClass = false
        out += code[i]
        if (code[i] === '\n') break // 非法正则，按普通斜杠处理
        if (code[i] === '/' && !inClass) {
          i++
          break
        }
        i++
      }
      prevNonSpace = '/'
      continue
    }
    // 空白压缩：换行与多空格压缩为一个空格，必要时省略
    if (/\s/.test(c)) {
      let j = i
      while (j < n && /\s/.test(code[j])) j++
      const nextCh = code[j] || ''
      const prev = prevNonSpace
      // 如果前后都是"标识符/数字的一部分"，必须保留一个空格
      const ident = /[A-Za-z0-9_$\u4e00-\u9fa5]/
      if (ident.test(prev) && ident.test(nextCh)) out += ' '
      // 否则省略（如 ) { 、= + 等符号之间）
      i = j
      continue
    }
    out += c
    prevNonSpace = c
    i++
  }
  return out.trim()
}

/**
 * 安全压缩 CSS：去注释、去换行、合并空白、清理符号两侧空格、省略末尾分号。
 *
 * @param css 原始 CSS 代码
 * @returns 压缩后的 CSS 代码
 */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // 去注释
    .replace(/\r?\n/g, '') // 去换行
    .replace(/\s+/g, ' ') // 多空格合一
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*,\s*/g, ',')
    .replace(/;}/g, '}') // 最后一个分号可省
    .trim()
}

/**
 * 处理代码（美化或压缩，主入口）。
 *
 * @param input  原始代码
 * @param lang   js / css
 * @param op     beautify / minify
 * @param indent 美化时的缩进空格数（默认 2）
 * @returns 成功返回 { success: true, output }，失败返回中文错误
 */
export function processCode(
  input: string,
  lang: BcLang,
  op: BcOp,
  indent = 2,
): BcResult {
  if (input === '' || input.trim() === '') {
    return { success: true, output: '' }
  }

  try {
    const result =
      op === 'beautify'
        ? beautifyCode(input, lang, indent)
        : lang === 'js'
          ? minifyJs(input)
          : minifyCss(input)
    return { success: true, output: result }
  } catch (err) {
    return {
      success: false,
      error: `处理失败：${err instanceof Error ? err.message : '未知错误'}`,
    }
  }
}
