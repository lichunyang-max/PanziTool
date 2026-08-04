/**
 * cron.ts - Cron 表达式纯函数
 *
 * 提供 5 段（分 时 日 月 周）与 6 段（秒 分 时 日 月 周）Cron 表达式的
 * 校验、中文解释生成、未来触发时间计算能力。所有函数为纯函数，
 * 不依赖 Nuxt 运行时，可在 Vitest 中独立测试。
 *
 * 支持的特殊字符：
 * - 星号 任意值
 * - 问号 不指定（仅用于日/周字段）
 * - 减号 范围，如 1-5
 * - 逗号 列表，如 1,3,5
 * - 斜杠 步长，如 星号/5 或 1-10/2
 * - L 最后，如日字段的 L 或 5L，周字段的 6L（最后一个周六）
 * - W 工作日，如 15W（最接近 15 号的工作日）
 * - 井号 第几个，如 6#3（每月第三个周六）
 *
 * 周字段 0 与 7 均表示周日；支持英文缩写 SUN/MON/TUE/WED/THU/FRI/SAT。
 */

export type CronMode = '5-field' | '6-field'

export interface CronValidationResult {
  valid: boolean
  error?: string
  /** 出错字段名：sec / min / hour / day / month / week / expression */
  errorField?: string
}

export interface CronFieldInfo {
  /** 字段中文名，如 "分"、"时"、"秒" */
  label: string
  min: number
  max: number
}

/** 周英文缩写 → 数值（0=周日） */
const WEEK_NAMES: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
}

/** 月份英文缩写 → 数值（1=一月） */
const MONTH_NAMES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
}

interface FieldDef {
  name: 'sec' | 'min' | 'hour' | 'day' | 'month' | 'week'
  label: string
  min: number
  max: number
}

const FIELD_DEFS_5: FieldDef[] = [
  { name: 'min', label: '分', min: 0, max: 59 },
  { name: 'hour', label: '时', min: 0, max: 23 },
  { name: 'day', label: '日', min: 1, max: 31 },
  { name: 'month', label: '月', min: 1, max: 12 },
  { name: 'week', label: '周', min: 0, max: 7 },
]

const FIELD_DEFS_6: FieldDef[] = [
  { name: 'sec', label: '秒', min: 0, max: 59 },
  { name: 'min', label: '分', min: 0, max: 59 },
  { name: 'hour', label: '时', min: 0, max: 23 },
  { name: 'day', label: '日', min: 1, max: 31 },
  { name: 'month', label: '月', min: 1, max: 12 },
  { name: 'week', label: '周', min: 0, max: 7 },
]

function getFieldDefs(mode: CronMode): FieldDef[] {
  return mode === '5-field' ? FIELD_DEFS_5 : FIELD_DEFS_6
}

/** 将周英文缩写替换为数字 */
function replaceWeekNames(s: string): string {
  return s.replace(/SUN|MON|TUE|WED|THU|FRI|SAT/gi, (m) =>
    String(WEEK_NAMES[m.toUpperCase()] ?? m),
  )
}

/** 将月英文缩写替换为数字 */
function replaceMonthNames(s: string): string {
  return s.replace(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/gi, (m) =>
    String(MONTH_NAMES[m.toUpperCase()] ?? m),
  )
}

/** 将周字段值 7 归一化为 0（周日） */
function normalizeWeekValue(v: number): number {
  return v === 7 ? 0 : v
}

/**
 * 校验单个字段表达式。
 * 仅做语法/取值范围校验，不做语义冲突检查（如日与周同时非 ?）。
 */
function validateField(
  field: string,
  def: FieldDef,
): { valid: boolean; error?: string } {
  if (field === '') {
    return { valid: false, error: `${def.label}字段不能为空` }
  }

  // `?` 仅允许在日 / 周字段使用
  if (field === '?') {
    if (def.name !== 'day' && def.name !== 'week') {
      return { valid: false, error: `${def.label}字段不支持 ?` }
    }
    return { valid: true }
  }

  // 处理 #（仅周字段）：如 6#3
  if (field.includes('#')) {
    if (def.name !== 'week') {
      return { valid: false, error: `${def.label}字段不支持 #` }
    }
    const parts = field.split('#')
    if (parts.length !== 2) {
      return { valid: false, error: `${def.label}字段 # 语法错误` }
    }
    const [wPart, nPart] = parts
    if (!wPart || !nPart) {
      return { valid: false, error: `${def.label}字段 # 语法错误` }
    }
    const w = Number.parseInt(wPart, 10)
    const n = Number.parseInt(nPart, 10)
    if (Number.isNaN(w) || Number.isNaN(n)) {
      return { valid: false, error: `${def.label}字段 # 语法错误` }
    }
    const wv = normalizeWeekValue(w)
    if (wv < 0 || wv > 6) {
      return { valid: false, error: `${def.label}字段周值应在 0-7 之间` }
    }
    if (n < 1 || n > 5) {
      return { valid: false, error: `${def.label}字段 # 后值应在 1-5 之间` }
    }
    return { valid: true }
  }

  // 处理 L（日字段：L 或 5L；周字段：6L）
  if (field.includes('L')) {
    if (def.name !== 'day' && def.name !== 'week') {
      return { valid: false, error: `${def.label}字段不支持 L` }
    }
    if (field === 'L') {
      return { valid: true }
    }
    // 形如 5L
    const match = /^(\d+)L$/i.exec(field)
    if (!match) {
      return { valid: false, error: `${def.label}字段 L 语法错误` }
    }
    const v = Number.parseInt(match[1]!, 10)
    if (def.name === 'week') {
      const wv = normalizeWeekValue(v)
      if (wv < 0 || wv > 6) {
        return { valid: false, error: `${def.label}字段周值应在 0-7 之间` }
      }
    } else {
      if (v < def.min || v > def.max) {
        return { valid: false, error: `${def.label}字段值应在 ${def.min}-${def.max} 之间` }
      }
    }
    return { valid: true }
  }

  // 处理 W（仅日字段）：15W
  if (field.includes('W')) {
    if (def.name !== 'day') {
      return { valid: false, error: `${def.label}字段不支持 W` }
    }
    const match = /^(\d+)W$/i.exec(field)
    if (!match) {
      return { valid: false, error: `${def.label}字段 W 语法错误` }
    }
    const v = Number.parseInt(match[1]!, 10)
    if (v < def.min || v > def.max) {
      return { valid: false, error: `${def.label}字段值应在 ${def.min}-${def.max} 之间` }
    }
    return { valid: true }
  }

  // 通用解析：先替换英文缩写
  let expr = field
  if (def.name === 'week') expr = replaceWeekNames(expr)
  if (def.name === 'month') expr = replaceMonthNames(expr)

  // 拆分列表
  const items = expr.split(',')
  for (const item of items) {
    const err = validateItem(item, def)
    if (err) return { valid: false, error: err }
  }
  return { valid: true }
}

/** 校验列表中单个项：可为 星号、星号/n、n、n-m、n-m/s */
function validateItem(item: string, def: FieldDef): string | undefined {
  if (item === '') return `${def.label}字段列表项为空`

  // 处理 星号/n
  if (item === '*') return undefined
  const starStep = /^\*\/(\d+)$/.exec(item)
  if (starStep) {
    const step = Number.parseInt(starStep[1]!, 10)
    if (step < 1) return `${def.label}字段步长应大于 0`
    return undefined
  }

  // 处理 n-m/s 或 n-m
  const rangeStep = /^(\d+)-(\d+)\/(\d+)$/.exec(item)
  if (rangeStep) {
    const lo = Number.parseInt(rangeStep[1]!, 10)
    const hi = Number.parseInt(rangeStep[2]!, 10)
    const step = Number.parseInt(rangeStep[3]!, 10)
    if (lo > hi) return `${def.label}字段范围起始大于结束`
    if (step < 1) return `${def.label}字段步长应大于 0`
    const v = checkValueInRange(lo, hi, def)
    if (v) return v
    return undefined
  }
  const range = /^(\d+)-(\d+)$/.exec(item)
  if (range) {
    const lo = Number.parseInt(range[1]!, 10)
    const hi = Number.parseInt(range[2]!, 10)
    if (lo > hi) return `${def.label}字段范围起始大于结束`
    return checkValueInRange(lo, hi, def)
  }

  // 处理 n/s
  const step = /^(\d+)\/(\d+)$/.exec(item)
  if (step) {
    const start = Number.parseInt(step[1]!, 10)
    const s = Number.parseInt(step[2]!, 10)
    if (s < 1) return `${def.label}字段步长应大于 0`
    return checkValueInRange(start, start, def)
  }

  // 单值
  const single = /^(\d+)$/.exec(item)
  if (single) {
    const v = Number.parseInt(single[1]!, 10)
    return checkValueInRange(v, v, def)
  }

  return `${def.label}字段语法错误：${item}`
}

function checkValueInRange(lo: number, hi: number, def: FieldDef): string | undefined {
  // 周字段允许 7（归一化为 0）
  const min = def.min
  const max = def.name === 'week' ? 7 : def.max
  if (lo < min || lo > max) return `${def.label}字段值 ${lo} 越界（${min}-${max}）`
  if (hi < min || hi > max) return `${def.label}字段值 ${hi} 越界（${min}-${max}）`
  return undefined
}

/**
 * 校验 Cron 表达式。
 *
 * 检查项：
 * - 非空
 * - 字段数与模式一致
 * - 各字段语法与取值范围合法
 * - `?` 仅出现在日 / 周字段
 * - L/W/# 仅出现在允许的字段
 */
export function validateCron(
  expression: string,
  mode: CronMode,
): CronValidationResult {
  const trimmed = (expression || '').trim()
  if (!trimmed) {
    return { valid: false, error: '表达式不能为空', errorField: 'expression' }
  }
  const parts = trimmed.split(/\s+/)
  const expected = mode === '5-field' ? 5 : 6
  if (parts.length !== expected) {
    return {
      valid: false,
      error: `表达式应为 ${expected} 个字段，当前为 ${parts.length} 个`,
      errorField: 'expression',
    }
  }
  const defs = getFieldDefs(mode)
  for (let i = 0; i < parts.length; i++) {
    const r = validateField(parts[i]!, defs[i]!)
    if (!r.valid) {
      return { valid: false, error: r.error, errorField: defs[i]!.name }
    }
  }
  return { valid: true }
}

/** 解析后的字段语义表示 */
interface ParsedField {
  /** 任意值（*） */
  any: boolean
  /** 不指定（?） */
  unspecified: boolean
  /** 显式枚举值集合（已归一化，周 7 → 0） */
  values: number[]
  /** 步长信息（仅用于解释生成，不影响匹配） */
  step?: { start: number; step: number }
  range?: { lo: number; hi: number }
  /** L 修饰符 */
  last?: boolean
  lastValue?: number
  /** W 修饰符（仅日字段） */
  wValue?: number
  /** # 修饰符（仅周字段） */
  hashWeek?: number
  hashN?: number
}

function parseField(field: string, def: FieldDef): ParsedField {
  const result: ParsedField = {
    any: false,
    unspecified: false,
    values: [],
  }
  if (field === '?') {
    result.unspecified = true
    return result
  }
  if (field === '*') {
    result.any = true
    return result
  }

  // # (周)
  const hashMatch = /^(\d+)#(\d+)$/.exec(field)
  if (hashMatch && def.name === 'week') {
    const w = Number.parseInt(hashMatch[1]!, 10)
    const n = Number.parseInt(hashMatch[2]!, 10)
    result.hashWeek = normalizeWeekValue(w)
    result.hashN = n
    return result
  }

  // L (日 / 周)
  if (field === 'L' && def.name === 'day') {
    result.last = true
    return result
  }
  const lMatch = /^(\d+)L$/i.exec(field)
  if (lMatch && (def.name === 'day' || def.name === 'week')) {
    const v = Number.parseInt(lMatch[1]!, 10)
    result.last = true
    if (def.name === 'week') {
      result.lastValue = normalizeWeekValue(v)
    } else {
      result.lastValue = v
    }
    return result
  }

  // W (日)
  const wMatch = /^(\d+)W$/i.exec(field)
  if (wMatch && def.name === 'day') {
    result.wValue = Number.parseInt(wMatch[1]!, 10)
    return result
  }

  // 通用列表
  let expr = field
  if (def.name === 'week') expr = replaceWeekNames(expr)
  if (def.name === 'month') expr = replaceMonthNames(expr)

  const items = expr.split(',')
  for (const item of items) {
    if (item === '*') {
      result.any = true
      continue
    }
    const starStep = /^\*\/(\d+)$/.exec(item)
    if (starStep) {
      const step = Number.parseInt(starStep[1]!, 10)
      const start = def.min
      const values: number[] = []
      for (let v = start; v <= def.max; v += step) {
        values.push(def.name === 'week' ? normalizeWeekValue(v) : v)
      }
      result.values.push(...values)
      result.step = { start, step }
      continue
    }
    const rangeStep = /^(\d+)-(\d+)\/(\d+)$/.exec(item)
    if (rangeStep) {
      const lo = Number.parseInt(rangeStep[1]!, 10)
      const hi = Number.parseInt(rangeStep[2]!, 10)
      const step = Number.parseInt(rangeStep[3]!, 10)
      const values: number[] = []
      for (let v = lo; v <= hi; v += step) {
        values.push(def.name === 'week' ? normalizeWeekValue(v) : v)
      }
      result.values.push(...values)
      result.range = { lo, hi }
      result.step = { start: lo, step }
      continue
    }
    const range = /^(\d+)-(\d+)$/.exec(item)
    if (range) {
      const lo = Number.parseInt(range[1]!, 10)
      const hi = Number.parseInt(range[2]!, 10)
      const values: number[] = []
      for (let v = lo; v <= hi; v++) {
        values.push(def.name === 'week' ? normalizeWeekValue(v) : v)
      }
      result.values.push(...values)
      result.range = { lo, hi }
      continue
    }
    const step = /^(\d+)\/(\d+)$/.exec(item)
    if (step) {
      const start = Number.parseInt(step[1]!, 10)
      const s = Number.parseInt(step[2]!, 10)
      const values: number[] = []
      for (let v = start; v <= def.max; v += s) {
        values.push(def.name === 'week' ? normalizeWeekValue(v) : v)
      }
      result.values.push(...values)
      result.step = { start, step: s }
      continue
    }
    const single = /^(\d+)$/.exec(item)
    if (single) {
      const v = Number.parseInt(single[1]!, 10)
      result.values.push(def.name === 'week' ? normalizeWeekValue(v) : v)
      continue
    }
  }
  return result
}

function parseExpression(
  expression: string,
  mode: CronMode,
): ParsedField[] | null {
  const trimmed = (expression || '').trim()
  const parts = trimmed.split(/\s+/)
  const expected = mode === '5-field' ? 5 : 6
  if (parts.length !== expected) return null
  const defs = getFieldDefs(mode)
  return parts.map((p, i) => parseField(p, defs[i]!))
}

/** 周数值 → 中文名 */
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

function explainWeekValue(v: number): string {
  return `周${WEEK_CN[v] ?? v}`
}

/**
 * 生成 Cron 表达式的中文解释。
 *
 * 优先匹配常见高频模式（每分钟、每天 HH:mm、工作日、每月 N 日、每 N 分钟等），
 * 未匹配的复杂表达式回退为按字段描述拼接。
 */
export function explainCron(expression: string, mode: CronMode): string {
  const validation = validateCron(expression, mode)
  if (!validation.valid) {
    return '表达式无效，无法生成解释'
  }
  const parsed = parseExpression(expression, mode)
  if (!parsed) return '表达式无效，无法生成解释'

  const defs = getFieldDefs(mode)
  const hasSec = mode === '6-field'
  const fields: Record<string, ParsedField> = {}
  for (let i = 0; i < defs.length; i++) {
    fields[defs[i]!.name] = parsed[i]!
  }

  // 6 段模式下 sec 是否为单一 0（视为「从第 0 秒开始」简化描述）
  const isSimpleSec0 =
    hasSec && fields.sec.values.length === 1 && fields.sec.values[0] === 0

  // 时间字符串格式：
  // - 5 段模式：始终 HH:mm
  // - 6 段模式 sec=0：HH:mm（与 5 段一致），但「每月 N 日」模式使用 HH:mm:ss 强调精度
  // - 6 段模式 sec!=0：HH:mm:ss
  const buildTimeStr = (h: number, m: number, forceSec: boolean = false): string => {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    if (hasSec) {
      // sec!=0 或显式要求秒精度 → HH:mm:ss
      if (!isSimpleSec0 || forceSec) {
        const ss = String(fields.sec.values[0] ?? 0).padStart(2, '0')
        return `${hh}:${mm}:${ss}`
      }
      // sec=0 → HH:mm（与 5 段一致）
      return `${hh}:${mm}`
    }
    return `${hh}:${mm}`
  }

  // 日/周是否为「每天」语义
  const isDailyLike =
    fields.day.any &&
    fields.month.any &&
    (fields.week.any || fields.week.unspecified)

  // 工作日模式：日为 ?，周为受限值
  const isWorkdayPattern =
    fields.day.unspecified &&
    !fields.week.unspecified &&
    !fields.week.any

  // 每月特定日：日为单值，月为 *，周为 ? 或 *
  const isMonthlyDay =
    !fields.day.any &&
    !fields.day.unspecified &&
    fields.day.values.length === 1 &&
    fields.month.any &&
    (fields.week.any || fields.week.unspecified)

  // sec 是否对描述无影响（5 段无 sec，或 6 段 sec 为单一 0，或 sec 为 *）
  const secIrrelevant = !hasSec || isSimpleSec0 || fields.sec.any

  // 模式 1：每分钟 / 每秒
  if (
    fields.min.any &&
    fields.hour.any &&
    isDailyLike &&
    secIrrelevant
  ) {
    if (hasSec && fields.sec.any) return '每秒执行'
    if (hasSec && isSimpleSec0) return '每分钟的第 0 秒执行'
    return '每分钟执行'
  }

  // 模式 2：每小时的第 N 分钟（N != 0）
  if (
    !fields.min.any &&
    fields.min.values.length === 1 &&
    fields.min.values[0] !== 0 &&
    fields.hour.any &&
    isDailyLike &&
    secIrrelevant
  ) {
    return `每小时的第 ${fields.min.values[0]} 分钟执行`
  }

  // 模式 2b：每小时的第 0 分钟（`0 * * * *` 或 `0 0 * * * ?`）
  // 注意：`0 * * * * ?`（min=*）由模式 1 处理为「每分钟的第 0 秒执行」，
  // 此处仅处理 min=0、hour=* 的情况，输出「每小时的第 0 分钟执行」。
  if (
    !fields.min.any &&
    fields.min.values.length === 1 &&
    fields.min.values[0] === 0 &&
    fields.hour.any &&
    isDailyLike &&
    secIrrelevant
  ) {
    return '每小时的第 0 分钟执行'
  }

  // 模式 3：每 N 分钟（星号/N 形式）
  if (
    fields.min.step &&
    fields.min.step.start === 0 &&
    fields.hour.any &&
    isDailyLike &&
    secIrrelevant
  ) {
    return `每 ${fields.min.step.step} 分钟执行`
  }

  // 模式 4：每天 HH:mm[:ss]（`M H * * *` 或 `0 M H * * ?`）
  if (
    !fields.min.any &&
    fields.min.values.length === 1 &&
    !fields.hour.any &&
    fields.hour.values.length === 1 &&
    isDailyLike &&
    (secIrrelevant || (hasSec && fields.sec.values.length === 1))
  ) {
    return `每天 ${buildTimeStr(fields.hour.values[0]!, fields.min.values[0]!)} 执行`
  }

  // 模式 5：工作日模式 `0 30 9 ? * MON-FRI`
  if (
    isWorkdayPattern &&
    !fields.min.any &&
    fields.min.values.length === 1 &&
    !fields.hour.any &&
    fields.hour.values.length === 1 &&
    fields.month.any &&
    (secIrrelevant || (hasSec && fields.sec.values.length === 1))
  ) {
    const t = buildTimeStr(fields.hour.values[0]!, fields.min.values[0]!)
    const weekDesc = describeWeekField(fields.week)
    return `每${weekDesc} ${t} 执行`
  }

  // 模式 6：每月 N 日 0 点 `0 0 0 1 * ?`
  if (
    isMonthlyDay &&
    !fields.min.any &&
    fields.min.values.length === 1 &&
    fields.min.values[0] === 0 &&
    !fields.hour.any &&
    fields.hour.values.length === 1 &&
    fields.hour.values[0] === 0 &&
    secIrrelevant
  ) {
    const suffix = hasSec ? '00:00:00' : '00:00'
    return `每月 ${fields.day.values[0]} 日 ${suffix} 执行`
  }

  // 模式 7：每月 N 日 HH:mm（非 0 点，6 段模式 sec=0 时也使用 HH:mm:ss）
  if (
    isMonthlyDay &&
    !fields.min.any &&
    fields.min.values.length === 1 &&
    !fields.hour.any &&
    fields.hour.values.length === 1 &&
    secIrrelevant
  ) {
    // 每月 N 日模式始终使用 HH:mm:ss（6 段）或 HH:mm（5 段）
    const t = buildTimeStr(
      fields.hour.values[0]!,
      fields.min.values[0]!,
      true, // forceSec: 强制包含秒
    )
    return `每月 ${fields.day.values[0]} 日 ${t} 执行`
  }

  // 通用回退：按字段描述拼接
  const parts: string[] = []
  if (hasSec) {
    const s = describeField(fields.sec, 'sec')
    if (s) parts.push(s)
  }
  const m = describeField(fields.min, 'min')
  if (m) parts.push(m)
  const h = describeField(fields.hour, 'hour')
  if (h) parts.push(h)
  const d = describeDayMonth(fields.day, fields.week)
  if (d) parts.push(d)
  const mo = describeField(fields.month, 'month')
  if (mo) parts.push(mo)

  const joined = parts.filter(Boolean).join('，')
  return joined ? `${joined} 执行` : '按指定规则执行'
}

function describeField(field: ParsedField, name: string): string {
  const unitMap: Record<string, string> = {
    sec: '秒',
    min: '分',
    hour: '时',
    month: '月',
  }
  const unit = unitMap[name] ?? ''
  if (field.unspecified) return ''
  if (field.any) return ''
  if (field.step && field.step.start === 0 && field.values.length > 1) {
    return `每 ${field.step.step} ${unit}`
  }
  if (field.step && field.values.length > 1) {
    return `从 ${field.step.start} ${unit}起每 ${field.step.step} ${unit}`
  }
  if (field.range) {
    return `${field.range.lo}-${field.range.hi} ${unit}`
  }
  if (field.values.length === 1) {
    return `第 ${field.values[0]} ${unit}`
  }
  if (field.values.length > 1) {
    return `${field.values.join('/')} ${unit}`
  }
  return ''
}

function describeWeekField(field: ParsedField): string {
  if (field.range) {
    const lo = field.range.lo
    const hi = field.range.hi
    return `${explainWeekValue(lo)}到${explainWeekValue(hi)}`
  }
  if (field.values.length === 1) {
    return explainWeekValue(field.values[0]!)
  }
  if (field.values.length > 1) {
    return field.values.map((v) => explainWeekValue(v)).join('、')
  }
  if (field.last && field.lastValue !== undefined) {
    return `最后一个${explainWeekValue(field.lastValue)}`
  }
  if (field.hashWeek !== undefined && field.hashN !== undefined) {
    return `第 ${field.hashN} 个${explainWeekValue(field.hashWeek)}`
  }
  return '周'
}

function describeDayMonth(day: ParsedField, week: ParsedField): string {
  // 仅在日 / 周非默认时描述
  const hasDayRestriction =
    (!day.any && !day.unspecified) || day.last || day.wValue !== undefined
  const hasWeekRestriction =
    (!week.any && !week.unspecified) ||
    week.last ||
    week.hashWeek !== undefined

  if (!hasDayRestriction && !hasWeekRestriction) return ''

  const parts: string[] = []

  if (day.last && day.lastValue === undefined) {
    parts.push('每月最后一天')
  } else if (day.last && day.lastValue !== undefined) {
    parts.push(`每月最后 ${day.lastValue} 日前`)
  } else if (day.wValue !== undefined) {
    parts.push(`最接近 ${day.wValue} 日的工作日`)
  } else if (!day.any && !day.unspecified) {
    if (day.range) {
      parts.push(`每月 ${day.range.lo}-${day.range.hi} 日`)
    } else if (day.values.length === 1) {
      parts.push(`每月 ${day.values[0]} 日`)
    } else if (day.values.length > 1) {
      parts.push(`每月 ${day.values.join('/')} 日`)
    }
  }

  if (hasWeekRestriction) {
    parts.push(describeWeekField(week))
  }

  return parts.join('且')
}

/**
 * 计算下 N 次触发时间。
 *
 * 暴力遍历：从当前时间的下一个最小单位开始，
 * 按最小单位（5 段为分；6 段为秒）递增检查是否匹配。
 *
 * @param count 计算次数，默认 10
 * @param from 起始时间，默认当前时间
 * @param maxIter 最大迭代次数（防止死循环），默认 5 * 365 * 24 * 3600
 */
export function getNextTriggerTimes(
  expression: string,
  mode: CronMode,
  count: number = 10,
  from: Date = new Date(),
  maxIter: number = 5 * 365 * 24 * 3600,
): Date[] {
  const validation = validateCron(expression, mode)
  if (!validation.valid) return []
  const parsed = parseExpression(expression, mode)
  if (!parsed) return []

  const defs = getFieldDefs(mode)
  const fields: Record<string, ParsedField> = {}
  for (let i = 0; i < defs.length; i++) {
    fields[defs[i]!.name] = parsed[i]!
  }

  const stepMs = mode === '6-field' ? 1000 : 60 * 1000
  // 起始：对齐到下一秒/分（5 段对齐到下一分钟 0 秒）
  const startMs = (() => {
    const t = from.getTime()
    if (mode === '6-field') {
      return Math.floor(t / 1000) * 1000 + 1000
    }
    // 5 段：对齐到下一分钟
    return Math.floor(t / 60000) * 60000 + 60000
  })()

  const results: Date[] = []
  let iter = 0
  let cursor = startMs

  while (results.length < count && iter < maxIter) {
    iter++
    const date = new Date(cursor)
    if (matchDate(date, fields, mode)) {
      results.push(date)
    }
    cursor += stepMs
  }
  return results
}

/** 检查给定时间是否匹配所有字段 */
function matchDate(
  date: Date,
  fields: Record<string, ParsedField>,
  mode: CronMode,
): boolean {
  const sec = date.getSeconds()
  const min = date.getMinutes()
  const hour = date.getHours()
  const day = date.getDate()
  const month = date.getMonth() + 1
  const week = date.getDay() // 0=Sun

  if (mode === '6-field') {
    if (!matchSimple(fields.sec, sec)) return false
  }
  if (!matchSimple(fields.min, min)) return false
  if (!matchSimple(fields.hour, hour)) return false
  if (!matchSimple(fields.month, month)) return false

  // 日 / 周匹配规则（Quartz 风格）：
  // - 若日为 ?，仅匹配周
  // - 若周为 ?，仅匹配日
  // - 若两者都指定，任一匹配即通过
  const dayField = fields.day
  const weekField = fields.week

  const dayMatches = matchDay(dayField, date)
  const weekMatches = matchWeek(weekField, week, date)

  if (dayField.unspecified && !weekField.unspecified) {
    return weekMatches
  }
  if (!dayField.unspecified && weekField.unspecified) {
    return dayMatches
  }
  if (dayField.any && weekField.any) {
    return true
  }
  if (dayField.any && !weekField.any && !weekField.unspecified) {
    return weekMatches
  }
  if (!dayField.any && !dayField.unspecified && weekField.any) {
    return dayMatches
  }
  // 两者均指定
  return dayMatches || weekMatches
}

function matchSimple(field: ParsedField, value: number): boolean {
  if (field.any) return true
  if (field.unspecified) return false
  if (field.values.length === 0) return false
  return field.values.includes(value)
}

function matchDay(field: ParsedField, date: Date): boolean {
  if (field.any) return true
  if (field.unspecified) return false
  if (field.wValue !== undefined) {
    // 最接近 wValue 的工作日
    const target = field.wValue
    const day = date.getDate()
    const wday = date.getDay()
    if (day === target && wday !== 0 && wday !== 6) return true
    // 1W：1 号非周末则直接为 1 号
    return false
  }
  if (field.last) {
    if (field.lastValue !== undefined) {
      // 5L：当月最后一天减去 (5L 表示的"最后一天往前 X 日"，这里简化为：值代表日号未匹配则 false)
      // 通用 L 不常用于日字段中带值，简化处理：lastValue 表示日号
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      return date.getDate() === lastDay - (field.lastValue - 1)
    }
    // L = 当月最后一天
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    return date.getDate() === lastDay
  }
  return field.values.includes(date.getDate())
}

function matchWeek(field: ParsedField, week: number, date: Date): boolean {
  if (field.any) return true
  if (field.unspecified) return false
  if (field.hashWeek !== undefined && field.hashN !== undefined) {
    if (week !== field.hashWeek) return false
    // 检查是否为本月第 hashN 个该周几
    const day = date.getDate()
    const nth = Math.floor((day - 1) / 7) + 1
    return nth === field.hashN
  }
  if (field.last && field.lastValue !== undefined) {
    if (week !== field.lastValue) return false
    // 检查是否为本月最后一个该周几
    const day = date.getDate()
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    return day + 7 > lastDay
  }
  return field.values.includes(week)
}

/**
 * 获取指定模式下各字段的信息（用于 UI 展示）。
 */
export function getFieldInfos(mode: CronMode): CronFieldInfo[] {
  return getFieldDefs(mode).map((d) => ({
    label: d.label,
    min: d.min,
    max: d.name === 'week' ? 7 : d.max,
  }))
}
