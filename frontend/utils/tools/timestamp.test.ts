import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMMON_TIMESTAMPS,
  dateToTimestamp,
  detectUnit,
  formatRelativeTime,
  nowTimestamp,
  timestampToDate,
} from './timestamp'

/**
 * 时间戳转换纯函数单元测试
 *
 * 用例覆盖：
 * - 秒级 / 毫秒级时间戳转日期时间
 * - 日期时间转时间戳
 * - 单位自动识别（10 位 / 13 位）
 * - 相对时间格式化（前/后、各量级）
 * - 时区偏移处理（同一时间戳在不同时区显示不同墙钟时间）
 * - 非法输入处理（空、非数字、格式错误、越界）
 *
 * 主测试时间戳：1704067200 = 2024-01-01 00:00:00 UTC
 *   - 北京时间 (UTC+8)：2024-01-01 08:00:00
 *   - 东京 (UTC+9)：  2024-01-01 09:00:00
 *   - 纽约 (UTC-5)：  2023-12-31 19:00:00
 *   - 洛杉矶 (UTC-8)：2023-12-31 16:00:00
 */

describe('timestampToDate', () => {
  it('秒级时间戳转日期时间（北京时间 UTC+8）', () => {
    const result = timestampToDate(1704067200, 's', 8)
    expect(result.datetime).toBe('2024-01-01 08:00:00')
    expect(result.iso).toBe('2024-01-01T08:00:00+08:00')
  })

  it('毫秒级时间戳转日期时间，与秒级结果一致', () => {
    const result = timestampToDate(1704067200000, 'ms', 8)
    expect(result.datetime).toBe('2024-01-01 08:00:00')
    expect(result.iso).toBe('2024-01-01T08:00:00+08:00')
  })

  it('UTC 时区（偏移 0）显示 UTC 墙钟时间', () => {
    const result = timestampToDate(1704067200, 's', 0)
    expect(result.datetime).toBe('2024-01-01 00:00:00')
    expect(result.iso).toBe('2024-01-01T00:00:00+00:00')
  })

  it('纽约时区（UTC-5）跨天显示为前一天', () => {
    const result = timestampToDate(1704067200, 's', -5)
    expect(result.datetime).toBe('2023-12-31 19:00:00')
    expect(result.iso).toBe('2023-12-31T19:00:00-05:00')
  })

  it('Unix 纪元 0 转为 1970-01-01 00:00:00（UTC）', () => {
    const result = timestampToDate(0, 's', 0)
    expect(result.datetime).toBe('1970-01-01 00:00:00')
  })

  it('返回的 relative 字段为非空字符串', () => {
    const result = timestampToDate(1704067200, 's', 8)
    expect(typeof result.relative).toBe('string')
    expect(result.relative.length).toBeGreaterThan(0)
  })

  it('默认时区偏移为 0（UTC）', () => {
    const result = timestampToDate(1704067200, 's')
    expect(result.datetime).toBe('2024-01-01 00:00:00')
  })

  it('同一时间戳在不同时区产生不同墙钟时间', () => {
    const utc = timestampToDate(1704067200, 's', 0).datetime
    const beijing = timestampToDate(1704067200, 's', 8).datetime
    const ny = timestampToDate(1704067200, 's', -5).datetime
    expect(utc).not.toBe(beijing)
    expect(utc).not.toBe(ny)
    expect(beijing).not.toBe(ny)
  })

  it('非法输入：NaN 抛出错误', () => {
    expect(() => timestampToDate(Number.NaN, 's')).toThrow('非有限数字')
  })

  it('非法输入：Infinity 抛出错误', () => {
    expect(() => timestampToDate(Number.POSITIVE_INFINITY, 's')).toThrow(
      '非有限数字',
    )
  })

  it('非法输入：超出可表示范围抛出错误', () => {
    // Date 可表示毫秒上界约为 ±8.64e15，远超该值得到 Invalid Date
    expect(() => timestampToDate(8.64e21, 'ms')).toThrow('超出可表示范围')
  })
})

describe('dateToTimestamp', () => {
  it('日期时间字符串转时间戳（北京时间 UTC+8）', () => {
    const result = dateToTimestamp('2024-01-01T08:00:00', 8)
    expect(result.seconds).toBe(1704067200)
    expect(result.millis).toBe(1704067200000)
    expect(result.iso).toBe('2024-01-01T08:00:00+08:00')
  })

  it('兼容空格分隔符', () => {
    const result = dateToTimestamp('2024-01-01 08:00:00', 8)
    expect(result.seconds).toBe(1704067200)
  })

  it('UTC 时区（偏移 0）解释为 UTC 时间', () => {
    const result = dateToTimestamp('2024-01-01 00:00:00', 0)
    expect(result.seconds).toBe(1704067200)
  })

  it('纽约时区（UTC-5）解释为对应墙钟时间', () => {
    const result = dateToTimestamp('2023-12-31T19:00:00', -5)
    expect(result.seconds).toBe(1704067200)
  })

  it('省略秒数时默认为 0', () => {
    const result = dateToTimestamp('2024-01-01T08:00', 8)
    expect(result.seconds).toBe(1704067200)
  })

  it('Unix 纪元字符串转时间戳为 0', () => {
    const result = dateToTimestamp('1970-01-01 00:00:00', 0)
    expect(result.seconds).toBe(0)
    expect(result.millis).toBe(0)
  })

  it('默认时区偏移为 0（UTC）', () => {
    const result = dateToTimestamp('2024-01-01 00:00:00')
    expect(result.seconds).toBe(1704067200)
  })

  it('与 timestampToDate 互为逆运算（往返一致）', () => {
    const original = 1704067200
    const to = timestampToDate(original, 's', 8)
    // to.datetime 形如 "2024-01-01 08:00:00"，转为 ISO local 后再转回
    const back = dateToTimestamp(to.datetime.replace(' ', 'T'), 8)
    expect(back.seconds).toBe(original)
  })

  it('非法输入：空字符串抛出错误', () => {
    expect(() => dateToTimestamp('', 8)).toThrow('无效的日期时间字符串')
  })

  it('非法输入：纯空白字符串抛出错误', () => {
    expect(() => dateToTimestamp('   ', 8)).toThrow('无效的日期时间字符串')
  })

  it('非法输入：格式不匹配抛出错误', () => {
    expect(() => dateToTimestamp('hello', 8)).toThrow('无效的日期时间格式')
    expect(() => dateToTimestamp('2024/01/01 08:00:00', 8)).toThrow(
      '无效的日期时间格式',
    )
  })

  it('非法输入：数值越界抛出错误', () => {
    expect(() => dateToTimestamp('2024-13-01 08:00:00', 8)).toThrow(
      '数值超出范围',
    )
    expect(() => dateToTimestamp('2024-01-01 25:00:00', 8)).toThrow(
      '数值超出范围',
    )
  })
})

describe('detectUnit', () => {
  it('10 位时间戳识别为秒', () => {
    expect(detectUnit(1704067200)).toBe('s')
  })

  it('13 位时间戳识别为毫秒', () => {
    expect(detectUnit(1704067200000)).toBe('ms')
  })

  it('个位数时间戳识别为秒', () => {
    expect(detectUnit(0)).toBe('s')
    expect(detectUnit(1)).toBe('s')
  })

  it('负数时间戳按绝对值位数识别', () => {
    // 1970 年之前的时间戳为负值，按位数识别仍应正确
    expect(detectUnit(-1000000000)).toBe('s')
    expect(detectUnit(-1000000000000)).toBe('ms')
  })

  it('非法输入：NaN 抛出错误', () => {
    expect(() => detectUnit(Number.NaN)).toThrow('非有限数字')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('过去事件使用「前」后缀', () => {
    const past = new Date(Date.now() - 30 * 1000)
    expect(formatRelativeTime(past)).toBe('30秒前')
  })

  it('未来事件使用「后」后缀', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000)
    expect(formatRelativeTime(future)).toBe('10分钟后')
  })

  it('各量级取整输出', () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000))).toBe(
      '5分钟前',
    )
    expect(formatRelativeTime(new Date(Date.now() - 2 * 3600 * 1000))).toBe(
      '2小时前',
    )
    expect(formatRelativeTime(new Date(Date.now() - 3 * 86400 * 1000))).toBe(
      '3天前',
    )
    // 约 61 天前 → 2 个月前
    expect(
      formatRelativeTime(new Date(Date.now() - 61 * 86400 * 1000)),
    ).toBe('2个月前')
    // 约 366 天前 → 1 年前
    expect(
      formatRelativeTime(new Date(Date.now() - 366 * 86400 * 1000)),
    ).toBe('1年前')
  })

  it('不足 1 秒时输出「0秒前」', () => {
    expect(formatRelativeTime(new Date(Date.now() - 500))).toBe('0秒前')
  })
})

describe('nowTimestamp', () => {
  it('返回秒级与毫秒级时间戳', () => {
    const now = nowTimestamp()
    expect(typeof now.millis).toBe('number')
    expect(Number.isFinite(now.millis)).toBe(true)
    expect(now.seconds).toBe(Math.floor(now.millis / 1000))
  })

  it('与 Date.now() 接近（毫秒级）', () => {
    const before = Date.now()
    const now = nowTimestamp()
    const after = Date.now()
    expect(now.millis).toBeGreaterThanOrEqual(before)
    expect(now.millis).toBeLessThanOrEqual(after)
  })
})

describe('COMMON_TIMESTAMPS', () => {
  it('包含预期参考点', () => {
    const labels = COMMON_TIMESTAMPS.map((item) => item.label)
    expect(labels).toContain('Unix 纪元')
    expect(labels).toContain('2026年')
  })

  it('Unix 纪元时间戳为 0', () => {
    const epoch = COMMON_TIMESTAMPS.find((item) => item.label === 'Unix 纪元')
    expect(epoch?.ts).toBe(0)
  })

  it('可经 timestampToDate 在 UTC 下还原为对应日期', () => {
    for (const item of COMMON_TIMESTAMPS) {
      const result = timestampToDate(item.ts, 's', 0)
      expect(result.datetime).toBe(item.date)
    }
  })
})
