/**
 * textOps.ts - 文本工具类行/项级操作纯函数
 *
 * 覆盖：
 * - 去重分隔（dedupeItems）
 * - 反转与排序（reverseText）
 * - 行编号（addNumbering）
 * - 批量 / 正则替换（replaceText）
 * - 纯文本转 HTML（textToHtml）
 */
import { splitByDelimiter } from './textCore'

/** ============ 去重分隔 ============ */

export interface DedupeOptions {
  /** 拆分用分隔符 */
  splitDelimiter: string
  /** 拼装用分隔符（'sql' 等模板由调用方先转成实际值） */
  joinDelimiter: string
  /** 去除每项首尾空格 */
  trimItems: boolean
  /** 忽略大小写比对 */
  ignoreCase: boolean
  /** 保留首次出现顺序（关闭则配合排序） */
  keepOrder: boolean
  /** 按字典序排序 */
  sort: boolean
}

export interface DedupeResult {
  output: string
  beforeCount: number
  afterCount: number
  removedCount: number
}

export function dedupeItems(text: string, options: DedupeOptions): DedupeResult {
  const rawItems = splitByDelimiter(text, options.splitDelimiter)
  const items = options.trimItems ? rawItems.map((i) => i.trim()) : rawItems
  const beforeCount = items.filter((i) => i !== '').length

  const seen = new Set<string>()
  let kept = items.filter((i) => i !== '')
  if (options.keepOrder) {
    const ordered: string[] = []
    for (const item of kept) {
      const key = options.ignoreCase ? item.toLowerCase() : item
      if (!seen.has(key)) {
        seen.add(key)
        ordered.push(item)
      }
    }
    kept = ordered
  } else {
    // 不保留顺序时也需去重
    const ordered: string[] = []
    for (const item of kept) {
      const key = options.ignoreCase ? item.toLowerCase() : item
      if (!seen.has(key)) {
        seen.add(key)
        ordered.push(item)
      }
    }
    kept = ordered
  }
  if (options.sort) {
    kept = [...kept].sort((a, b) => a.localeCompare(b))
  }
  const output = joinItems(kept, options.joinDelimiter)
  return {
    output,
    beforeCount,
    afterCount: kept.length,
    removedCount: beforeCount - kept.length,
  }
}

/** SQL 风格拼装：'a','b','c'（joinDelimiter 为 "','" 时） */
function joinItems(items: string[], joinDelimiter: string): string {
  if (joinDelimiter === "','") {
    return items.map((i) => `'${i}'`).join(',')
  }
  return items.join(joinDelimiter)
}

/** ============ 反转与排序 ============ */

export type ReverseDimension = 'char' | 'line' | 'item'
export type ArrangeMode = 'reverse' | 'asc' | 'desc' | 'shuffle'

export interface ReverseOptions {
  dimension: ReverseDimension
  delimiter: string
  arrange: ArrangeMode
}

export interface ReverseResult {
  output: string
  count: number
  statusText: string
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

const ARRANGE_TEXT: Record<ArrangeMode, string> = {
  reverse: '已倒序',
  asc: '已升序',
  desc: '已降序',
  shuffle: '已随机打乱',
}

/** ============ 智能排序比较器 ============ */

/** 中文数字到阿拉伯数字映射（覆盖 0-10 + 百位） */
const CN_NUM_MAP: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
  五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
}

/** 解析字符串开头的中文数字（支持 0-999，如 十二 / 二十 / 二十三 / 一百 / 三百零五） */
function parseChineseNumber(str: string): number | null {
  const m = str.match(/^[零一二两三四五六七八九十百]+/)
  if (!m) return null
  const s = m[0]

  if (s.includes('百')) {
    const parts = s.split('百')
    const huns = CN_NUM_MAP[parts[0]!] ?? 1
    const rest = parts.slice(1).join('')
    let tail = 0
    if (rest) {
      if (rest === '零') tail = 0
      else {
        const tenIdx = rest.indexOf('十')
        if (tenIdx === 0) {
          // 零X / 直接读个位
          tail = CN_NUM_MAP[rest] ?? CN_NUM_MAP[rest.slice(-1)]! ?? 0
        } else if (tenIdx > 0) {
          const tens = CN_NUM_MAP[rest[0]!] ?? 0
          const ones = rest.slice(tenIdx + 1) ? (CN_NUM_MAP[rest.slice(tenIdx + 1)] ?? 0) : 0
          tail = tens * 10 + ones
        } else {
          tail = CN_NUM_MAP[rest] ?? 0
        }
      }
    }
    return huns * 100 + tail
  }

  if (s.includes('十')) {
    const tenIdx = s.indexOf('十')
    const tens = tenIdx === 0 ? 1 : (CN_NUM_MAP[s[0]!] ?? 0)
    const ones = s.slice(tenIdx + 1) ? (CN_NUM_MAP[s.slice(tenIdx + 1)] ?? 0) : 0
    return tens * 10 + ones
  }

  return CN_NUM_MAP[s] ?? null
}

/** 提取字符串开头的数字：优先阿拉伯数字，其次中文数字（支持「第」序数前缀） */
function parseLeadingNumber(str: string): number | null {
  const s = str.trimStart().replace(/^第/, '')
  const am = s.match(/^\d+/)
  if (am) return parseInt(am[0]!, 10)
  return parseChineseNumber(s)
}

/**
 * 排序比较器：
 * - 两侧都以数字开头且数值不同 → 按数字自然顺序排（第一行 < 第二行，item2 < item10）
 * - 否则回退到带 numeric 选项的中文本地化比较，避免按拼音排序中文数字时
 *   出现「二 < 三 < 四 < 一」这类反直觉结果
 */
function compareItems(a: string, b: string): number {
  const na = parseLeadingNumber(a)
  const nb = parseLeadingNumber(b)
  if (na != null && nb != null && na !== nb) return na - nb
  return a.localeCompare(b, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
}

export function reverseText(text: string, options: ReverseOptions): ReverseResult {
  const { dimension, delimiter, arrange } = options

  // 按字符：整段码点逆序；排序也按字符
  if (dimension === 'char') {
    const chars = Array.from(text)
    let out: string[]
    if (arrange === 'reverse') out = chars.reverse()
    else if (arrange === 'shuffle') out = shuffleArray(chars)
    else out = [...chars].sort((a, b) => (arrange === 'asc' ? compareItems(a, b) : compareItems(b, a)))
    return { output: out.join(''), count: chars.length, statusText: ARRANGE_TEXT[arrange] }
  }

  // 按行 / 按项目：先切分单元
  const units = dimension === 'line' ? text.split(/\r?\n/) : splitByDelimiter(text, delimiter)
  let result: string[]
  if (arrange === 'reverse') result = [...units].reverse()
  else if (arrange === 'shuffle') result = shuffleArray(units)
  else result = [...units].sort((a, b) => (arrange === 'asc' ? compareItems(a, b) : compareItems(b, a)))

  const output = dimension === 'line' ? result.join('\n') : result.join(delimiter)
  return { output, count: units.length, statusText: ARRANGE_TEXT[arrange] }
}

/** ============ 行编号 ============ */

export type NumberingFormat = 'n.' | 'n ' | 'n,' | 'n、' | '(n)' | '[n]' | 'n#' | 'n-'

export const NUMBERING_FORMATS: ReadonlyArray<{ value: NumberingFormat; label: string }> = [
  { value: 'n.', label: 'n.' },
  { value: 'n ', label: 'n 空格' },
  { value: 'n,', label: 'n,' },
  { value: 'n、', label: 'n、' },
  { value: '(n)', label: '(n)' },
  { value: '[n]', label: '[n]' },
  { value: 'n#', label: 'n#' },
  { value: 'n-', label: 'n-' },
]

export interface NumberingOptions {
  format: NumberingFormat
  start: number
  step: number
  padZero: boolean
  skipEmpty: boolean
  trailingSpace: boolean
}

export interface NumberingResult {
  output: string
  numberedCount: number
}

export function addNumbering(text: string, options: NumberingOptions): NumberingResult {
  const lines = text.split(/\r?\n/)
  // 最大序号用于补零位数
  const nonEmptyCount = lines.filter((l) => l.trim() !== '').length
  const maxNumber = options.start + Math.max(0, nonEmptyCount - 1) * options.step
  const padWidth = String(Math.abs(maxNumber)).length

  let current = options.start
  let numberedCount = 0
  const out = lines.map((line) => {
    if (options.skipEmpty && line.trim() === '') return line
    const numStr = options.padZero ? String(current).padStart(padWidth, '0') : String(current)
    let prefix = renderNumber(numStr, options.format)
    if (options.trailingSpace && !prefix.endsWith(' ')) prefix += ' '
    current += options.step
    numberedCount += 1
    return `${prefix}${line}`
  })
  return { output: out.join('\n'), numberedCount }
}

function renderNumber(num: string, format: NumberingFormat): string {
  switch (format) {
    case 'n.': return `${num}.`
    case 'n ': return `${num} `
    case 'n,': return `${num},`
    case 'n、': return `${num}、`
    case '(n)': return `(${num})`
    case '[n]': return `[${num}] `
    case 'n#': return `${num}#`
    case 'n-': return `${num}-`
    default: return `${num}.`
  }
}

/** 去除已有行号（支持 1. / 1、 / 1) / (1) 等） */
export function stripLineNumbers(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\(\d+\)|\[\d+\]|\d+[.、)）:：]\s*)/, ''))
    .join('\n')
}

/** ============ 批量 / 正则替换 ============ */

export interface ReplaceOptions {
  /** 多个查找目标（| 分隔或多规则） */
  find: string
  replace: string
  caseSensitive: boolean
  regexMode: boolean
  wholeWord: boolean
  firstOnly: boolean
}

export interface ReplaceResult {
  output: string
  totalHits: number
  /** 每条规则命中数 */
  ruleHits: Array<{ find: string; hits: number }>
  error?: string
}

export function replaceText(text: string, options: ReplaceOptions): ReplaceResult {
  const targets = options.find.split('|').map((t) => t).filter((t) => t !== '')
  if (targets.length === 0) return { output: text, totalHits: 0, ruleHits: [] }

  let output = text
  let totalHits = 0
  const ruleHits: Array<{ find: string; hits: number }> = []
  const ciFlag = options.caseSensitive ? '' : 'i'

  for (const target of targets) {
    let pattern: string
    if (options.regexMode) {
      pattern = target
    } else {
      pattern = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    // 全字匹配：用 \b 包裹（普通模式安全；正则模式仅对纯词元生效）
    if (options.wholeWord && (!options.regexMode || /^\w+$/.test(target))) {
      pattern = `\\b${pattern}\\b`
    }
    let hits = 0
    try {
      // 用全局正则统计命中总数
      const countRe = new RegExp(pattern, `g${ciFlag}`)
      hits = (output.match(countRe) || []).length
      // 仅替换首次时去掉 g 标志
      const replaceRe = new RegExp(pattern, `${options.firstOnly ? '' : 'g'}${ciFlag}`)
      output = output.replace(replaceRe, (...args) => expandReplacement(options.replace, args))
    } catch (err) {
      return {
        output: text,
        totalHits: 0,
        ruleHits: [],
        error: `正则表达式无效：${err instanceof Error ? err.message : String(err)}`,
      }
    }
    totalHits += hits
    ruleHits.push({ find: target, hits })
  }
  return { output, totalHits, ruleHits }
}

/**
 * 展开替换串中的反向引用：$& 整段匹配，$1..$n 捕获组，$$ 字面量。
 * String.replace 的替换函数里需自行处理。
 */
function expandReplacement(template: string, args: unknown[]): string {
  // args: [match, p1, p2, ..., offset, string]；捕获组数量 = args.length - 2
  const groups = args.slice(1, -2) as string[]
  const match = args[0] as string
  return template.replace(/\$(\$|&|\d+)/g, (m, token: string) => {
    if (token === '$') return '$'
    if (token === '&') return match
    const idx = Number(token)
    if (idx >= 1 && idx <= groups.length) return groups[idx - 1] ?? ''
    return m
  })
}

/** ============ 纯文本转 HTML ============ */

export type HtmlMode = 'p-br' | 'p' | 'br'

export interface ToHtmlOptions {
  mode: HtmlMode
  encodeEntities: boolean
  removeEmptyParagraphs: boolean
}

export interface ToHtmlResult {
  output: string
  paragraphCount: number
}

export function textToHtml(text: string, options: ToHtmlOptions): ToHtmlResult {
  const encode = (s: string) =>
    options.encodeEntities
      ? s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      : s

  if (options.mode === 'br') {
    const lines = text.split(/\r?\n/)
    const output = lines.map((l) => encode(l)).join('<br>\n')
    const paragraphCount = lines.filter((l) => l.trim() !== '').length
    return { output, paragraphCount }
  }

  // 按一个或多个空行分段
  let paragraphs = text.split(/\r?\n[ \t]*\r?\n+/)
  if (options.removeEmptyParagraphs) {
    paragraphs = paragraphs.filter((p) => p.trim() !== '')
  }
  const htmlParagraphs = paragraphs.map((p) => {
    const inner = encode(p).replace(/\r?\n/g, options.mode === 'p-br' ? '<br>\n' : '\n')
    return `<p>${inner.trim()}</p>`
  })
  return { output: htmlParagraphs.join('\n'), paragraphCount: htmlParagraphs.length }
}
