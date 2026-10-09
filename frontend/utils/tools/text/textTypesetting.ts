/**
 * textTypesetting.ts - 中英文混排自动纠正纯函数
 *
 * 规则（可独立开关，默认全开）：
 * 1. 中英文之间加空格
 * 2. 中文与数字之间加空格
 * 3. 数字与单位之间不加空格（年/月/日/岁/米/元/个/万/亿/%/℃ 等）
 * 4. 全角标点与相邻字符不加空格
 * 5. 折叠重复标点（！！！→！，。。→。）
 * 6. 中文语境下 , : ! . ? 转全角
 * 7. 英文整句保留半角（规则 6 只对紧邻中文的标点生效，自然不影响英文整句）
 * 8. 专有名词大小写修正（iPhone / GitHub / JavaScript 等）
 *
 * URL、邮箱、反引号代码片段跳过处理。
 */

export interface TypesettingOptions {
  spaceBetweenCjkLatin: boolean
  spaceBetweenCjkNumber: boolean
  noSpaceNumberUnit: boolean
  noSpaceAroundFullwidthPunct: boolean
  collapseRepeatedPunct: boolean
  useFullwidthPunct: boolean
  keepEnglishHalfwidth: boolean
  fixProperNoun: boolean
}

export const DEFAULT_TYPESETTING_OPTIONS: TypesettingOptions = {
  spaceBetweenCjkLatin: true,
  spaceBetweenCjkNumber: true,
  noSpaceNumberUnit: true,
  noSpaceAroundFullwidthPunct: true,
  collapseRepeatedPunct: true,
  useFullwidthPunct: true,
  keepEnglishHalfwidth: true,
  fixProperNoun: true,
}

export interface TypesettingResult {
  output: string
  total: number
  spaceChanges: number
  punctuationChanges: number
  caseChanges: number
}

/** 数字后紧跟的中文单位（中间不加空格） */
const CN_UNITS = new Set([
  '年', '月', '日', '号', '时', '分', '秒', '岁', '个', '只', '条', '件',
  '米', '厘', '克', '斤', '元', '块', '角', '分', '万', '亿', '倍', '度',
  '册', '页', '篇', '名', '位', '次', '遍', '场', '张', '本', '类', '种',
])

const FULLWIDTH_MAP: Record<string, string> = {
  ',': '，',
  ':': '：',
  '!': '！',
  '.': '。',
  '?': '？',
  ';': '；',
}

/** 专有名词标准写法 */
const PROPER_NOUNS = [
  'iPhone', 'iPad', 'iPod', 'iOS', 'macOS', 'GitHub', 'GitLab',
  'JavaScript', 'TypeScript', 'Python', 'MySQL', 'PostgreSQL',
  'Android', 'WiFi', 'Wi-Fi', 'Internet', 'Google', 'YouTube',
  'TypeScript', 'Node.js', 'Vue.js', 'React', 'CSS', 'HTML',
]

const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf'
const FULLWIDTH_PUNCT = '\\u3000-\\u303f\\uff00-\\uffef'

export function typesetText(text: string, options: TypesettingOptions): TypesettingResult {
  const changes = { space: 0, punct: 0, case: 0 }

  // 保护 URL / 邮箱 / 行内代码
  const protectedSegments: string[] = []
  const protect = (s: string) => {
    const token = `\u0001${protectedSegments.length}\u0001`
    protectedSegments.push(s)
    return token
  }
  let working = text
  working = working.replace(/`[^`\n]+`/g, (m) => protect(m))
  working = working.replace(/https?:\/\/[^\s，。！？；）)】」』]+/g, (m) => protect(m))
  working = working.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => protect(m))

  // 8. 专有名词大小写修正
  if (options.fixProperNoun) {
    for (const noun of PROPER_NOUNS) {
      const escaped = noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`\\b${escaped.replace(/\\-/g, '[-]?')}\\b`, 'gi')
      working = working.replace(re, (matched) => {
        if (matched !== noun) {
          changes.case += 1
          return noun
        }
        return matched
      })
    }
  }

  // 5. 折叠重复标点（全角 / 半角连续相同标点压缩为 1）
  if (options.collapseRepeatedPunct) {
    working = working.replace(/([，。！？；：、,.!?;:~…·])\1+/g, (_m, p1: string) => {
      changes.punct += 1
      return p1
    })
    // 省略号特殊处理：超过 6 个点折叠为 ……
    working = working.replace(/\.{4,}/g, () => {
      changes.punct += 1
      return '……'
    })
  }

  // 6. 中文语境半角标点转全角（标点前或标点后紧邻汉字时才转）
  if (options.useFullwidthPunct) {
    working = working.replace(
      new RegExp(`([${CJK}])([,:!?.;])|([,:!?.;])([${CJK}])`, 'g'),
      (m, pre: string, p1: string, p2: string, post: string) => {
        const punct = p1 || p2
        const full = FULLWIDTH_MAP[punct]
        if (!full) return m
        changes.punct += 1
        return p1 ? pre + full : full + post
      },
    )
  }

  // 1 & 2. 中文与拉丁字母 / 数字之间加空格
  if (options.spaceBetweenCjkLatin) {
    working = addCjkBoundarySpaces(working, `[A-Za-z]`, changes)
  }
  if (options.spaceBetweenCjkNumber) {
    working = addCjkBoundarySpaces(working, `[0-9]`, changes)
  }

  // 3. 数字与中文单位之间不加空格：移除 "数字 单位" 中多余空格
  if (options.noSpaceNumberUnit) {
    working = working.replace(
      new RegExp(`([0-9])\\s+([${CJK}])`, 'g'),
      (m, digit: string, ch: string) => {
        if (CN_UNITS.has(ch)) {
          changes.space += 1
          return digit + ch
        }
        return m
      },
    )
  }

  // 4. 全角标点与相邻字符之间不加空格
  if (options.noSpaceAroundFullwidthPunct) {
    working = working.replace(new RegExp(`\\s+([${FULLWIDTH_PUNCT}])`, 'g'), (_m, p: string) => {
      changes.space += 1
      return p
    })
    working = working.replace(new RegExp(`([${FULLWIDTH_PUNCT}])\\s+`, 'g'), (_m, p: string) => {
      changes.space += 1
      return p
    })
  }

  // 还原保护片段（\u0001 为 URL/邮箱/代码占位符）
  // eslint-disable-next-line no-control-regex
  working = working.replace(/\u0001(\d+)\u0001/g, (_m, i) => protectedSegments[Number(i)] || _m)

  return {
    output: working,
    total: changes.space + changes.punct + changes.case,
    spaceChanges: changes.space,
    punctuationChanges: changes.punct,
    caseChanges: changes.case,
  }
}

/**
 * 在汉字与给定字符类（拉丁字母或数字）之间插入一个空格。
 * 仅在原本无空格时插入，并累加空格改动数。
 */
function addCjkBoundarySpaces(text: string, tokenClass: string, changes: { space: number }): string {
  let result = text
  // 汉字在前
  result = result.replace(new RegExp(`([${CJK}])(${tokenClass})`, 'g'), (_m, han: string, tok: string) => {
    changes.space += 1
    return `${han} ${tok}`
  })
  // 汉字在后
  result = result.replace(new RegExp(`(${tokenClass})([${CJK}])`, 'g'), (_m, tok: string, han: string) => {
    changes.space += 1
    return `${tok} ${han}`
  })
  return result
}
