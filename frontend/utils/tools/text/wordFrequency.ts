/**
 * wordFrequency.ts - 词频统计纯函数
 *
 * - 中文：优先使用浏览器原生 Intl.Segmenter（ICU 词典分词，现代浏览器 / Node 18+ 均支持），
 *   能正确切出「习近平总书记」「红红火火」「中国共产党」等词典词；
 *   环境不支持时回退到内置常用词典正向最大匹配
 * - 英文 / 数字：由 Segmenter 直接给出词级 token（回退路径按字母串切词并小写化）
 * - 中英文合并统计排序，输出词频、占比
 * - 可过滤英文介词（停用词）、中文单字、纯数字、标点
 */

/** 英文停用词（介词 / 冠词 / 连词 / 高频功能词） */
const EN_STOPWORDS = new Set<string>([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'his', 'her', 'its', 'our', 'their', 'not', 'no', 'yes', 'if', 'then', 'so',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'should', 'may', 'might', 'must', 'shall', 'about', 'into', 'over', 'under',
])

export interface FrequencyFilters {
  filterEnglishStopwords: boolean
  filterChineseSingle: boolean
  filterNumbers: boolean
  filterPunctuation: boolean
}

export interface FrequencyItem {
  word: string
  count: number
  percent: number
}

export interface FrequencyResult {
  items: FrequencyItem[]
  total: number
  unique: number
}

/* ---------- Intl.Segmenter（ICU 词典分词） ---------- */

/** Segment 结果的最小结构（避免依赖 TS lib 的 ES2022 Intl 类型） */
interface SegmentItem {
  segment: string
  isWordLike?: boolean
}

type SegmenterLike = { segment(text: string): Iterable<SegmentItem> }

/** 懒加载缓存：undefined=未探测，null=环境不支持 */
let cachedSegmenter: SegmenterLike | null | undefined

function getSegmenter(): SegmenterLike | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter
  try {
    const ctor = (Intl as unknown as {
      Segmenter?: new (locale: string, options: { granularity: 'word' }) => SegmenterLike
    }).Segmenter
    cachedSegmenter = typeof ctor === 'function' ? new ctor('zh-Hans', { granularity: 'word' }) : null
  } catch {
    cachedSegmenter = null
  }
  return cachedSegmenter
}

/** 回退词典：正向最大匹配用（仅在不支持 Intl.Segmenter 的环境使用） */
const ZH_DICT = new Set<string>([
  '我们', '你们', '他们', '她们', '自己', '大家', '什么', '怎么', '为什么', '可以',
  '没有', '一个', '一些', '这个', '那个', '这些', '那些', '这样', '那样', '这里',
  '那里', '因为', '所以', '但是', '如果', '虽然', '然后', '现在', '已经', '正在',
  '时候', '时间', '问题', '方法', '工作', '生活', '世界', '中国', '国家', '社会',
  '公司', '企业', '产品', '市场', '经济', '发展', '技术', '数据', '系统', '功能',
  '用户', '客户', '服务', '管理', '设计', '开发', '程序', '工具', '平台', '应用',
  '手机', '电脑', '网络', '信息', '内容', '文章', '视频', '图片', '音乐', '游戏',
  '今天', '明天', '昨天', '早上', '晚上', '中午', '上午', '下午', '今年', '去年',
  '知道', '觉得', '感觉', '希望', '喜欢', '需要', '应该', '可能', '或者', '以及',
  '还是', '不是', '就是', '不过', '而且', '并且', '通过', '对于', '关于', '根据',
  '进行', '使用', '提供', '支持', '实现', '开始', '出来', '起来', '下来', '过去',
  '中文', '英文', '单词', '统计', '分词', '词频', '关键词', '密度', '文本', '语言',
  '开发者', '效率', '体验', '优化', '提升', '阅读', '写作', '标点', '数字', '结果',
])

/** 回退分词：正向最大匹配，未登录词按 2 字粒度切分 */
function segmentChineseFallback(run: string): string[] {
  const chars = Array.from(run)
  const words: string[] = []
  let i = 0
  const maxLen = 4
  while (i < chars.length) {
    let matched = ''
    for (let len = Math.min(maxLen, chars.length - i); len >= 2; len--) {
      const candidate = chars.slice(i, i + len).join('')
      if (ZH_DICT.has(candidate)) {
        matched = candidate
        break
      }
    }
    if (matched) {
      words.push(matched)
      i += Array.from(matched).length
    } else {
      // 未登录：按 2 字粒度，末尾剩 1 字取 1
      const step = i + 2 <= chars.length ? 2 : 1
      words.push(chars.slice(i, i + step).join(''))
      i += step
    }
  }
  return words
}

/**
 * 补充词典：ICU 词典可能切碎的人名 / 机构 / 地名 / 成语 / 新词。
 * 命中后整词优先（最长匹配），避免出现「电/商」「红红/火火」这类碎词。
 */
const ZH_EXTRA = new Set<string>([
  // 人名 / 机构
  '习近平', '中国共产党',
  // 地名（行政区划常见组合示例）
  '河南省', '淅川县', '九重镇', '邹庄村',
  // 成语 / AABB 状态词
  '红红火火', '轰轰烈烈', '勤勤恳恳', '认认真真', '踏踏实实', '仔仔细细',
  '马马虎虎', '平平安安', '健健康康', '快快乐乐', '高高兴兴', '开开心心',
  '风风火火', '忙忙碌碌', '团团圆圆', '世世代代', '千千万万', '家家户户',
  '大大小小', '来来往往', '说说笑笑', '山山水水', '花花草草', '生生不息',
  '欣欣向荣', '蒸蒸日上', '心心相印', '全心全意', '一心一意', '自由自在',
  // 常见动词 / 新词（ICU 易切碎）
  '种田', '务工', '电商', '直播', '守好', '写就', '征程',
  '短视频', '自媒体', '互联网', '人工智能', '机器学习', '大数据', '云计算',
])

/** 在原文上按「最长匹配」找出补充词典命中的区间的（UTF-16 码元偏移） */
function findExtraSpans(text: string): Array<{ start: number; end: number; word: string }> {
  const spans: Array<{ start: number; end: number; word: string }> = []
  const hanRe = /[\u4e00-\u9fff\u3400-\u4dbf]/
  const maxLen = 8
  let i = 0
  while (i < text.length) {
    if (!hanRe.test(text[i]!)) {
      i++
      continue
    }
    let matched = ''
    for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
      const cand = text.slice(i, i + len)
      if (ZH_EXTRA.has(cand)) {
        matched = cand
        break
      }
    }
    if (matched) {
      spans.push({ start: i, end: i + matched.length, word: matched })
      i += matched.length
    } else {
      i++
    }
  }
  return spans
}

/**
 * 主分词：返回词级 token 列表（标点 / 空白已被剔除）。
 * 1) Intl.Segmenter（ICU 词典分词）；
 * 2) 补充词典命中的专名 / 成语整词覆盖对应区间；
 * 3) 不可用时回退「英数正则 + 中文正向最大匹配」。
 */
function segmentWords(text: string): string[] {
  const seg = getSegmenter()
  if (seg) {
    const spans = findExtraSpans(text)
    const tokens: Array<{ start: number; word: string }> = []
    for (const item of seg.segment(text)) {
      // isWordLike=false 为标点 / 空白 / 符号，直接跳过
      if (item.isWordLike === false) continue
      if (!item.segment || !/\S/.test(item.segment)) continue
      const start = item.index ?? 0
      const end = start + item.segment.length
      // 与补充词典区间重叠的部分由补充词代替，避免碎词
      if (spans.some((sp) => start < sp.end && end > sp.start)) continue
      tokens.push({ start, word: item.segment })
    }
    for (const sp of spans) tokens.push({ start: sp.start, word: sp.word })
    tokens.sort((a, b) => a.start - b.start)
    return tokens.map((t) => t.word)
  }

  const out: string[] = []
  const wordMatches = text.match(/[A-Za-z0-9]+/g) || []
  out.push(...wordMatches.map((w) => w.toLowerCase()))
  const hanRuns = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g) || []
  for (const run of hanRuns) out.push(...segmentChineseFallback(run))
  return out
}

/** 含字母或数字的 token 才算词；纯符号 / 标点返回 false */
function isWordToken(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token)
}

const HAN_CHAR_RE = /^[\u4e00-\u9fff\u3400-\u4dbf]$/

export function computeWordFrequency(
  text: string,
  filters: FrequencyFilters,
): FrequencyResult {
  const counter = new Map<string, number>()

  const push = (token: string) => {
    if (!token) return
    counter.set(token, (counter.get(token) || 0) + 1)
  }

  for (const raw of segmentWords(text)) {
    const token = raw.trim()
    if (!token) continue

    // 标点 / 符号（仅在不过滤时统计）
    if (!isWordToken(token)) {
      if (!filters.filterPunctuation) push(token)
      continue
    }

    // 英文小写化（不含中文的纯字母数字 token）
    const word = /[a-z]/i.test(token) && !/[\u4e00-\u9fff\u3400-\u4dbf]/.test(token)
      ? token.toLowerCase()
      : token

    if (/^\d+$/.test(word)) {
      if (filters.filterNumbers) continue
      push(word)
      continue
    }

    if (
      filters.filterEnglishStopwords &&
      /^[a-z]+$/.test(word) &&
      EN_STOPWORDS.has(word)
    ) {
      continue
    }

    if (filters.filterChineseSingle && HAN_CHAR_RE.test(word)) continue

    push(word)
  }

  const total = [...counter.values()].reduce((sum, c) => sum + c, 0)
  const items: FrequencyItem[] = [...counter.entries()]
    .map(([word, count]) => ({
      word,
      count,
      percent: total === 0 ? 0 : (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))

  return { items, total, unique: items.length }
}
