/**
 * textCore.ts - 文本工具类共享纯函数
 *
 * 提供 14 个文本工具通用的：
 * - 文本实时统计（字符数 / 去空白 / 单词数 / 行数 / UTF-8 字节数，码点安全）
 * - 剪贴板复制（含降级方案）
 * - 英文字母大小写转换（全大写 / 全小写 / 首字母 / 句首 / APA 标题 / 反转）
 * - 常用分隔符表
 *
 * 所有函数为纯函数（copyToClipboard 除外），可在 SSR 与 Vitest 中运行。
 */

/** 文本实时统计结果 */
export interface TextStats {
  /** 字符数（按 Unicode 码点，Emoji 计 1） */
  chars: number
  /** 去空白字符数（按码点） */
  charsNoSpace: number
  /** 单词数（连续拉丁字母/数字串） */
  words: number
  /** 行数 */
  lines: number
  /** UTF-8 字节数 */
  bytes: number
}

/** 大小写转换模式 */
export type CaseMode =
  | 'upper' // 全大写
  | 'lower' // 全小写
  | 'capitalize' // 每个单词首字母大写
  | 'sentence' // 句首大写
  | 'title' // APA 标题大小写
  | 'invert' // 大小写反转

/** 大小写模式元数据（供 UI 渲染按钮） */
export const CASE_MODES: ReadonlyArray<{ value: CaseMode; label: string }> = [
  { value: 'upper', label: '全大写 UPPER' },
  { value: 'lower', label: '全小写 lower' },
  { value: 'capitalize', label: '首字母 Capitalized' },
  { value: 'sentence', label: '句首 Sentence' },
  { value: 'title', label: '标题 Title Case' },
  { value: 'invert', label: '反转 iNVERT' },
]

/**
 * 常用分隔符表。key 为稳定标识，value 为实际分隔字符串。
 * newline 在拆分时按正则 /\r?\n/ 特殊处理。
 */
export interface DelimiterOption {
  key: string
  label: string
  value: string
}

export const SPLIT_DELIMITERS: DelimiterOption[] = [
  { key: 'newline', label: '换行 ↵', value: '\n' },
  { key: 'space', label: '空格', value: ' ' },
  { key: 'comma', label: '逗号 ,', value: ',' },
  { key: 'comma-zh', label: '逗号 ，', value: '，' },
  { key: 'slash', label: '斜杠 /', value: '/' },
  { key: 'semicolon', label: '分号 ;', value: ';' },
  { key: 'tab', label: '制表符 ⇥', value: '\t' },
]

export const JOIN_DELIMITERS: DelimiterOption[] = [
  { key: 'newline', label: '换行 ↵', value: '\n' },
  { key: 'space', label: '空格', value: ' ' },
  { key: 'comma', label: '逗号 ,', value: ',' },
  { key: 'semicolon', label: '分号 ;', value: ';' },
  { key: 'dot', label: '圆点 ●', value: '●' },
  { key: 'none', label: '无', value: '' },
  { key: 'sql', label: "'项目',", value: "','" },
]

/** 按分隔符拆分（换行兼容 \r\n） */
export function splitByDelimiter(text: string, delimiter: string): string[] {
  if (delimiter === '\n') return text.split(/\r?\n/)
  if (delimiter === '') return Array.from(text)
  return text.split(delimiter)
}

/**
 * 统计文本指标。字符按 Unicode 码点计数，避免 Emoji 被算成 2。
 */
export function analyzeText(text: string): TextStats {
  if (!text) return { chars: 0, charsNoSpace: 0, words: 0, lines: 0, bytes: 0 }
  const codePoints = Array.from(text)
  const chars = codePoints.length
  const charsNoSpace = codePoints.filter((ch) => !/\s/.test(ch)).length
  const words = (text.match(/[A-Za-z0-9]+/g) || []).length
  const lines = text.split(/\r?\n/).length
  let bytes = text.length
  if (typeof TextEncoder !== 'undefined') {
    bytes = new TextEncoder().encode(text).length
  }
  return { chars, charsNoSpace, words, lines, bytes }
}

/**
 * 复制文本到剪贴板，navigator.clipboard 不可用时降级到 execCommand。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (import.meta.server) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续降级
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

/** APA Title Case 中保持小写的虚词（首尾单词永远大写） */
const TITLE_SMALL_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'as', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'via',
  'is', 'am', 'are', 'was', 'were', 'be',
])

function toTitleCaseWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * 大小写转换。只作用于拉丁字母，中文、数字、标点原样保留。
 * @param text 输入文本
 * @param mode 转换模式
 * @param glossary 自定义专有名词词库（按写法锁定，如 iPhone、GitHub）
 */
export function convertCase(
  text: string,
  mode: CaseMode,
  glossary: string[] = [],
): string {
  if (!text) return ''
  const glossaryLower = new Map<string, string>()
  for (const word of glossary) {
    const w = word.trim()
    if (w) glossaryLower.set(w.toLowerCase(), w)
  }
  // 先按词匹配专有名词，用占位符保护
  const protectedTokens: string[] = []
  let working = text
  if (glossaryLower.size > 0) {
    const escaped = [...glossaryLower.keys()]
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')
    if (escaped) {
      working = text.replace(new RegExp(`(${escaped})`, 'gi'), (m) => {
        const token = `\u0000${protectedTokens.length}\u0000`
        protectedTokens.push(glossaryLower.get(m.toLowerCase()) || m)
        return token
      })
    }
  }

  let result: string
  switch (mode) {
    case 'upper':
      result = working.toUpperCase()
      break
    case 'lower':
      result = working.toLowerCase()
      break
    case 'capitalize':
      // 单词边界（空格/换行/标点）后的首字母提升（\u0000 为专有名词占位符）
      // eslint-disable-next-line no-control-regex
      result = working.toLowerCase().replace(/(^|[\s"'([{])((?:\u0000\d+\u0000)?[a-z])/g,
        (_m, pre, ch) => pre + ch.toUpperCase())
      // 兜底：行首字母
      result = result.replace(/(^|\n)([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase())
      break
    case 'sentence':
      result = working
        .toLowerCase()
        .replace(/(^|[.!?。！？\n]\s*)([a-z])/g, (_m, p1, ch) => p1 + ch.toUpperCase())
      // 首字符
      result = result.replace(/^[a-z]/, (ch) => ch.toUpperCase())
      break
    case 'title': {
      // 以空白与连字符分词，记录原始分隔符
      const tokens = working.split(/(\s+)/)
      result = tokens
        .map((token, idx) => {
          if (/^\s+$/.test(token) || token === '') return token
          const isFirst = idx === 0
          const isLast = idx === tokens.length - 1
          const core = token.toLowerCase()
          if (!isFirst && !isLast && TITLE_SMALL_WORDS.has(core)) {
            return core
          }
          return toTitleCaseWord(token)
        })
        .join('')
      break
    }
    case 'invert':
      result = Array.from(working)
        .map((ch) => {
          if (ch >= 'a' && ch <= 'z') return ch.toUpperCase()
          if (ch >= 'A' && ch <= 'Z') return ch.toLowerCase()
          return ch
        })
        .join('')
      break
    default:
      result = working
  }

  // 还原专有名词占位符
  if (protectedTokens.length > 0) {
    // eslint-disable-next-line no-control-regex
    result = result.replace(/\u0000(\d+)\u0000/g, (_m, i) => protectedTokens[Number(i)] || _m)
  }
  return result
}

/** 判断字符是否为汉字（CJK 统一表意文字） */
export function isHan(ch: string): boolean {
  const code = ch.codePointAt(0) || 0
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  )
}
