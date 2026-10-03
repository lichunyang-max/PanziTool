/**
 * wordCount.ts - 字数统计纯函数
 *
 * 指标口径（与 Word / 公众号基本一致）：
 * - 总字数：一个汉字算 1；连续拉丁字母串算 1；连续数字串算 1；连续符号算 1
 * - 字符数：按 Unicode 码点计（Emoji 算 1，非 JS length 的 UTF-16 单元）
 * - UTF-8 字节 / GBK 字节：ASCII 1 字节，汉字与中文标点 UTF-8 3 字节、GBK 2 字节
 * - 汉字数 / 汉字符号 / 外文字母 / 外文单词 / 外文符号 / 数字
 * - 行数 / 段落数 / 阅读时长（300 字/分钟）
 */
import { isHan } from './textCore'

export interface WordCountResult {
  total: number
  chars: number
  bytesUtf8: number
  bytesGbk: number
  hanChars: number
  hanPunctuation: number
  latinLetters: number
  latinWords: number
  latinPunctuation: number
  numberRuns: number
  lines: number
  paragraphs: number
  readingMinutes: number
  readingText: string
}

/** 中文 / 全角标点判定 */
function isHanPunctuation(code: number): boolean {
  return (
    (code >= 0x3000 && code <= 0x303f) || // CJK 符号和标点
    (code >= 0xff00 && code <= 0xffef) || // 全角 ASCII / 半角全角形式
    code === 0x2014 || code === 0x2015 || // — ―
    code === 0x2026 || // …
    code === 0x00b7 || // ·
    code === 0x2018 || code === 0x2019 || // ‘ ’
    code === 0x201c || code === 0x201d // “ ”
  )
}

/** 估算 GBK 编码字节数：ASCII 1，其余按 GBK 双字节计（生僻字/Emoji 为近似值） */
export function gbkBytes(text: string): number {
  let bytes = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) || 0
    bytes += code < 0x80 ? 1 : 2
  }
  return bytes
}

export function countText(text: string): WordCountResult {
  if (!text) {
    return {
      total: 0, chars: 0, bytesUtf8: 0, bytesGbk: 0,
      hanChars: 0, hanPunctuation: 0, latinLetters: 0, latinWords: 0,
      latinPunctuation: 0, numberRuns: 0, lines: 0, paragraphs: 0,
      readingMinutes: 0, readingText: '0 分钟',
    }
  }

  const codePoints = Array.from(text)
  let hanChars = 0
  let hanPunctuation = 0
  let latinLetters = 0
  let latinPunctuation = 0

  for (const ch of codePoints) {
    const code = ch.codePointAt(0) || 0
    if (isHan(ch)) {
      hanChars += 1
    } else if (isHanPunctuation(code)) {
      hanPunctuation += 1
    } else if (code >= 0x41 && code <= 0x5a) {
      latinLetters += 1
    } else if (code >= 0x61 && code <= 0x7a) {
      latinLetters += 1
    } else if (!/\s/.test(ch) && code < 0x4e00) {
      // 非空白、非 CJK 的其余字符视为外文符号
      if (code < 0x80 || (code >= 0x2000 && code <= 0x206f)) latinPunctuation += 1
    }
  }

  const latinWords = (text.match(/[A-Za-z]+/g) || []).length
  const numberRuns = (text.match(/\d+/g) || []).length

  // 总字数：汉字 + 拉丁单词 + 连续数字 + 连续符号（中文标点与外文标点各自计）
  // 连续符号串：把标点/符号类字符按连续段计数
  const symbolRuns = (text.match(/[\sA-Za-z0-9\u4e00-\u9fff\u3400-\u4dbf]+/g) || [])
  // 用“非字母数字汉字空白”的连续段作为符号串
  const punctRuns = (text.match(/(?:[^\sA-Za-z0-9\u4e00-\u9fff\u3400-\u4dbf])+/g) || []).length
  const total = hanChars + latinWords + numberRuns + punctRuns
  void symbolRuns

  const lines = text.split(/\r?\n/).length
  const paragraphs = text.split(/\r?\n[ \t]*\r?\n+/).filter((p) => p.trim() !== '').length || (text.trim() ? 1 : 0)

  const bytesUtf8 = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length
  const bytesGbk = gbkBytes(text)

  const readingMinutes = total / 300
  let readingText: string
  if (total === 0 || readingMinutes < 1) {
    readingText = total === 0 ? '0 分钟' : '<1 分钟'
  } else {
    readingText = `约 ${Math.max(1, Math.round(readingMinutes))} 分钟`
  }

  return {
    total,
    chars: codePoints.length,
    bytesUtf8,
    bytesGbk,
    hanChars,
    hanPunctuation,
    latinLetters,
    latinWords,
    latinPunctuation,
    numberRuns,
    lines,
    paragraphs,
    readingMinutes,
    readingText,
  }
}
