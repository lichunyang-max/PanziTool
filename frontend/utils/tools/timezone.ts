/**
 * timezone.ts - 多时区时间换算与时间差计算纯函数
 *
 * 使用浏览器原生 Intl.DateTimeFormat 进行时区换算，自动处理夏令时（DST），
 * 所有计算在本地完成，无网络依赖。
 *
 * 核心思路：
 * - wallTimeToUtc：将"某时区的墙上时间"（datetime-local 格式）转为绝对 UTC 毫秒时间戳，
 *   通过两次迭代对比修正偏移。
 * - getOffsetMinutes：获取某时区在指定时刻的 UTC 偏移分钟（含 DST）。
 *
 * 忠实移植自 panziui/tools/timezone-calculator.html 内联脚本。
 */

/** 操作结果 */
export interface TzResult {
  success: boolean
  output?: string
  error?: string
}

/** 时区项 */
export interface TzItem {
  zone: string
  label: string
}

/** 常用时区列表 */
export const TZ_LIST: TzItem[] = [
  { zone: 'Asia/Shanghai', label: '北京/上海 (Asia/Shanghai)' },
  { zone: 'Asia/Hong_Kong', label: '香港 (Asia/Hong_Kong)' },
  { zone: 'Asia/Tokyo', label: '东京 (Asia/Tokyo)' },
  { zone: 'Asia/Seoul', label: '首尔 (Asia/Seoul)' },
  { zone: 'Asia/Singapore', label: '新加坡 (Asia/Singapore)' },
  { zone: 'Asia/Kolkata', label: '孟买 (Asia/Kolkata)' },
  { zone: 'Asia/Dubai', label: '迪拜 (Asia/Dubai)' },
  { zone: 'Europe/London', label: '伦敦 (Europe/London)' },
  { zone: 'Europe/Paris', label: '巴黎 (Europe/Paris)' },
  { zone: 'Europe/Berlin', label: '柏林 (Europe/Berlin)' },
  { zone: 'Europe/Moscow', label: '莫斯科 (Europe/Moscow)' },
  { zone: 'America/New_York', label: '纽约 (America/New_York)' },
  { zone: 'America/Chicago', label: '芝加哥 (America/Chicago)' },
  { zone: 'America/Los_Angeles', label: '洛杉矶 (America/Los_Angeles)' },
  { zone: 'Australia/Sydney', label: '悉尼 (Australia/Sydney)' },
  { zone: 'Pacific/Auckland', label: '奥克兰 (Pacific/Auckland)' },
  { zone: 'UTC', label: 'UTC 协调世界时' },
]

/** 默认对照展示的时区 */
export const TZ_DEFAULT_SHOWN: string[] = [
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'UTC',
  'Australia/Sydney',
]

/** 根据 zone 查找中文标签 */
export function getZoneLabel(zone: string): string {
  return TZ_LIST.find((t) => t.zone === zone)?.label ?? zone
}

/**
 * 将"某时区的墙上时间"转为绝对 UTC 毫秒时间戳。
 *
 * @param wallTimeStr datetime-local 格式字符串，如 "2026-08-22T14:00"
 * @param timeZone    IANA 时区标识
 * @returns UTC 毫秒时间戳
 */
export function wallTimeToUtc(wallTimeStr: string, timeZone: string): number {
  const [datePart, timePart] = wallTimeStr.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)

  // 先假设它是 UTC，求出一个近似时间戳
  let ts = Date.UTC(y, mo - 1, d, h, mi)
  // 通过格式化对比，迭代修正偏移
  for (let i = 0; i < 2; i++) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    const parts: Record<string, string> = {}
    fmt.formatToParts(new Date(ts)).forEach((p) => {
      parts[p.type] = p.value
    })
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
    )
    const offset = asUTC - ts
    ts = ts - offset // 修正
  }
  return ts
}

/**
 * 获取某时区在指定时刻的 UTC 偏移分钟（含 DST）。
 *
 * @param date     任意 Date（绝对时刻）
 * @param timeZone IANA 时区标识
 * @returns 相对 UTC 的偏移分钟数
 */
export function getOffsetMinutes(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, string> = {}
  fmt.formatToParts(date).forEach((p) => {
    parts[p.type] = p.value
  })
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((asUTC - date.getTime()) / 60000)
}

/** 将偏移分钟格式化为 "UTC+8" / "UTC-5:30" 形式 */
export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return 'UTC' + sign + h + (m ? ':' + String(m).padStart(2, '0') : '')
}

/** 将某时区的本地时间格式化为中文短串 */
export function formatLocal(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).format(date)
}

/** 将分钟差格式化为 "+8h" / "-5h30m" / "相同" */
export function formatDiff(minutes: number): string {
  if (minutes === 0) return '相同'
  const sign = minutes > 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return sign + h + 'h' + (m ? m + 'm' : '')
}

/**
 * 计算两个时区的时间差（主入口）。
 *
 * @param timeA 时区 A 的墙上时间（datetime-local 格式）
 * @param zoneA 时区 A 的 IANA 标识
 * @param timeB 时区 B 的墙上时间
 * @param zoneB 时区 B 的 IANA 标识
 * @returns 成功返回 { success: true, output }（含时间差与方向描述），空输入返回空输出
 */
export function calcTimeDiff(
  timeA: string,
  zoneA: string,
  timeB: string,
  zoneB: string,
): TzResult {
  if (!timeA || !timeB) {
    return { success: true, output: '' }
  }

  try {
    const tsA = wallTimeToUtc(timeA, zoneA)
    const tsB = wallTimeToUtc(timeB, zoneB)
    const diffMinutes = Math.round((tsA - tsB) / 60000)

    const labelA = getZoneLabel(zoneA)
    const labelB = getZoneLabel(zoneB)

    const abs = Math.abs(diffMinutes)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    let diffText: string
    if (diffMinutes === 0) {
      diffText = '两个时间完全相同'
    } else {
      const dir = diffMinutes > 0 ? 'A 早于 B' : 'B 早于 A'
      diffText =
        '时间差：' +
        (h ? h + ' 小时' : '') +
        (m ? ' ' + m + ' 分钟' : '') +
        '（' + dir + '）'
    }

    const output =
      diffText +
      '\n' +
      `${labelA} ${timeA.replace('T', ' ')} ↔ ${labelB} ${timeB.replace('T', ' ')}`
    return { success: true, output }
  } catch (err) {
    return {
      success: false,
      error: `时间格式无效：${err instanceof Error ? err.message : '请检查输入'}`,
    }
  }
}
