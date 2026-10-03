/**
 * fancyText.ts - 花体英文转换纯函数
 *
 * 把英文字母与数字映射到 Unicode 数学字母数字符号区（U+1D400–U+1D7FF）
 * 及带圈、全角、音标扩展等区段，生成多种花体样式。
 * 中文、空格、标点无对应码位，原样保留。
 */

interface MathStyle {
  capBase?: number
  lowBase?: number
  digitBase?: number
  capOverrides?: Record<string, number>
  lowOverrides?: Record<string, number>
  digitOverrides?: Record<string, number>
}

const A = 'A'.charCodeAt(0)
const Z = 'Z'.charCodeAt(0)
const a = 'a'.charCodeAt(0)
const z = 'z'.charCodeAt(0)
const ZERO = '0'.charCodeAt(0)

function mathMapper(style: MathStyle): (ch: string) => string {
  return (ch: string) => {
    const code = ch.charCodeAt(0)
    if (code >= A && code <= Z) {
      const letter = ch
      if (style.capOverrides?.[letter] !== undefined) {
        return String.fromCodePoint(style.capOverrides[letter]!)
      }
      if (style.capBase !== undefined) {
        return String.fromCodePoint(style.capBase + (code - A))
      }
    }
    if (code >= a && code <= z) {
      const letter = ch
      if (style.lowOverrides?.[letter] !== undefined) {
        return String.fromCodePoint(style.lowOverrides[letter]!)
      }
      if (style.lowBase !== undefined) {
        return String.fromCodePoint(style.lowBase + (code - a))
      }
    }
    if (code >= ZERO && code <= ZERO + 9) {
      const d = ch
      if (style.digitOverrides?.[d] !== undefined) {
        return String.fromCodePoint(style.digitOverrides![d]!)
      }
      if (style.digitBase !== undefined) {
        return String.fromCodePoint(style.digitBase + (code - ZERO))
      }
    }
    return ch
  }
}

/** 带圈字母：大写 U+24B6 起，小写 U+24D0 起；数字 ⓪①…⑨ */
const enclosedMapper = mathMapper({
  capBase: 0x24b6,
  lowBase: 0x24d0,
  digitOverrides: {
    0: 0x24ea, 1: 0x2460, 2: 0x2461, 3: 0x2462, 4: 0x2463,
    5: 0x2464, 6: 0x2465, 7: 0x2466, 8: 0x2467, 9: 0x2468,
  },
})

/** 反白圆圈：仅大写 A-Z（U+1F150 起），大小写统一映射，数字不支持 */
const negativeMapper = mathMapper({
  capBase: 0x1f150,
  lowBase: 0x1f150,
})

/** 小型大写（音标扩展等散点码位，缺 J/Q/X/Z 时保留原字符） */
const SMALL_CAPS: Record<string, number> = {
  a: 0x1d00, b: 0x0299, c: 0x1d04, d: 0x1d05, e: 0x1d07,
  f: 0x1d06, g: 0x0262, h: 0x029c, i: 0x026a, j: 0x1d0a,
  k: 0x1d0b, l: 0x029f, m: 0x1d0d, n: 0x0274, o: 0x1d0f,
  p: 0x1d18, r: 0x0280, s: 0xa731, t: 0x1d1b, u: 0x1d1c,
  v: 0x1d20, w: 0x1d21, y: 0x028f,
}
function smallCapsMapper(ch: string): string {
  const lower = ch.toLowerCase()
  if (SMALL_CAPS[lower] !== undefined) return String.fromCodePoint(SMALL_CAPS[lower]!)
  return ch
}

/** 倒置体映射 */
const UPSIDE_DOWN: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ',
  i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd',
  q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x',
  y: 'ʎ', z: 'z',
  A: '∀', B: 'q', C: 'Ɔ', D: 'p', E: 'Ǝ', F: 'Ⅎ', G: 'ƃ', H: 'H',
  I: 'I', J: 'ɾ', K: 'ʞ', L: '˥', M: 'W', N: 'N', O: 'O', P: 'd',
  Q: 'b', R: 'ᴚ', S: 'S', T: '⊥', U: '∩', V: 'Λ', W: 'M', X: 'X',
  Y: '⅄', Z: 'Z',
  0: '0', 1: 'Ɩ', 2: 'ᄅ', 3: 'ɛ', 4: 'ㄣ', 5: 'ϛ',
  6: '9', 7: 'ㄥ', 8: '8', 9: '6',
}
function upsideDownMapper(ch: string): string {
  return UPSIDE_DOWN[ch] ?? ch
}

export interface FancyStyle {
  key: string
  name: string
  transform: (text: string) => string
}

function buildMapper(style: MathStyle): (text: string) => string {
  const map = mathMapper(style)
  return (text) => Array.from(text).map(map).join('')
}

export const FANCY_STYLES: FancyStyle[] = [
  { key: 'doublestruck', name: '双线体', transform: buildMapper({
    capBase: 0x1d538, lowBase: 0x1d552, digitBase: 0x1d7d8,
    capOverrides: { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 },
  }) },
  { key: 'script', name: '手写体', transform: buildMapper({
    capBase: 0x1d49c, lowBase: 0x1d4b6,
    capOverrides: { B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b },
  }) },
  { key: 'boldscript', name: '粗手写体', transform: buildMapper({ capBase: 0x1d4d0, lowBase: 0x1d4ea }) },
  { key: 'boldserif', name: '粗衬线', transform: buildMapper({ capBase: 0x1d400, lowBase: 0x1d41a, digitBase: 0x1d7ce }) },
  { key: 'italic', name: '斜体', transform: buildMapper({
    capBase: 0x1d434, lowBase: 0x1d44e,
    capOverrides: { H: 0x210e }, lowOverrides: { h: 0x210f },
  }) },
  { key: 'bolditalic', name: '粗斜体', transform: buildMapper({ capBase: 0x1d468, lowBase: 0x1d482 }) },
  { key: 'monospace', name: '等宽体', transform: buildMapper({ capBase: 0x1d670, lowBase: 0x1d68a, digitBase: 0x1d7f6 }) },
  { key: 'fraktur', name: '哥特体', transform: buildMapper({
    capBase: 0x1d504, lowBase: 0x1d51e,
    capOverrides: { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 },
  }) },
  { key: 'boldfraktur', name: '粗哥特体', transform: buildMapper({ capBase: 0x1d56c, lowBase: 0x1d586 }) },
  { key: 'enclosed', name: '圆圈字', transform: (t) => Array.from(t).map(enclosedMapper).join('') },
  { key: 'negative', name: '反白圆圈', transform: (t) => Array.from(t).map(negativeMapper).join('') },
  { key: 'smallcaps', name: '小型大写', transform: (t) => Array.from(t).map(smallCapsMapper).join('') },
  { key: 'upsidedown', name: '倒置体', transform: (t) => Array.from(t).map(upsideDownMapper).join('') },
  { key: 'fullwidth', name: '全角体', transform: buildMapper({ capBase: 0xff21, lowBase: 0xff41, digitBase: 0xff10 }) },
]
