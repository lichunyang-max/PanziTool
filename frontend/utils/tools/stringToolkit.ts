/**
 * stringToolkit.ts - 字符串工具箱纯函数
 *
 * 提供开发中常用的字符串变换与分析能力，分为四类：
 * 1. 大小写变换：UPPER / lower / Title Case / Sentence case
 * 2. 命名风格转换：camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE
 * 3. 行级处理：sortAsc / sortDesc / dedupe / removeEmpty / trimLines / addLineNumbers
 * 4. 其他：reverse / trim
 *
 * analyzeString 提供字符数 / 字数 / 行数 / 字节数统计，便于写作与代码度量。
 *
 * 所有函数为纯函数，可在 SSR 与 Vitest 中独立运行。
 */

/** 字符串操作类型 */
export type StringOperation =
  | 'upper' // 全大写
  | 'lower' // 全小写
  | 'title' // 每个单词首字母大写
  | 'sentence' // 每个句子首字母大写
  | 'camel' // camelCase
  | 'pascal' // PascalCase
  | 'snake' // snake_case
  | 'kebab' // kebab-case
  | 'constant' // CONSTANT_CASE
  | 'reverse' // 反转字符顺序
  | 'trim' // 去除首尾空白
  | 'trimLines' // 去除每行首尾空白
  | 'sortAsc' // 行升序
  | 'sortDesc' // 行降序
  | 'dedupe' // 行去重（保留首次出现顺序）
  | 'removeEmpty' // 移除空白行
  | 'addLineNumbers' // 添加行号

/** 操作结果 */
export interface StringResult {
  success: boolean
  output?: string
  error?: string
}

/** 字符串分析结果 */
export interface StringAnalysis {
  /** 字符数（含空白） */
  chars: number
  /** 字符数（不含空白） */
  charsNoSpace: number
  /** 单词数 */
  words: number
  /** 行数 */
  lines: number
  /** UTF-8 字节数 */
  bytes: number
}

/** 操作选项元数据，供 UI 渲染分组与按钮文案 */
export interface StringOperationMeta {
  value: StringOperation
  label: string
  group: 'case' | 'naming' | 'lines' | 'other'
}

/** 所有可选操作列表（用于 UI 渲染） */
export const STRING_OPERATIONS: ReadonlyArray<StringOperationMeta> = [
  { value: 'upper', label: '全大写', group: 'case' },
  { value: 'lower', label: '全小写', group: 'case' },
  { value: 'title', label: '首字母大写', group: 'case' },
  { value: 'sentence', label: '句首大写', group: 'case' },
  { value: 'camel', label: 'camelCase', group: 'naming' },
  { value: 'pascal', label: 'PascalCase', group: 'naming' },
  { value: 'snake', label: 'snake_case', group: 'naming' },
  { value: 'kebab', label: 'kebab-case', group: 'naming' },
  { value: 'constant', label: 'CONSTANT_CASE', group: 'naming' },
  { value: 'sortAsc', label: '行升序', group: 'lines' },
  { value: 'sortDesc', label: '行降序', group: 'lines' },
  { value: 'dedupe', label: '行去重', group: 'lines' },
  { value: 'removeEmpty', label: '移除空行', group: 'lines' },
  { value: 'trimLines', label: '行首尾去空', group: 'lines' },
  { value: 'addLineNumbers', label: '加行号', group: 'lines' },
  { value: 'reverse', label: '反转字符', group: 'other' },
  { value: 'trim', label: '去首尾空白', group: 'other' },
]

/**
 * 将文本切分为单词数组。
 *
 * 处理：camelCase 拆分、snake_case / kebab-case 拆分、按空白分词。
 * 使用 ASCII 字符类做单词边界识别，对中文不拆分。
 */
function splitWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 0)
}

/** 将单词首字母大写，其余小写 */
function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/** 中文兼容的安全 reverse：使用 spread 迭代码点，避免乱码 */
function reverseByCodePoint(text: string): string {
  const chars = Array.from(text)
  return chars.reverse().join('')
}

/** 比较两个字符串，支持自然排序（数字部分按数值比较） */
function naturalCompare(a: string, b: string, desc: boolean): number {
  const ax: number[] = []
  const bx: number[] = []
  // 提取数字与非数字段
  const pattern = /(\d+)|(\D+)/g
  let am: RegExpExecArray | null
  let bm: RegExpExecArray | null
  pattern.lastIndex = 0
  while ((am = pattern.exec(a)) !== null) ax.push(am[1] ? +am[1] : am[2].charCodeAt(0))
  pattern.lastIndex = 0
  while ((bm = pattern.exec(b)) !== null) bx.push(bm[1] ? +bm[1] : bm[2].charCodeAt(0))
  const len = Math.min(ax.length, bx.length)
  for (let i = 0; i < len; i++) {
    const av = ax[i]!
    const bv = bx[i]!
    if (typeof av === 'number' && typeof bv === 'number') {
      if (av !== bv) return desc ? bv - av : av - bv
    } else {
      const as = String(av)
      const bs = String(bv)
      if (as !== bs) return desc ? bs.localeCompare(as) : as.localeCompare(bs)
    }
  }
  const diff = ax.length - bx.length
  return desc ? -diff : diff
}

/**
 * 对文本执行指定操作。
 *
 * @param text 原始文本
 * @param op   操作类型
 */
export function applyStringOperation(
  text: string,
  op: StringOperation,
): StringResult {
  if (text === '') return { success: true, output: '' }

  try {
    let output = ''
    switch (op) {
      case 'upper':
        output = text.toUpperCase()
        break
      case 'lower':
        output = text.toLowerCase()
        break
      case 'title':
        // 每个单词首字母大写，其余小写
        output = text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
        break
      case 'sentence':
        // 句首大写：句点/问号/叹号/换行后的第一个字母大写，其余小写
        output = text
          .toLowerCase()
          .replace(
            /(^|[.!?。！？\n]\s+)([a-z])/g,
            (_m, p1, p2) => p1 + p2.toUpperCase(),
          )
        break
      case 'camel': {
        const words = splitWords(text)
        output = words
          .map((w, i) => (i === 0 ? w.toLowerCase() : capitalizeWord(w)))
          .join('')
        break
      }
      case 'pascal':
        output = splitWords(text).map(capitalizeWord).join('')
        break
      case 'snake':
        output = splitWords(text)
          .map((w) => w.toLowerCase())
          .join('_')
        break
      case 'kebab':
        output = splitWords(text)
          .map((w) => w.toLowerCase())
          .join('-')
        break
      case 'constant':
        output = splitWords(text)
          .map((w) => w.toUpperCase())
          .join('_')
        break
      case 'reverse':
        output = reverseByCodePoint(text)
        break
      case 'trim':
        output = text.trim()
        break
      case 'trimLines':
        output = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .join('\n')
        break
      case 'sortAsc':
        output = text
          .split(/\r?\n/)
          .sort((a, b) => naturalCompare(a, b, false))
          .join('\n')
        break
      case 'sortDesc':
        output = text
          .split(/\r?\n/)
          .sort((a, b) => naturalCompare(a, b, true))
          .join('\n')
        break
      case 'dedupe': {
        const seen = new Set<string>()
        const kept: string[] = []
        for (const line of text.split(/\r?\n/)) {
          if (!seen.has(line)) {
            seen.add(line)
            kept.push(line)
          }
        }
        output = kept.join('\n')
        break
      }
      case 'removeEmpty':
        output = text
          .split(/\r?\n/)
          .filter((line) => line.trim() !== '')
          .join('\n')
        break
      case 'addLineNumbers':
        output = text
          .split(/\r?\n/)
          .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
          .join('\n')
        break
      default:
        return { success: false, error: `未知操作：${op}` }
    }
    return { success: true, output }
  } catch (err) {
    return {
      success: false,
      error: `操作失败：${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * 统计文本的字符数、字数、行数、字节数。
 *
 * 字节数使用 UTF-8 编码计算；SSR 环境无 TextEncoder 时退化为字符数。
 */
export function analyzeString(text: string): StringAnalysis {
  if (text === '') {
    return { chars: 0, charsNoSpace: 0, words: 0, lines: 0, bytes: 0 }
  }
  let bytes = text.length
  if (typeof TextEncoder !== 'undefined') {
    bytes = new TextEncoder().encode(text).length
  }
  return {
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, '').length,
    words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length,
    lines: text.split(/\r?\n/).length,
    bytes,
  }
}
