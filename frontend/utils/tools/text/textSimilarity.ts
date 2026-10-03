/**
 * textSimilarity.ts - 内容重复率检测纯函数
 *
 * 算法（全部本地运行，不上传）：
 * - 分词：中文按连续汉字段切二元组（bigram），英文 / 数字按单词串切分
 * - 重复率：两段词组集合交集占「对比文本」词组数的比例
 * - 最长连续重复：字符级最长公共子串（滚动数组 DP），业内以连续 13 字为疑似抄袭阈值
 * - 高亮：把原文中命中交集词组成分的字符包裹 <mark>
 */

/** 分词：返回 token 列表（中文 bigram + 英数单词） */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  if (!text) return tokens

  // 英文 / 数字单词
  const wordMatches = text.match(/[A-Za-z0-9]+/g)
  if (wordMatches) tokens.push(...wordMatches.map((w) => w.toLowerCase()))

  // 连续汉字段内切 bigram
  const hanRuns = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g) || []
  for (const run of hanRuns) {
    const chars = Array.from(run)
    if (chars.length === 1) {
      tokens.push(chars[0]!)
    } else {
      for (let i = 0; i < chars.length - 1; i++) {
        tokens.push(chars[i]! + chars[i + 1]!)
      }
    }
  }
  return tokens
}

export interface SimilarityResult {
  /** 重复率 0-100 */
  rate: number
  tokensA: number
  tokensB: number
  repeated: number
  longestCommon: number
  longestText: string
  level: 'low' | 'mid' | 'high' | 'copy'
  levelText: string
  advice: string
  /** 原文（A）高亮后的安全 HTML */
  highlightedHtml: string
  /** 对比文本（B）高亮后的安全 HTML */
  highlightedHtmlB: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 字符级最长公共子串（滚动两行 DP），返回长度与内容 */
function longestCommonSubstring(a: string, b: string): { length: number; text: string } {
  const ca = Array.from(a)
  const cb = Array.from(b)
  let prev = new Array<number>(cb.length + 1).fill(0)
  let curr = new Array<number>(cb.length + 1).fill(0)
  let best = 0
  let end = 0
  for (let i = 1; i <= ca.length; i++) {
    for (let j = 1; j <= cb.length; j++) {
      if (ca[i - 1] === cb[j - 1]) {
        curr[j] = prev[j - 1] + 1
        if (curr[j]! > best) {
          best = curr[j]!
          end = i
        }
      } else {
        curr[j] = 0
      }
    }
    ;[prev, curr] = [curr, prev]
    curr.fill(0)
  }
  return { length: best, text: ca.slice(end - best, end).join('') }
}

/**
 * 计算原文 a 相对对比文本 b 的重复率。
 */
export function computeSimilarity(a: string, b: string): SimilarityResult {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  const intersection = new Set<string>()
  for (const t of setA) if (setB.has(t)) intersection.add(t)

  const denominator = setB.size || 0
  const rate = denominator === 0 ? 0 : Math.round((intersection.size / denominator) * 100)

  const lcs = longestCommonSubstring(a, b)

  let level: SimilarityResult['level']
  let levelText: string
  let advice: string
  if (rate >= 80) {
    level = 'copy'
    levelText = '几乎雷同'
    advice = '两段文本高度重合，建议整体重写。'
  } else if (rate >= 60) {
    level = 'high'
    levelText = '高度重复'
    advice = '重复比例较高，建议重写句子结构。'
  } else if (rate >= 30) {
    level = 'mid'
    levelText = '中度重复'
    advice = '存在一定重复，建议对重复片段做同义改写。'
  } else {
    level = 'low'
    levelText = '低度重复'
    advice = '重复率较低，通常无需特别处理。'
  }

  const highlightedHtml = highlightText(a, intersection)
  const highlightedHtmlB = highlightText(b, intersection)

  return {
    rate: Math.min(100, rate),
    tokensA: setA.size,
    tokensB: setB.size,
    repeated: intersection.size,
    longestCommon: lcs.length,
    longestText: lcs.text,
    level,
    levelText,
    advice,
    highlightedHtml,
    highlightedHtmlB,
  }
}

/**
 * 用命中的 token 集合高亮原文：
 * - 中文 bigram 命中 → 标记对应字符
 * - 英数单词命中 → 标记整词
 * 相邻标记合并为一个 <mark>。
 */
function highlightText(text: string, hitTokens: Set<string>): string {
  const chars = Array.from(text)
  const marked = new Array<boolean>(chars.length).fill(false)

  // 英文 / 数字单词
  const wordRe = /[A-Za-z0-9]+/g
  let m: RegExpExecArray | null
  while ((m = wordRe.exec(text)) !== null) {
    if (hitTokens.has(m[0].toLowerCase())) {
      const start = Array.from(text.slice(0, m.index)).length
      for (let k = 0; k < Array.from(m[0]).length; k++) marked[start + k] = true
    }
  }

  // 汉字 bigram
  for (let i = 0; i < chars.length - 1; i++) {
    const bi = chars[i] + chars[i + 1]
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(chars[i]!) && hitTokens.has(bi)) {
      marked[i] = true
      marked[i + 1] = true
    }
  }

  // 构建 HTML（先逐字符转义，再合并标记）
  let html = ''
  let inMark = false
  for (let i = 0; i < chars.length; i++) {
    if (marked[i] && !inMark) {
      html += '<mark style="background:#fef08a;color:inherit;padding:0 2px;border-radius:3px">'
      inMark = true
    } else if (!marked[i] && inMark) {
      html += '</mark>'
      inMark = false
    }
    html += escapeHtml(chars[i]!).replace(/\n/g, '\n')
  }
  if (inMark) html += '</mark>'
  return html
}
