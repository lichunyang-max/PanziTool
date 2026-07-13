/**
 * regex.ts - 正则表达式测试工具纯函数
 *
 * - executeRegex: 执行正则匹配，返回所有匹配及分组信息
 * - highlightMatches: 将匹配片段用 <mark> 标签包裹，返回 HTML 字符串
 *
 * ReDoS 防护：
 * - try-catch 包裹 RegExp 构造与执行，捕获语法/运行时错误
 * - 限制最大匹配数（MAX_MATCHES）防止灾难性回溯导致页面卡死
 * - 处理零长度匹配避免死循环
 */

export interface RegexMatch {
  /** 完整匹配文本 */
  fullMatch: string
  /** 捕获分组列表（未匹配的可选分组为空字符串） */
  groups: string[]
  /** 匹配序号（0-based） */
  index: number
  /** 匹配起始字符位置 */
  start: number
  /** 匹配结束字符位置（不含） */
  end: number
}

export interface RegexResult {
  success: boolean
  matches: RegexMatch[]
  error?: string
}

/** 最大匹配数量上限，防止 ReDoS 与性能退化 */
const MAX_MATCHES = 10000

/**
 * 过滤并去重 flags，仅保留合法正则标志字符（g/i/m/s/u/y）
 */
function sanitizeFlags(flags: string): string {
  const seen = new Set<string>()
  const valid = 'gimsuy'
  let result = ''
  for (const ch of flags) {
    if (valid.includes(ch) && !seen.has(ch)) {
      seen.add(ch)
      result += ch
    }
  }
  return result
}

/**
 * HTML 特殊字符转义，防止 XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 执行正则匹配
 *
 * @param pattern - 正则表达式字符串（如 `\b\w+\b`）
 * @param flags   - 标志字符串（如 `gi`），支持 g/i/m/s/u
 * @param testText - 待匹配文本
 * @returns RegexResult，含所有匹配及分组信息
 */
export function executeRegex(
  pattern: string,
  flags: string,
  testText: string,
): RegexResult {
  const sanitizedFlags = sanitizeFlags(flags)

  // 构造 RegExp，捕获语法错误
  let regex: RegExp
  try {
    regex = new RegExp(pattern, sanitizedFlags)
  } catch (e) {
    return {
      success: false,
      matches: [],
      error: e instanceof Error ? e.message : '无效的正则表达式',
    }
  }

  const matches: RegexMatch[] = []

  try {
    if (regex.global) {
      // 全局模式：遍历所有匹配
      let match: RegExpExecArray | null
      let count = 0

      while ((match = regex.exec(testText)) !== null) {
        matches.push({
          fullMatch: match[0],
          groups: match.slice(1).map((g) => g ?? ''),
          index: count,
          start: match.index,
          end: match.index + match[0].length,
        })

        count++
        if (count >= MAX_MATCHES) break

        // 零长度匹配防护：手动推进 lastIndex 避免死循环
        if (match[0] === '') {
          regex.lastIndex++
        }
      }
    } else {
      // 非全局模式：仅取第一个匹配
      const match = regex.exec(testText)
      if (match) {
        matches.push({
          fullMatch: match[0],
          groups: match.slice(1).map((g) => g ?? ''),
          index: 0,
          start: match.index,
          end: match.index + match[0].length,
        })
      }
    }
  } catch (e) {
    return {
      success: false,
      matches: [],
      error: e instanceof Error ? e.message : '正则执行出错',
    }
  }

  return {
    success: true,
    matches,
  }
}

/**
 * 高亮命中片段：将匹配部分用 <mark> 标签包裹
 *
 * - 非匹配文本与匹配文本均经过 HTML 转义，防止 XSS
 * - 自动跳过重叠匹配与零长度匹配
 * - matches 按起始位置排序后处理
 *
 * @param text    - 原始文本
 * @param matches - 匹配结果列表
 * @returns HTML 字符串，命中片段用 <mark class="pz-match-highlight"> 包裹
 */
export function highlightMatches(text: string, matches: RegexMatch[]): string {
  if (matches.length === 0) return escapeHtml(text)

  // 按起始位置排序，避免乱序拼接
  const sorted = [...matches].sort((a, b) => a.start - b.start)

  let html = ''
  let lastEnd = 0

  for (const match of sorted) {
    // 跳过与前一匹配重叠的匹配
    if (match.start < lastEnd) continue
    // 跳过零长度匹配
    if (match.fullMatch === '') continue

    // 拼接匹配前的普通文本
    html += escapeHtml(text.slice(lastEnd, match.start))
    // 拼接高亮匹配片段
    html += `<mark class="pz-match-highlight">${escapeHtml(match.fullMatch)}</mark>`
    lastEnd = match.end
  }

  // 拼接末尾剩余文本
  html += escapeHtml(text.slice(lastEnd))

  return html
}
