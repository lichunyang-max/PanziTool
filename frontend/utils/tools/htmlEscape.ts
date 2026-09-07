/**
 * htmlEscape.ts - HTML 实体转义/反转义纯函数
 *
 * 提供三档转义模式，覆盖前端开发常见场景：
 * - basic：仅转义 < > &（适用于 HTML 文本节点内容）
 * - attributes：basic + " ' `（适用于 HTML 属性值上下文）
 * - entities：attributes + /（最严格，适用于内联 JS 模板字符串）
 *
 * unescapeHtml 同时支持命名实体（&amp; &lt; &gt; &quot; &apos; &nbsp;）
 * 与数字实体（&#39; &#x27;），无法识别的实体原样保留。
 *
 * 所有函数为纯函数，可在 SSR 与 Vitest 中独立运行。
 */

/** 转义模式 */
export type EscapeMode = 'basic' | 'attributes' | 'entities'

/** 操作结果 */
export interface EscapeResult {
  success: boolean
  output?: string
  error?: string
}

/** 各模式对应的实体映射表（顺序很重要：& 必须先替换） */
const BASIC_ENTITIES: ReadonlyArray<readonly [string, string]> = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
]

const ATTRIBUTE_ENTITIES: ReadonlyArray<readonly [string, string]> = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
  ['`', '&#96;'],
]

const ENTITIES_FULL: ReadonlyArray<readonly [string, string]> = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
  ['`', '&#96;'],
  ['/', '&#47;'],
]

/** 命名实体 → 字符映射（反转义用） */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
}

/**
 * 将单个码点转为字符串，越界或代理对错误时返回空字符串
 */
function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
    return ''
  }
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

/**
 * HTML 转义。
 *
 * @param input 原始字符串
 * @param mode  转义模式（默认 basic）
 */
export function escapeHtml(input: string, mode: EscapeMode = 'basic'): string {
  if (input === '') return ''
  let table: ReadonlyArray<readonly [string, string]>
  switch (mode) {
    case 'basic':
      table = BASIC_ENTITIES
      break
    case 'attributes':
      table = ATTRIBUTE_ENTITIES
      break
    case 'entities':
      table = ENTITIES_FULL
      break
    default:
      table = BASIC_ENTITIES
  }
  let result = input
  for (const [char, entity] of table) {
    // 已转义的 & 不二次转义：先保护已存在的实体
    if (char === '&') {
      result = result.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    } else {
      result = result.split(char).join(entity)
    }
  }
  return result
}

/**
 * HTML 反转义。
 *
 * 支持命名实体与数字实体（十进制 &#39; / 十六进制 &#x27;）。
 * 无法识别的实体原样保留。
 */
export function unescapeHtml(input: string): string {
  if (input === '') return ''
  return input
    .replace(/&#(\d+);/g, (_m, dec: string) =>
      safeFromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      safeFromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name: string) => {
      return name in NAMED_ENTITIES ? NAMED_ENTITIES[name]! : match
    })
}

/** 安全转义包装，捕获异常返回 EscapeResult */
export function escapeHtmlSafe(
  input: string,
  mode: EscapeMode = 'basic',
): EscapeResult {
  try {
    return { success: true, output: escapeHtml(input, mode) }
  } catch (err) {
    return {
      success: false,
      error: `转义失败：${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/** 安全反转义包装 */
export function unescapeHtmlSafe(input: string): EscapeResult {
  try {
    return { success: true, output: unescapeHtml(input) }
  } catch (err) {
    return {
      success: false,
      error: `反转义失败：${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/** HTML 属性上下文转义（basic + 引号 + 反引号） */
export function escapeHtmlAttr(input: string): string {
  return escapeHtml(input, 'attributes')
}

/** 全实体转义（含 /，最严格） */
export function escapeAll(input: string): string {
  return escapeHtml(input, 'entities')
}

/**
 * 校验字符串是否包含 HTML 标签。
 *
 * 用于 UI 提示用户是否需要转义。
 */
export function containsHtml(input: string): boolean {
  return /<[a-zA-Z!/][^>]*>/.test(input)
}
