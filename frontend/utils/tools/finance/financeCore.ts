/**
 * financeCore.ts - 财务工具核心计算函数
 *
 * 包含 12 个财务工具的纯计算逻辑，浏览器本地运行，不上传服务器。
 */

// ============================================================
// 通用工具
// ============================================================

/** 四舍五入到指定小数位 */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** 千分位格式化 */
export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** 解析输入的数字（支持千分位、逗号、空字符串） */
export function parseNumber(input: string | number): number {
  if (typeof input === 'number') return input
  if (!input) return 0
  const cleaned = String(input).replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

// ============================================================
// 01. 人民币大写转换
// ============================================================

const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNITS_INT = ['', '拾', '佰', '仟']
const CN_UNITS_BIG = ['', '万', '亿', '万亿']

/**
 * 数字转人民币大写
 * @param amount 金额（支持负数、小数）
 * @param useYuan 是否使用「元」（true）或「圆」（false）
 */
export function numberToRmbUppercase(amount: number, useYuan = true): string {
  if (isNaN(amount)) return '无效金额'
  if (amount === 0) return `人民币零${useYuan ? '元' : '圆'}整`

  const negative = amount < 0
  const absAmount = Math.abs(amount)
  const intPart = Math.floor(absAmount)
  const decPart = Math.round((absAmount - intPart) * 100)

  let result = ''

  // 整数部分
  if (intPart > 0) {
    result += convertIntToCn(intPart) + (useYuan ? '元' : '圆')
  }

  // 小数部分
  const jiao = Math.floor(decPart / 10)
  const fen = decPart % 10

  if (jiao === 0 && fen === 0) {
    result += '整'
  } else {
    if (intPart === 0) {
      result += ''
    } else if (jiao === 0) {
      result += '零'
    }
    if (jiao > 0) {
      result += CN_DIGITS[jiao] + '角'
    }
    if (fen > 0) {
      result += CN_DIGITS[fen] + '分'
    }
  }

  return (negative ? '负' : '') + '人民币' + result
}

function convertIntToCn(num: number): string {
  if (num === 0) return ''
  const groups: number[] = []
  let n = num
  while (n > 0) {
    groups.push(n % 10000)
    n = Math.floor(n / 10000)
  }

  let result = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    if (group === 0) {
      if (result && !result.endsWith('零')) result += '零'
      continue
    }
    const groupStr = convertGroupToCn(group)
    result += groupStr + CN_UNITS_BIG[i]
    // 低位组不足 4 位（千位缺位）时需补零连接，如 110242 → 壹拾壹万零贰佰肆拾贰
    if (i > 0 && groups[i - 1] > 0 && groups[i - 1] < 1000) result += '零'
  }
  // 去除末尾多余的零
  result = result.replace(/零+$/, '')
  return result
}

function convertGroupToCn(group: number): string {
  const digits = [
    Math.floor(group / 1000) % 10,
    Math.floor(group / 100) % 10,
    Math.floor(group / 10) % 10,
    group % 10,
  ]
  let result = ''
  let zeroFlag = false
  for (let i = 0; i < 4; i++) {
    const d = digits[i]
    if (d === 0) {
      zeroFlag = true
    } else {
      // 组内中间缺位才补零，组首缺位不产生前导零（如 11 → 壹拾壹 而非 零壹拾壹）
      if (zeroFlag && result) {
        result += '零'
      }
      zeroFlag = false
      result += CN_DIGITS[d] + CN_UNITS_INT[3 - i]
    }
  }
  return result
}

/**
 * 人民币大写转数字（反向解析）
 */
export function rmbUppercaseToNumber(uppercase: string): number {
  if (!uppercase) return 0
  let s = uppercase.replace(/人民币/g, '').replace(/负/g, '').replace(/整/g, '').trim()
  const negative = uppercase.includes('负')

  const digitMap: Record<string, number> = {
    零: 0, 壹: 1, 贰: 2, 叁: 3, 肆: 4, 伍: 5, 陆: 6, 柒: 7, 捌: 8, 玖: 9,
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  }
  const unitMap: Record<string, number> = {
    拾: 10, 佰: 100, 仟: 1000, 万: 10000, 亿: 100000000,
  }

  // 分离整数和小数部分
  let intStr = s
  let decStr = ''
  const yuanIdx = s.search(/[元圆]/)
  if (yuanIdx >= 0) {
    intStr = s.substring(0, yuanIdx)
    decStr = s.substring(yuanIdx + 1)
  } else if (/[角分]/.test(s)) {
    // 无「元」的纯角分写法（如 伍角、零叁角），避免被误当作整数解析
    intStr = ''
    decStr = s
  }

  let total = 0

  // 解析整数部分
  if (intStr) {
    total = parseCnNumber(intStr, digitMap, unitMap)
  }

  // 解析小数部分（角、分）
  if (decStr) {
    let dec = 0
    const jiaoMatch = decStr.match(/([零壹贰叁肆伍陆柒捌玖一二三四五六七八九])角/)
    const fenMatch = decStr.match(/([零壹贰叁肆伍陆柒捌玖一二三四五六七八九])分/)
    if (jiaoMatch) dec += (digitMap[jiaoMatch[1]] || 0) * 0.1
    if (fenMatch) dec += (digitMap[fenMatch[1]] || 0) * 0.01
    total += dec
  }

  return negative ? -round(total, 2) : round(total, 2)
}

function parseCnNumber(s: string, digitMap: Record<string, number>, unitMap: Record<string, number>): number {
  // 依次按亿、万切段，各段独立解析后乘以对应倍率
  let result = 0
  let rest = s

  const yiIdx = rest.indexOf('亿')
  if (yiIdx >= 0) {
    const yiPart = parseSmallCn(rest.substring(0, yiIdx), digitMap, unitMap)
    result += yiPart * 100000000
    rest = rest.substring(yiIdx + 1)
  }

  const wanIdx = rest.indexOf('万')
  if (wanIdx >= 0) {
    const wanPart = parseSmallCn(rest.substring(0, wanIdx), digitMap, unitMap)
    result += wanPart * 10000
    rest = rest.substring(wanIdx + 1)
  }

  if (rest) result += parseSmallCn(rest, digitMap, unitMap)

  return result
}

function parseSmallCn(s: string, digitMap: Record<string, number>, unitMap: Record<string, number>): number {
  let total = 0
  let current = 0
  for (const ch of s) {
    if (digitMap[ch] !== undefined) {
      current = digitMap[ch]
    } else if (unitMap[ch] !== undefined) {
      if (current === 0) current = 1
      total += current * unitMap[ch]
      current = 0
    }
  }
  if (current > 0) total += current
  return total
}

// ============================================================
// 02. 支票日期大写
// ============================================================

/**
 * 日期转支票大写
 */
export function dateToCheckUppercase(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const yearStr = String(year)
    .split('')
    .map((d) => CN_DIGITS[parseInt(d)])
    .join('')

  let monthStr = ''
  if (month === 1) monthStr = '零壹'
  else if (month === 2) monthStr = '零贰'
  else if (month === 10) monthStr = '零壹拾'
  else if (month === 11) monthStr = '壹拾壹'
  else if (month === 12) monthStr = '壹拾贰'
  else monthStr = CN_DIGITS[month] // 3-9 月，可加零也可不加

  let dayStr = ''
  if (day >= 1 && day <= 9) dayStr = '零' + CN_DIGITS[day]
  else if (day === 10) dayStr = '零壹拾'
  else if (day === 20) dayStr = '零贰拾'
  else if (day === 30) dayStr = '零叁拾'
  else if (day >= 11 && day <= 19) dayStr = '壹拾' + CN_DIGITS[day - 10]
  else if (day >= 21 && day <= 29) dayStr = '贰拾' + CN_DIGITS[day - 20]
  else if (day === 31) dayStr = '叁拾壹'

  return `${yearStr}年${monthStr}月${dayStr}日`
}

// ============================================================
// 03. 英文金额大写
// ============================================================

const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
const SCALES = ['', 'THOUSAND', 'MILLION', 'BILLION', 'TRILLION']

interface CurrencyInfo {
  code: string
  name: string
  fullName: string
  centName: string
  hasCent: boolean
}

const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', name: 'US DOLLARS', fullName: 'US DOLLARS', centName: 'CENT', hasCent: true },
  EUR: { code: 'EUR', name: 'EURO', fullName: 'EUROS', centName: 'CENT', hasCent: true },
  GBP: { code: 'GBP', name: 'POUNDS STERLING', fullName: 'POUNDS STERLING', centName: 'PENNY', hasCent: true },
  CNY: { code: 'CNY', name: 'CHINESE YUAN', fullName: 'CHINESE YUAN', centName: 'FEN', hasCent: true },
  HKD: { code: 'HKD', name: 'HONG KONG DOLLARS', fullName: 'HONG KONG DOLLARS', centName: 'CENT', hasCent: true },
  JPY: { code: 'JPY', name: 'JAPANESE YEN', fullName: 'JAPANESE YEN', centName: '', hasCent: false },
}

function numberToEnglishWords(num: number): string {
  if (num === 0) return 'ZERO'
  if (num < 0) return 'NEGATIVE ' + numberToEnglishWords(-num)

  let words = ''
  let scaleIdx = 0

  while (num > 0) {
    const chunk = num % 1000
    if (chunk > 0) {
      const chunkWords = threeDigitToWords(chunk)
      words = chunkWords + (SCALES[scaleIdx] ? ' ' + SCALES[scaleIdx] : '') + (words ? ' ' + words : '')
    }
    num = Math.floor(num / 1000)
    scaleIdx++
  }
  return words
}

function threeDigitToWords(n: number): string {
  let words = ''
  const hundreds = Math.floor(n / 100)
  const remainder = n % 100

  if (hundreds > 0) {
    words += ONES[hundreds] + ' HUNDRED'
    if (remainder > 0) words += ' '
  }
  if (remainder > 0) {
    if (remainder < 20) {
      words += ONES[remainder]
    } else {
      const tens = Math.floor(remainder / 10)
      const ones = remainder % 10
      words += TENS[tens]
      if (ones > 0) words += '-' + ONES[ones]
    }
  }
  return words
}

/**
 * 数字转英文金额大写
 */
export function numberToEnglishAmount(amount: number, currencyCode = 'USD', useHyphen = true): { code: string; full: string } {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const intPart = Math.floor(Math.abs(amount))
  const decPart = Math.round((Math.abs(amount) - intPart) * 100)

  let intWords = numberToEnglishWords(intPart)
  if (!useHyphen) intWords = intWords.replace(/-/g, ' ')

  let centsPart = ''
  if (currency.hasCent && decPart > 0) {
    const centUnit = decPart === 1 ? currency.centName : currency.centName + 'S'
    centsPart = ` AND CENTS ${numberToEnglishWords(decPart)}`
    if (!useHyphen) centsPart = centsPart.replace(/-/g, ' ')
  }

  const codeFormat = `SAY ${currency.code} ${intWords}${centsPart} ONLY`
  const fullFormat = `SAY ${currency.fullName} ${intWords}${centsPart} ONLY`

  return { code: codeFormat, full: fullFormat }
}

// ============================================================
// 04. 税金税率计算器
// ============================================================

export type TaxDirection = 'toTaxed' | 'fromTaxed' | 'findRate' | 'fromTax'

export interface TaxInput {
  direction: TaxDirection
  amount: number       // 未含税金额 (toTaxed / fromTax / findRate 时为未含税)
  taxedAmount: number  // 含税金额 (fromTaxed / findRate 时使用)
  tax: number          // 税额 (fromTax 时使用)
  rate: number         // 税率 %
  exemption: number    // 免税额
}

export interface TaxResult {
  untaxed: number
  taxed: number
  taxAmount: number
  rate: number
  taxBurden: number // 实际税负占比
  untaxedCn: string
  taxedCn: string
  taxCn: string
}

export function calculateTax(input: TaxInput): TaxResult {
  const { direction, amount, taxedAmount, tax, rate, exemption } = input
  let untaxed = 0, taxed = 0, taxAmount = 0, effectiveRate = rate

  const r = rate / 100

  switch (direction) {
    case 'toTaxed':
      untaxed = amount
      taxAmount = round((untaxed - exemption) * r, 2)
      taxed = round(untaxed + taxAmount, 2)
      break
    case 'fromTaxed':
      taxed = taxedAmount
      untaxed = round(taxed / (1 + r), 2)
      taxAmount = round(taxed - untaxed, 2)
      break
    case 'findRate':
      untaxed = amount
      taxed = taxedAmount
      effectiveRate = round((taxed / untaxed - 1) * 100, 2)
      taxAmount = round(taxed - untaxed, 2)
      break
    case 'fromTax':
      taxAmount = tax
      untaxed = round(taxAmount / r + exemption, 2)
      taxed = round(untaxed + taxAmount, 2)
      break
  }

  const taxBurden = taxed > 0 ? round((taxAmount / taxed) * 100, 2) : 0

  return {
    untaxed,
    taxed,
    taxAmount,
    rate: effectiveRate,
    taxBurden,
    untaxedCn: numberToRmbUppercase(untaxed),
    taxedCn: numberToRmbUppercase(taxed),
    taxCn: numberToRmbUppercase(taxAmount),
  }
}

// ============================================================
// 05. 个人所得税计算器
// ============================================================

interface TaxBracket {
  limit: number
  rate: number
  deduction: number
}

const INCOME_TAX_BRACKETS: TaxBracket[] = [
  { limit: 36000, rate: 0.03, deduction: 0 },
  { limit: 144000, rate: 0.10, deduction: 2520 },
  { limit: 300000, rate: 0.20, deduction: 16920 },
  { limit: 420000, rate: 0.25, deduction: 31920 },
  { limit: 660000, rate: 0.30, deduction: 52920 },
  { limit: 960000, rate: 0.35, deduction: 85920 },
  { limit: Infinity, rate: 0.45, deduction: 181920 },
]

export interface IncomeTaxInput {
  months: number          // 纳税期数
  totalSalary: number     // 累计税前工资
  totalInsurance: number  // 累计五险一金
  totalDeduction: number  // 累计专项附加扣除
  prepaidTax: number      // 累计已预缴税额
}

export interface IncomeTaxResult {
  taxableIncome: number
  rate: number
  deduction: number
  totalTax: number
  monthlyTax: number
  netSalary: number
  monthlySalary: number
  insurance: number
  deduction: number
  basicDeduction: number
}

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const { months, totalSalary, totalInsurance, totalDeduction, prepaidTax } = input
  const basicDeduction = 5000 * months

  const taxableIncome = Math.max(0, totalSalary - totalInsurance - totalDeduction - basicDeduction)

  let bracket = INCOME_TAX_BRACKETS[0]
  for (const b of INCOME_TAX_BRACKETS) {
    if (taxableIncome <= b.limit) {
      bracket = b
      break
    }
    bracket = b
  }

  const totalTax = round(Math.max(0, taxableIncome * bracket.rate - bracket.deduction), 2)
  const monthlyTax = round(Math.max(0, totalTax - prepaidTax), 2)
  const monthlySalary = round(totalSalary / months, 2)
  const insurance = round(totalInsurance / months, 2)
  const netSalary = round(monthlySalary - insurance - monthlyTax, 2)

  return {
    taxableIncome: round(taxableIncome, 2),
    rate: bracket.rate * 100,
    deduction: bracket.deduction,
    totalTax,
    monthlyTax,
    netSalary,
    monthlySalary,
    insurance,
    deduction: round(totalDeduction / months, 2),
    basicDeduction,
  }
}

// ============================================================
// 06. 劳务报酬所得税
// ============================================================

const LABOR_TAX_BRACKETS = [
  { limit: 20000, rate: 0.20, deduction: 0 },
  { limit: 50000, rate: 0.30, deduction: 2000 },
  { limit: Infinity, rate: 0.40, deduction: 7000 },
]

export function calculateLaborTax(grossAmount: number): {
  taxableIncome: number
  rate: number
  deduction: number
  tax: number
  net: number
} {
  // 劳务报酬：每次收入不超过4000元的，减除费用800元；4000元以上的，减除20%的费用
  const deduction = grossAmount <= 4000 ? 800 : grossAmount * 0.2
  const taxableIncome = Math.max(0, grossAmount - deduction)

  let bracket = LABOR_TAX_BRACKETS[0]
  for (const b of LABOR_TAX_BRACKETS) {
    if (taxableIncome <= b.limit) {
      bracket = b
      break
    }
    bracket = b
  }

  const tax = round(Math.max(0, taxableIncome * bracket.rate - bracket.deduction), 2)
  const net = round(grossAmount - tax, 2)

  return {
    taxableIncome: round(taxableIncome, 2),
    rate: bracket.rate * 100,
    deduction: bracket.deduction,
    tax,
    net,
  }
}

/** 税后反推税前 */
export function calculateLaborGrossFromNet(net: number): number {
  // 二分法反推
  if (net <= 0) return 0
  let lo = 0, hi = net * 2
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const result = calculateLaborTax(mid)
    if (result.net < net) lo = mid
    else hi = mid
  }
  return round((lo + hi) / 2, 2)
}

// ============================================================
// 07. 货币汇率换算
// ============================================================

// 静态汇率（相对人民币 CNY），实际可接入 API
export const EXCHANGE_RATES: Record<string, { name: string; rate: number; symbol: string }> = {
  CNY: { name: '人民币', rate: 1, symbol: '¥' },
  USD: { name: '美元', rate: 0.138, symbol: '$' },
  EUR: { name: '欧元', rate: 0.128, symbol: '€' },
  GBP: { name: '英镑', rate: 0.109, symbol: '£' },
  JPY: { name: '日元', rate: 21.15, symbol: '¥' },
  HKD: { name: '港币', rate: 1.078, symbol: 'HK$' },
  KRW: { name: '韩元', rate: 188.5, symbol: '₩' },
  AUD: { name: '澳元', rate: 0.213, symbol: 'A$' },
  CAD: { name: '加元', rate: 0.192, symbol: 'C$' },
  SGD: { name: '新加坡元', rate: 0.185, symbol: 'S$' },
  CHF: { name: '瑞士法郎', rate: 0.124, symbol: 'CHF' },
  MYR: { name: '马来西亚林吉特', rate: 0.65, symbol: 'RM' },
  THB: { name: '泰铢', rate: 4.85, symbol: '฿' },
  INR: { name: '印度卢比', rate: 11.5, symbol: '₹' },
  RUB: { name: '俄罗斯卢布', rate: 12.8, symbol: '₽' },
  BRL: { name: '巴西雷亚尔', rate: 0.71, symbol: 'R$' },
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const fromRate = EXCHANGE_RATES[from]?.rate || 1
  const toRate = EXCHANGE_RATES[to]?.rate || 1
  // 先转为人民币，再转为目标货币
  const inCny = amount / fromRate
  return round(inCny * toRate, 4)
}

// ============================================================
// 08. 世界货币（静态数据，在组件中直接使用 EXCHANGE_RATES 扩展）
// ============================================================

export const WORLD_CURRENCIES = [
  // ===== 亚洲 =====
  { code: 'CNY', name: '人民币元', nameEn: 'Renminbi Yuan', country: '中国', symbol: '¥', subunit: '1元=10角=100分' },
  { code: 'HKD', name: '港元', nameEn: 'Hong Kong Dollar', country: '中国香港', symbol: 'HK$', subunit: '1港元=100仙' },
  { code: 'MOP', name: '澳门元', nameEn: 'Macao Pataca', country: '中国澳门', symbol: 'MOP$', subunit: '1澳门元=100仙' },
  { code: 'TWD', name: '新台币', nameEn: 'New Taiwan Dollar', country: '中国台湾', symbol: 'NT$', subunit: '1元=100分' },
  { code: 'KRW', name: '韩元', nameEn: 'Korean Won', country: '韩国', symbol: '₩', subunit: '—' },
  { code: 'KPW', name: '朝鲜圆', nameEn: 'North Korean Won', country: '朝鲜', symbol: '₩', subunit: '1圆=100钱' },
  { code: 'VND', name: '越南盾', nameEn: 'Vietnamese Dong', country: '越南', symbol: '₫', subunit: '1盾=10毫=100分' },
  { code: 'JPY', name: '日元', nameEn: 'Japanese Yen', country: '日本', symbol: '¥', subunit: '1円=100钱（基本不用）' },
  { code: 'LAK', name: '基普', nameEn: 'Laotian Kip', country: '老挝', symbol: '⭘', subunit: '1基普=100阿特' },
  { code: 'KHR', name: '瑞尔', nameEn: 'Cambodian Riel', country: '柬埔寨', symbol: '៛', subunit: '1瑞尔=100仙' },
  { code: 'PHP', name: '菲律宾比索', nameEn: 'Philippine Peso', country: '菲律宾', symbol: '₱', subunit: '1比索=100分' },
  { code: 'MYR', name: '林吉特', nameEn: 'Malaysian Ringgit', country: '马来西亚', symbol: 'RM', subunit: '1林吉特=100分' },
  { code: 'SGD', name: '新加坡元', nameEn: 'Singapore Dollar', country: '新加坡', symbol: 'S$', subunit: '1元=100分' },
  { code: 'THB', name: '泰铢', nameEn: 'Thai Baht', country: '泰国', symbol: '฿', subunit: '1铢=100萨当' },
  { code: 'MMK', name: '缅甸元', nameEn: 'Burmese Kyat', country: '缅甸', symbol: 'K', subunit: '1元=100分' },
  { code: 'LKR', name: '斯里兰卡卢比', nameEn: 'Sri Lanka Rupee', country: '斯里兰卡', symbol: 'Rs', subunit: '1卢比=100分' },
  { code: 'MVR', name: '拉菲亚', nameEn: 'Maldives Rufiyaa', country: '马尔代夫', symbol: 'Rf', subunit: '1拉菲亚=100拉雷' },
  { code: 'IDR', name: '印尼盾', nameEn: 'Indonesian Rupiah', country: '印度尼西亚', symbol: 'Rp', subunit: '1盾=100分' },
  { code: 'PKR', name: '巴基斯坦卢比', nameEn: 'Pakistan Rupee', country: '巴基斯坦', symbol: 'Rs', subunit: '1卢比=100派萨' },
  { code: 'INR', name: '印度卢比', nameEn: 'Indian Rupee', country: '印度', symbol: '₹', subunit: '1卢比=100派士' },
  { code: 'BDT', name: '塔卡', nameEn: 'Bangladeshi Taka', country: '孟加拉国', symbol: '৳', subunit: '1塔卡=100派沙' },
  { code: 'NPR', name: '尼泊尔卢比', nameEn: 'Nepalese Rupee', country: '尼泊尔', symbol: 'Rs', subunit: '1卢比=100派司' },
  { code: 'AFN', name: '阿富汗尼', nameEn: 'Afghan Afghani', country: '阿富汗', symbol: '؋', subunit: '1阿富汗尼=100普尔' },
  { code: 'IRR', name: '伊朗里亚尔', nameEn: 'Iranian Rial', country: '伊朗', symbol: '﷼', subunit: '1里亚尔=100第纳尔' },
  { code: 'IQD', name: '伊拉克第纳尔', nameEn: 'Iraqi Dinar', country: '伊拉克', symbol: 'ع.د', subunit: '1第纳尔=1000费尔' },
  { code: 'SYP', name: '叙利亚镑', nameEn: 'Syrian Pound', country: '叙利亚', symbol: '£S', subunit: '1镑=100皮阿斯特' },
  { code: 'LBP', name: '黎巴嫩镑', nameEn: 'Lebanese Pound', country: '黎巴嫩', symbol: '£L', subunit: '1镑=100皮阿斯特' },
  { code: 'JOD', name: '约旦第纳尔', nameEn: 'Jordanian Dinar', country: '约旦', symbol: 'JD', subunit: '1第纳尔=1000费尔' },
  { code: 'AED', name: '迪拉姆', nameEn: 'UAE Dirham', country: '阿联酋', symbol: 'د.إ', subunit: '1迪拉姆=100费尔' },
  { code: 'SAR', name: '沙特里亚尔', nameEn: 'Saudi Riyal', country: '沙特阿拉伯', symbol: '﷼', subunit: '1里亚尔=100哈拉拉' },
  { code: 'KWD', name: '科威特第纳尔', nameEn: 'Kuwaiti Dinar', country: '科威特', symbol: 'KD', subunit: '1第纳尔=1000费尔' },
  { code: 'BHD', name: '巴林第纳尔', nameEn: 'Bahraini Dinar', country: '巴林', symbol: 'BD', subunit: '1第纳尔=1000费尔' },
  { code: 'QAR', name: '卡塔尔里亚尔', nameEn: 'Qatari Riyal', country: '卡塔尔', symbol: 'QR', subunit: '1里亚尔=100迪拉姆' },
  { code: 'OMR', name: '阿曼里亚尔', nameEn: 'Omani Rial', country: '阿曼', symbol: 'RO', subunit: '1里亚尔=1000派沙' },
  { code: 'YER', name: '也门里亚尔', nameEn: 'Yemeni Rial', country: '也门', symbol: 'YRL', subunit: '1里亚尔=100费尔' },
  { code: 'TRY', name: '土耳其里拉', nameEn: 'Turkish Lira', country: '土耳其', symbol: '₺', subunit: '1里拉=100库鲁' },
  // ===== 欧洲 =====
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '欧盟', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '德国', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '法国', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '意大利', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '西班牙', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '葡萄牙', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '荷兰', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '比利时', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '卢森堡', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '爱尔兰', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '芬兰', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '奥地利', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '希腊', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '马耳他', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '塞浦路斯', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'EUR', name: '欧元', nameEn: 'Euro', country: '斯洛伐克', symbol: '€', subunit: '1欧元=100欧分' },
  { code: 'ISK', name: '冰岛克朗', nameEn: 'Icelandic Krona', country: '冰岛', symbol: 'kr', subunit: '1克朗=100奥拉' },
  { code: 'DKK', name: '丹麦克朗', nameEn: 'Danish Krone', country: '丹麦', symbol: 'kr', subunit: '1克朗=100欧尔' },
  { code: 'NOK', name: '挪威克朗', nameEn: 'Norwegian Krone', country: '挪威', symbol: 'kr', subunit: '1克朗=100欧尔' },
  { code: 'SEK', name: '瑞典克朗', nameEn: 'Swedish Krona', country: '瑞典', symbol: 'kr', subunit: '1克朗=100欧尔' },
  { code: 'RUB', name: '俄罗斯卢布', nameEn: 'Russian Ruble', country: '俄罗斯', symbol: '₽', subunit: '1卢布=100戈比' },
  { code: 'PLN', name: '兹罗提', nameEn: 'Polish Zloty', country: '波兰', symbol: 'zł', subunit: '1兹罗提=100格罗希' },
  { code: 'CZK', name: '捷克克朗', nameEn: 'Czech Koruna', country: '捷克', symbol: 'Kč', subunit: '1克朗=100赫勒' },
  { code: 'HUF', name: '福林', nameEn: 'Hungarian Forint', country: '匈牙利', symbol: 'Ft', subunit: '1福林=100菲勒' },
  { code: 'CHF', name: '瑞士法郎', nameEn: 'Swiss Franc', country: '瑞士', symbol: 'CHF', subunit: '1法郎=100生丁' },
  { code: 'GBP', name: '英镑', nameEn: 'Pound Sterling', country: '英国', symbol: '£', subunit: '1英镑=100便士' },
  { code: 'RON', name: '列伊', nameEn: 'Romanian Leu', country: '罗马尼亚', symbol: 'lei', subunit: '1列伊=100巴尼' },
  { code: 'BGN', name: '列弗', nameEn: 'Bulgarian Lev', country: '保加利亚', symbol: 'лв', subunit: '1列弗=100斯托丁基' },
  { code: 'ALL', name: '列克', nameEn: 'Albanian Lek', country: '阿尔巴尼亚', symbol: 'L', subunit: '1列克=100昆塔' },
  { code: 'RSD', name: '第纳尔', nameEn: 'Serbian Dinar', country: '塞尔维亚', symbol: 'дин.', subunit: '1第纳尔=100帕拉' },
  // ===== 美洲 =====
  { code: 'USD', name: '美元', nameEn: 'US Dollar', country: '美国', symbol: '$', subunit: '1美元=100美分' },
  { code: 'CAD', name: '加元', nameEn: 'Canadian Dollar', country: '加拿大', symbol: 'C$', subunit: '1加元=100分' },
  { code: 'MXN', name: '墨西哥比索', nameEn: 'Mexican Peso', country: '墨西哥', symbol: '$', subunit: '1比索=100分' },
  { code: 'GTQ', name: '格查尔', nameEn: 'Guatemalan Quetzal', country: '危地马拉', symbol: 'Q', subunit: '1格查尔=100分' },
  { code: 'USD', name: '美元', nameEn: 'US Dollar', country: '萨尔瓦多', symbol: '$', subunit: '1美元=100美分' },
  { code: 'HNL', name: '伦皮拉', nameEn: 'Honduran Lempira', country: '洪都拉斯', symbol: 'L', subunit: '1伦皮拉=100分' },
  { code: 'NIO', name: '科多巴', nameEn: 'Nicaraguan Cordoba', country: '尼加拉瓜', symbol: 'C$', subunit: '1科多巴=100分' },
  { code: 'CRC', name: '哥斯达黎加科朗', nameEn: 'Costa Rican Colon', country: '哥斯达黎加', symbol: '₡', subunit: '1科朗=100分' },
  { code: 'PAB', name: '巴波亚', nameEn: 'Panamanian Balboa', country: '巴拿马', symbol: 'B/.', subunit: '1巴波亚=100分' },
  { code: 'CUP', name: '古巴比索', nameEn: 'Cuban Peso', country: '古巴', symbol: '$', subunit: '1比索=100分' },
  { code: 'BSD', name: '巴哈马元', nameEn: 'Bahamian Dollar', country: '巴哈马', symbol: 'B$', subunit: '1元=100分' },
  { code: 'JMD', name: '牙买加元', nameEn: 'Jamaican Dollar', country: '牙买加', symbol: 'J$', subunit: '1元=100分' },
  { code: 'HTG', name: '古德', nameEn: 'Haitian Gourde', country: '海地', symbol: 'G', subunit: '1古德=100分' },
  { code: 'DOP', name: '多米尼加比索', nameEn: 'Dominican Peso', country: '多米尼加', symbol: 'RD$', subunit: '1比索=100分' },
  { code: 'TTD', name: '特立尼达多巴哥元', nameEn: 'Trinidad and Tobago Dollar', country: '特立尼达和多巴哥', symbol: 'TT$', subunit: '1元=100分' },
  { code: 'BBD', name: '巴巴多斯元', nameEn: 'Barbados Dollar', country: '巴巴多斯', symbol: 'Bds$', subunit: '1元=100分' },
  { code: 'COP', name: '哥伦比亚比索', nameEn: 'Colombian Peso', country: '哥伦比亚', symbol: '$', subunit: '1比索=100分' },
  { code: 'VES', name: '玻利瓦尔', nameEn: 'Venezuelan Bolivar', country: '委内瑞拉', symbol: 'Bs.', subunit: '1玻利瓦尔=100分' },
  { code: 'GYD', name: '圭亚那元', nameEn: 'Guyanan Dollar', country: '圭亚那', symbol: 'G$', subunit: '1元=100分' },
  { code: 'SRD', name: '苏里南元', nameEn: 'Surinamese Dollar', country: '苏里南', symbol: '$', subunit: '1元=100分' },
  { code: 'PEN', name: '索尔', nameEn: 'Peruvian Sol', country: '秘鲁', symbol: 'S/', subunit: '1索尔=100分' },
  { code: 'USD', name: '美元', nameEn: 'US Dollar', country: '厄瓜多尔', symbol: '$', subunit: '1美元=100美分' },
  { code: 'BRL', name: '雷亚尔', nameEn: 'Brazilian Real', country: '巴西', symbol: 'R$', subunit: '1雷亚尔=100分' },
  { code: 'BOB', name: '玻利维亚诺', nameEn: 'Bolivian Boliviano', country: '玻利维亚', symbol: 'Bs', subunit: '1诺=100分' },
  { code: 'CLP', name: '智利比索', nameEn: 'Chilean Peso', country: '智利', symbol: '$', subunit: '1比索=100分' },
  { code: 'ARS', name: '阿根廷比索', nameEn: 'Argentine Peso', country: '阿根廷', symbol: '$', subunit: '1比索=100分' },
  { code: 'PYG', name: '瓜拉尼', nameEn: 'Paraguayan Guarani', country: '巴拉圭', symbol: '₲', subunit: '1瓜拉尼=100分' },
  { code: 'UYU', name: '乌拉圭比索', nameEn: 'Uruguayan Peso', country: '乌拉圭', symbol: '$U', subunit: '1比索=100分' },
  // ===== 非洲 =====
  { code: 'EGP', name: '埃及镑', nameEn: 'Egyptian Pound', country: '埃及', symbol: 'E£', subunit: '1镑=100皮阿斯特' },
  { code: 'LYD', name: '利比亚第纳尔', nameEn: 'Libyan Dinar', country: '利比亚', symbol: 'LD', subunit: '1第纳尔=1000米利姆' },
  { code: 'SDG', name: '苏丹镑', nameEn: 'Sudanese Pound', country: '苏丹', symbol: '£SD', subunit: '1镑=100皮阿斯特' },
  { code: 'TND', name: '突尼斯第纳尔', nameEn: 'Tunisian Dinar', country: '突尼斯', symbol: 'DT', subunit: '1第纳尔=1000米利姆' },
  { code: 'DZD', name: '阿尔及利亚第纳尔', nameEn: 'Algerian Dinar', country: '阿尔及利亚', symbol: 'DA', subunit: '1第纳尔=100分' },
  { code: 'MAD', name: '摩洛哥迪拉姆', nameEn: 'Moroccan Dirham', country: '摩洛哥', symbol: 'DH', subunit: '1迪拉姆=100分' },
  { code: 'MRU', name: '乌吉亚', nameEn: 'Mauritania Ouguiya', country: '毛里塔尼亚', symbol: 'UM', subunit: '1乌吉亚=5库姆斯' },
  { code: 'XOF', name: '西非法郎', nameEn: 'West African CFA Franc', country: '塞内加尔', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XOF', name: '西非法郎', nameEn: 'West African CFA Franc', country: '布基纳法索', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XOF', name: '西非法郎', nameEn: 'West African CFA Franc', country: '科特迪瓦', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XOF', name: '西非法郎', nameEn: 'West African CFA Franc', country: '多哥', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XOF', name: '西非法郎', nameEn: 'West African CFA Franc', country: '贝宁', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XOF', name: '西非法郎', nameEn: 'West African CFA Franc', country: '几内亚比绍', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'GMD', name: '达拉西', nameEn: 'Gambian Dalasi', country: '冈比亚', symbol: 'D', subunit: '1达拉西=100布图' },
  { code: 'GNF', name: '几内亚法郎', nameEn: 'Guinean Franc', country: '几内亚', symbol: 'FG', subunit: '1法郎=100分' },
  { code: 'SLL', name: '利昂', nameEn: 'Sierra Leone Leone', country: '塞拉利昂', symbol: 'Le', subunit: '1利昂=100分' },
  { code: 'LRD', name: '利比里亚元', nameEn: 'Liberian Dollar', country: '利比里亚', symbol: 'L$', subunit: '1元=100分' },
  { code: 'GHS', name: '塞地', nameEn: 'Ghanaian Cedi', country: '加纳', symbol: 'GH₵', subunit: '1塞地=100比塞瓦' },
  { code: 'NGN', name: '奈拉', nameEn: 'Nigerian Naira', country: '尼日利亚', symbol: '₦', subunit: '1奈拉=100考包' },
  { code: 'XAF', name: '中非法郎', nameEn: 'Central African CFA Franc', country: '喀麦隆', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XAF', name: '中非法郎', nameEn: 'Central African CFA Franc', country: '乍得', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XAF', name: '中非法郎', nameEn: 'Central African CFA Franc', country: '刚果（布）', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XAF', name: '中非法郎', nameEn: 'Central African CFA Franc', country: '加蓬', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XAF', name: '中非法郎', nameEn: 'Central African CFA Franc', country: '中非', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'XAF', name: '中非法郎', nameEn: 'Central African CFA Franc', country: '赤道几内亚', symbol: 'CFA', subunit: '1法郎=100分' },
  { code: 'ZAR', name: '兰特', nameEn: 'South African Rand', country: '南非', symbol: 'R', subunit: '1兰特=100分' },
  { code: 'DJF', name: '吉布提法郎', nameEn: 'Djibouti Franc', country: '吉布提', symbol: 'Fdj', subunit: '1法郎=100分' },
  { code: 'SOS', name: '索马里先令', nameEn: 'Somali Shilling', country: '索马里', symbol: 'Sh.So.', subunit: '1先令=100分' },
  { code: 'KES', name: '肯尼亚先令', nameEn: 'Kenya Shilling', country: '肯尼亚', symbol: 'KSh', subunit: '1先令=100分' },
  { code: 'UGX', name: '乌干达先令', nameEn: 'Uganda Shilling', country: '乌干达', symbol: 'USh', subunit: '1先令=100分' },
  { code: 'TZS', name: '坦桑尼亚先令', nameEn: 'Tanzania Shilling', country: '坦桑尼亚', symbol: 'TSh', subunit: '1先令=100分' },
  { code: 'RWF', name: '卢旺达法郎', nameEn: 'Rwanda Franc', country: '卢旺达', symbol: 'FRw', subunit: '1法郎=100分' },
  { code: 'BIF', name: '布隆迪法郎', nameEn: 'Burundi Franc', country: '布隆迪', symbol: 'FBu', subunit: '1法郎=100分' },
  { code: 'CDF', name: '刚果法郎', nameEn: 'Congolese Franc', country: '刚果（金）', symbol: 'FC', subunit: '1法郎=100分' },
  { code: 'ZMW', name: '赞比亚克瓦查', nameEn: 'Zambian Kwacha', country: '赞比亚', symbol: 'ZK', subunit: '1克瓦查=100恩韦' },
  { code: 'MGA', name: '阿里亚里', nameEn: 'Malagasy Ariary', country: '马达加斯加', symbol: 'Ar', subunit: '1阿里亚里=5伊莱比拉加' },
  { code: 'SCR', name: '塞舌尔卢比', nameEn: 'Seychelles Rupee', country: '塞舌尔', symbol: '₨', subunit: '1卢比=100分' },
  { code: 'MUR', name: '毛里求斯卢比', nameEn: 'Mauritius Rupee', country: '毛里求斯', symbol: '₨', subunit: '1卢比=100分' },
  { code: 'ZWG', name: '津巴布韦元', nameEn: 'Zimbabwe Gold', country: '津巴布韦', symbol: 'ZiG', subunit: '1元=100分' },
  { code: 'KMF', name: '科摩罗法郎', nameEn: 'Comoros Franc', country: '科摩罗', symbol: 'CF', subunit: '1法郎=100分' },
  // ===== 大洋洲 =====
  { code: 'AUD', name: '澳大利亚元', nameEn: 'Australian Dollar', country: '澳大利亚', symbol: 'A$', subunit: '1澳元=100分' },
  { code: 'NZD', name: '新西兰元', nameEn: 'New Zealand Dollar', country: '新西兰', symbol: 'NZ$', subunit: '1新西兰元=100分' },
  { code: 'FJD', name: '斐济元', nameEn: 'Fiji Dollar', country: '斐济', symbol: 'FJ$', subunit: '1斐济元=100分' },
  { code: 'SBD', name: '所罗门元', nameEn: 'Solomon Dollar', country: '所罗门群岛', symbol: 'SI$', subunit: '1元=100分' },
]

// ============================================================
// 09. 数字求和
// ============================================================

export interface NumberSumResult {
  sum: number
  count: number
  max: number
  min: number
  average: number
  product: number
}

/**
 * 解析文本中的数字并求和
 */
export function sumNumbers(text: string): NumberSumResult {
  const matches = text.match(/-?\d+(\.\d+)?/g) || []
  const numbers = matches.map(parseFloat).filter((n) => !isNaN(n))

  if (numbers.length === 0) {
    return { sum: 0, count: 0, max: 0, min: 0, average: 0, product: 0 }
  }

  const sum = numbers.reduce((a, b) => a + b, 0)
  const product = numbers.reduce((a, b) => a * b, 1)

  return {
    sum: round(sum, 4),
    count: numbers.length,
    max: Math.max(...numbers),
    min: Math.min(...numbers),
    average: round(sum / numbers.length, 4),
    product: round(product, 6),
  }
}

// ============================================================
// 10. 合同款项计算器
// ============================================================

export interface ContractPaymentInput {
  totalAmount: number     // 合同总金额
  taxRate: number         // 税率 %
  payments: number        // 付款期数
}

export interface ContractPaymentResult {
  totalAmount: number
  untaxedAmount: number
  taxAmount: number
  perPayment: number
  perPaymentUntaxed: number
  perPaymentTax: number
  schedule: { period: number; amount: number; untaxed: number; tax: number; cumulative: number }[]
}

export function calculateContractPayment(input: ContractPaymentInput): ContractPaymentResult {
  const { totalAmount, taxRate, payments } = input
  const r = taxRate / 100
  const untaxedAmount = round(totalAmount / (1 + r), 2)
  const taxAmount = round(totalAmount - untaxedAmount, 2)
  const perPayment = round(totalAmount / payments, 2)
  const perPaymentUntaxed = round(untaxedAmount / payments, 2)
  const perPaymentTax = round(taxAmount / payments, 2)

  const schedule = []
  let cumulative = 0
  for (let i = 1; i <= payments; i++) {
    const amount = i === payments ? round(totalAmount - perPayment * (payments - 1), 2) : perPayment
    const untaxed = i === payments ? round(untaxedAmount - perPaymentUntaxed * (payments - 1), 2) : perPaymentUntaxed
    const tax = i === payments ? round(taxAmount - perPaymentTax * (payments - 1), 2) : perPaymentTax
    cumulative = round(cumulative + amount, 2)
    schedule.push({ period: i, amount, untaxed, tax, cumulative })
  }

  return {
    totalAmount,
    untaxedAmount,
    taxAmount,
    perPayment,
    perPaymentUntaxed,
    perPaymentTax,
    schedule,
  }
}

// ---------- 按比例拆分（如：预付款/30、进度款/30、验收款/30、质保金/10） ----------

export interface ContractRatioItem {
  name: string    // 款项名称
  ratio: number   // 比例 %
  amount: number  // 付款金额
  untaxed: number // 不含税金额
  tax: number     // 税额
  amountCn: string // 人民币大写
}

export interface ContractRatioResult {
  items: ContractRatioItem[]
  totalAmount: number
  untaxedAmount: number
  taxAmount: number
  ratioSum: number   // 比例合计 %
  ratioExact: boolean // 合计是否为 100%
}

/** 解析比例文本：每行一条「名称/比例」，兼容全角斜杠、百分号，一行内可用 ｜ 分隔多条 */
export function parseContractRatioLines(text: string): { name: string; ratio: number }[] {
  const items: { name: string; ratio: number }[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    // 一行内可用 ｜ 或 | 分隔多条，如：预付款/30｜进度款/70
    for (const segment of line.split(/[｜|]/)) {
      const seg = segment.trim()
      if (!seg) continue
      const sepIndex = seg.search(/[/／]/)
      if (sepIndex <= 0) continue
      const name = seg.slice(0, sepIndex).trim()
      const ratioStr = seg.slice(sepIndex + 1).trim().replace(/%$/, '')
      const ratio = parseFloat(ratioStr)
      if (!name || isNaN(ratio) || ratio < 0) continue
      items.push({ name, ratio })
    }
  }
  return items
}

export function calculateContractByRatio(input: {
  totalAmount: number
  taxRate: number
  items: { name: string; ratio: number }[]
}): ContractRatioResult {
  const { totalAmount, taxRate } = input
  const items = input.items
  const ratioSum = round(items.reduce((s, it) => s + it.ratio, 0), 2)
  const ratioExact = items.length > 0 && Math.abs(ratioSum - 100) < 0.005

  const resultItems: ContractRatioItem[] = []
  let allocated = 0
  items.forEach((it, index) => {
    let amount = round((totalAmount * it.ratio) / 100, 2)
    // 比例合计为 100% 时，最后一项吸收四舍五入尾差，确保各笔之和精确等于总金额
    if (ratioExact && index === items.length - 1) {
      amount = round(totalAmount - allocated, 2)
    }
    allocated = round(allocated + amount, 2)
    const untaxed = taxRate > 0 ? round(amount / (1 + taxRate / 100), 2) : amount
    const tax = taxRate > 0 ? round(amount - untaxed, 2) : 0
    resultItems.push({
      name: it.name,
      ratio: it.ratio,
      amount,
      untaxed,
      tax,
      amountCn: numberToRmbUppercase(amount, true),
    })
  })

  const untaxedAmount = taxRate > 0 ? round(totalAmount / (1 + taxRate / 100), 2) : round(totalAmount, 2)
  const taxAmount = taxRate > 0 ? round(totalAmount - untaxedAmount, 2) : 0

  return {
    items: resultItems,
    totalAmount: round(totalAmount, 2),
    untaxedAmount,
    taxAmount,
    ratioSum,
    ratioExact,
  }
}

// ============================================================
// 11. 贷款计算器
// ============================================================

export type LoanMethod = 'equalPayment' | 'equalPrincipal'

export interface LoanInput {
  amount: number       // 贷款金额
  years: number        // 贷款年限
  annualRate: number   // 年利率 %
  method: LoanMethod   // 还款方式
}

export interface LoanResult {
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  schedule: { period: number; payment: number; principal: number; interest: number; balance: number }[]
}

export function calculateLoan(input: LoanInput): LoanResult {
  const { amount, years, annualRate, method } = input
  const months = Math.round(years * 12)
  const monthlyRate = annualRate / 100 / 12

  const schedule: LoanResult['schedule'] = []

  if (method === 'equalPayment') {
    // 等额本息
    let monthlyPayment: number
    if (monthlyRate === 0) {
      monthlyPayment = round(amount / months, 2)
    } else {
      monthlyPayment = round(
        (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1),
        2,
      )
    }

    let balance = amount
    let totalPayment = 0
    let totalInterest = 0

    for (let i = 1; i <= months; i++) {
      const interest = round(balance * monthlyRate, 2)
      let principal = round(monthlyPayment - interest, 2)
      if (i === months) principal = round(balance, 2)
      const payment = round(principal + interest, 2)
      balance = round(balance - principal, 2)
      totalPayment = round(totalPayment + payment, 2)
      totalInterest = round(totalInterest + interest, 2)
      schedule.push({ period: i, payment, principal, interest, balance })
    }

    return { monthlyPayment, totalPayment, totalInterest, schedule }
  } else {
    // 等额本金
    const principalPerMonth = round(amount / months, 2)
    let balance = amount
    let totalPayment = 0
    let totalInterest = 0
    let firstPayment = 0

    for (let i = 1; i <= months; i++) {
      const interest = round(balance * monthlyRate, 2)
      let principal = principalPerMonth
      if (i === months) principal = round(balance, 2)
      const payment = round(principal + interest, 2)
      balance = round(balance - principal, 2)
      totalPayment = round(totalPayment + payment, 2)
      totalInterest = round(totalInterest + interest, 2)
      if (i === 1) firstPayment = payment
      schedule.push({ period: i, payment, principal, interest, balance })
    }

    return { monthlyPayment: firstPayment, totalPayment, totalInterest, schedule }
  }
}

