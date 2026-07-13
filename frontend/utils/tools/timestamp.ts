/**
 * timestamp.ts - 时间戳转换纯函数
 *
 * 提供时间戳与日期时间的互转能力，支持秒/毫秒单位、时区偏移、
 * 相对时间格式化与单位自动识别。所有函数均为纯函数（除 nowTimestamp
 * 读取系统时钟外），不依赖 Nuxt 运行时，可在 Vitest 中独立测试。
 *
 * 时区模型说明：
 * - Unix 时间戳本身基于 UTC，与时区无关。
 * - tzOffset（小时）仅影响「时间戳 → 墙钟时间字符串」的显示，
 *   以及「墙钟时间字符串 → 时间戳」的解释。
 * - 内部统一使用 Date.getTime()（绝对毫秒）与 UTC getter 计算，
 *   不依赖宿主机器的本地时区，保证跨环境一致性。
 */

/** 时间戳单位：秒或毫秒 */
export type TimestampUnit = 's' | 'ms'

/** timestampToDate 返回结构 */
export interface TimestampToDateResult {
  /** 形如 YYYY-MM-DD HH:mm:ss 的墙钟时间（按指定时区） */
  datetime: string
  /** ISO 8601 带时区偏移，如 2023-10-31T17:17:12+08:00 */
  iso: string
  /** 相对时间，如「3 分钟前」「2 天后」 */
  relative: string
}

/** dateToTimestamp 返回结构 */
export interface DateToTimestampResult {
  /** 秒级时间戳 */
  seconds: number
  /** 毫秒级时间戳 */
  millis: number
  /** ISO 8601 带时区偏移 */
  iso: string
}

/** nowTimestamp 返回结构 */
export interface NowTimestampResult {
  seconds: number
  millis: number
}

/** 常用时间戳参考点（日期与时间戳均为 UTC） */
export const COMMON_TIMESTAMPS: ReadonlyArray<{
  label: string
  date: string
  ts: number
}> = [
  { label: 'Unix 纪元', date: '1970-01-01 00:00:00', ts: 0 },
  { label: '2000年', date: '2000-01-01 00:00:00', ts: 946684800 },
  { label: '2020年', date: '2020-01-01 00:00:00', ts: 1577836800 },
  { label: '2024年', date: '2024-01-01 00:00:00', ts: 1704067200 },
  { label: '2025年', date: '2025-01-01 00:00:00', ts: 1735689600 },
  { label: '2026年', date: '2026-01-01 00:00:00', ts: 1767225600 },
]

/**
 * 将数字补齐为两位字符串
 */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * 获取一个 Date 在指定时区偏移下的各组成部分。
 *
 * 实现原理：将绝对 UTC 毫秒加上 offsetHours 对应的毫秒数，
 * 再用 UTC getter 读取，即可得到该时区的墙钟时间。
 * 此方式与宿主机器本地时区无关，结果稳定可复现。
 *
 * @param date 任意 Date
 * @param offsetHours 时区偏移（小时），如北京 8、纽约 -5
 */
function getTzParts(date: Date, offsetHours: number) {
  const tzMs = date.getTime() + offsetHours * 3600000
  const tzDate = new Date(tzMs)
  return {
    y: tzDate.getUTCFullYear(),
    m: pad(tzDate.getUTCMonth() + 1),
    d: pad(tzDate.getUTCDate()),
    h: pad(tzDate.getUTCHours()),
    mi: pad(tzDate.getUTCMinutes()),
    s: pad(tzDate.getUTCSeconds()),
  }
}

/**
 * 将 Date 格式化为指定时区的 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(date: Date, offsetHours: number): string {
  const p = getTzParts(date, offsetHours)
  return `${p.y}-${p.m}-${p.d} ${p.h}:${p.mi}:${p.s}`
}

/**
 * 将 Date 格式化为指定时区的 ISO 8601 字符串（带偏移）
 * 例如 +08:00 / -05:00 / +00:00
 */
function formatISO(date: Date, offsetHours: number): string {
  const p = getTzParts(date, offsetHours)
  const sign = offsetHours >= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetHours)
  const oh = pad(Math.floor(absOffset))
  const om = pad((absOffset % 1) * 60)
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.mi}:${p.s}${sign}${oh}:${om}`
}

/**
 * 自动识别时间戳单位。
 * - 13 位及以上 → 毫秒（ms）
 * - 其它 → 秒（s）
 *
 * 依据：秒级时间戳在 2286 年之前均为 10 位，毫秒级为 13 位。
 *
 * @param ts 待识别的时间戳
 * @throws 若 ts 非有限数字
 */
export function detectUnit(ts: number): TimestampUnit {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) {
    throw new Error('无效的时间戳：非有限数字')
  }
  const digits = String(Math.trunc(Math.abs(ts))).length
  return digits >= 13 ? 'ms' : 's'
}

/**
 * 格式化相对时间（中文）。
 *
 * 规则：未来事件使用「后」后缀，过去事件使用「前」后缀，
 * 依次按 年 / 月 / 天 / 小时 / 分钟 / 秒 取整输出。
 *
 * @param date 目标时间
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = date.getTime() - now
  const absDiff = Math.abs(diff)
  const suffix = diff >= 0 ? '后' : '前'

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years >= 1) return `${years}年${suffix}`
  if (months >= 1) return `${months}个月${suffix}`
  if (days >= 1) return `${days}天${suffix}`
  if (hours >= 1) return `${hours}小时${suffix}`
  if (minutes >= 1) return `${minutes}分钟${suffix}`
  return `${seconds}秒${suffix}`
}

/**
 * 时间戳转日期时间。
 *
 * @param ts 时间戳数值
 * @param unit 单位：'s' 秒 / 'ms' 毫秒
 * @param tzOffset 时区偏移（小时），默认 0（UTC）
 * @returns 包含 datetime / iso / relative 的结果对象
 * @throws 若 ts 非有限数字或超出可表示范围
 */
export function timestampToDate(
  ts: number,
  unit: TimestampUnit,
  tzOffset: number = 0,
): TimestampToDateResult {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) {
    throw new Error('无效的时间戳：非有限数字')
  }
  const ms = unit === 's' ? ts * 1000 : ts
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) {
    throw new Error('无效的时间戳：超出可表示范围')
  }
  return {
    datetime: formatDateTime(date, tzOffset),
    iso: formatISO(date, tzOffset),
    relative: formatRelativeTime(date),
  }
}

/**
 * 日期时间字符串转时间戳。
 *
 * 将输入字符串解释为「指定时区的墙钟时间」，返回对应的绝对时间戳。
 * 支持的输入格式：YYYY-MM-DDTHH:mm:ss 或 YYYY-MM-DD HH:mm:ss（秒可省略）。
 *
 * @param dateStr 日期时间字符串
 * @param tzOffset 时区偏移（小时），默认 0（UTC）
 * @returns 包含 seconds / millis / iso 的结果对象
 * @throws 若格式不匹配、数值越界或超出可表示范围
 */
export function dateToTimestamp(
  dateStr: string,
  tzOffset: number = 0,
): DateToTimestampResult {
  if (typeof dateStr !== 'string' || dateStr.trim() === '') {
    throw new Error('无效的日期时间字符串')
  }

  // 同时兼容 'T' 与空格作为日期/时间分隔符
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    dateStr.trim(),
  )
  if (!match) {
    throw new Error('无效的日期时间格式，期望 YYYY-MM-DD HH:mm:ss')
  }

  const y = Number.parseInt(match[1]!, 10)
  const mo = Number.parseInt(match[2]!, 10)
  const d = Number.parseInt(match[3]!, 10)
  const h = Number.parseInt(match[4]!, 10)
  const mi = Number.parseInt(match[5]!, 10)
  const s = match[6] ? Number.parseInt(match[6], 10) : 0

  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) {
    throw new Error('无效的日期时间：数值超出范围')
  }

  // 将墙钟时间按 tzOffset 解释为绝对 UTC 毫秒
  const utcMs =
    Date.UTC(y, mo - 1, d, h, mi, s) - tzOffset * 3600000
  const date = new Date(utcMs)
  if (Number.isNaN(date.getTime())) {
    throw new Error('无效的日期时间：超出可表示范围')
  }

  return {
    seconds: Math.floor(utcMs / 1000),
    millis: utcMs,
    iso: formatISO(date, tzOffset),
  }
}

/**
 * 获取当前时间戳。
 *
 * 读取系统时钟，返回秒级与毫秒级时间戳。
 */
export function nowTimestamp(): NowTimestampResult {
  const millis = Date.now()
  return {
    seconds: Math.floor(millis / 1000),
    millis,
  }
}
