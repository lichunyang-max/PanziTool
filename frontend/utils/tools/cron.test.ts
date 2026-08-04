import { describe, expect, it } from 'vitest'
import {
  explainCron,
  getNextTriggerTimes,
  validateCron,
  getFieldInfos,
  type CronMode,
} from './cron'

/**
 * cron.ts 单元测试
 *
 * 覆盖：
 * - 5 段 / 6 段表达式校验（合法与非法用例）
 * - 中文解释生成（高频模板与特殊字符）
 * - 触发时间计算（递增、排序、未来时间）
 * - 字段信息查询
 *
 * 注意：5 段模式表达式必须为 5 个 token，6 段模式为 6 个 token。
 */

describe('validateCron - 5 段模式', () => {
  it('合法：`* * * * *` 每分钟', () => {
    expect(validateCron('* * * * *', '5-field')).toEqual({ valid: true })
  })

  it('合法：`0 * * * *` 每小时第 0 分钟', () => {
    expect(validateCron('0 * * * *', '5-field')).toEqual({ valid: true })
  })

  it('合法：`0 0 * * *` 每天 0 点', () => {
    expect(validateCron('0 0 * * *', '5-field')).toEqual({ valid: true })
  })

  it('合法：步长 `*/5 * * * *`', () => {
    expect(validateCron('*/5 * * * *', '5-field')).toEqual({ valid: true })
  })

  it('合法：列表 `0,15,30,45 * * * *`', () => {
    expect(validateCron('0,15,30,45 * * * *', '5-field')).toEqual({ valid: true })
  })

  it('合法：范围 `0 9-17 * * 1-5`', () => {
    expect(validateCron('0 9-17 * * 1-5', '5-field')).toEqual({ valid: true })
  })

  it('合法：周字段使用 7 表示周日（5 段）`* * * * 7`', () => {
    expect(validateCron('* * * * 7', '5-field')).toEqual({ valid: true })
  })

  it('合法：日字段 L 表示最后一天 `0 0 L * *`', () => {
    expect(validateCron('0 0 L * *', '5-field')).toEqual({ valid: true })
  })

  it('合法：日字段使用 ? `0 0 ? * 1`', () => {
    expect(validateCron('0 0 ? * 1', '5-field')).toEqual({ valid: true })
  })

  it('非法：字段数不足', () => {
    const r = validateCron('* * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('expression')
  })

  it('非法：字段数过多（6 个 token）', () => {
    const r = validateCron('0 30 9 ? * MON-FRI', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('expression')
  })

  it('非法：空表达式', () => {
    const r = validateCron('', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('expression')
  })

  it('非法：分字段越界 60', () => {
    const r = validateCron('60 * * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('min')
  })

  it('非法：时字段越界 24', () => {
    const r = validateCron('0 24 * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('hour')
  })

  it('非法：日字段 0', () => {
    const r = validateCron('0 0 0 * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('day')
  })

  it('非法：月字段 13', () => {
    const r = validateCron('0 0 1 13 *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('month')
  })

  it('非法：周字段 8', () => {
    const r = validateCron('* * * * 8', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('week')
  })

  it('非法：在非日/周字段使用 ?', () => {
    const r = validateCron('? * * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('min')
  })

  it('非法：步长为 0', () => {
    const r = validateCron('*/0 * * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('min')
  })

  it('非法：范围起始大于结束', () => {
    const r = validateCron('10-5 * * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('min')
  })

  it('非法：在分字段使用 L', () => {
    const r = validateCron('L * * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('min')
  })

  it('非法：在分字段使用 W', () => {
    const r = validateCron('5W * * * *', '5-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('min')
  })
})

describe('validateCron - 6 段模式', () => {
  it('合法：`0 * * * * ?` 每分钟第 0 秒', () => {
    expect(validateCron('0 * * * * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：`0 0 8 * * ?` 每天 8 点', () => {
    expect(validateCron('0 0 8 * * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：`0 0 0 1 * ?` 每月 1 日 0 点', () => {
    expect(validateCron('0 0 0 1 * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：`0 */5 * * * ?` 每 5 分钟', () => {
    expect(validateCron('0 */5 * * * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：`30 * * * * ?` 每分钟第 30 秒', () => {
    expect(validateCron('30 * * * * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：周字段 `#` 修饰符 `0 0 0 ? * 6#3`', () => {
    expect(validateCron('0 0 0 ? * 6#3', '6-field')).toEqual({ valid: true })
  })

  it('合法：日字段 `W` 修饰符 `0 0 0 15W * ?`', () => {
    expect(validateCron('0 0 0 15W * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：日字段 `L` 修饰符 `0 0 0 L * ?`', () => {
    expect(validateCron('0 0 0 L * ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：周字段 `L` 修饰符 `0 0 0 ? * 6L`', () => {
    expect(validateCron('0 0 0 ? * 6L', '6-field')).toEqual({ valid: true })
  })

  it('合法：英文缩写小写 `0 0 0 ? * mon-fri`', () => {
    expect(validateCron('0 0 0 ? * mon-fri', '6-field')).toEqual({ valid: true })
  })

  it('合法：月份英文缩写 `0 0 0 1 JAN ?`', () => {
    expect(validateCron('0 0 0 1 JAN ?', '6-field')).toEqual({ valid: true })
  })

  it('合法：工作日模式 `0 30 9 ? * MON-FRI`', () => {
    expect(validateCron('0 30 9 ? * MON-FRI', '6-field')).toEqual({ valid: true })
  })

  it('非法：字段数不足（5 个 token）', () => {
    const r = validateCron('0 * * * *', '6-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('expression')
  })

  it('非法：秒字段 60', () => {
    const r = validateCron('60 * * * * ?', '6-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('sec')
  })

  it('非法：在周字段使用 W', () => {
    const r = validateCron('0 0 0 ? * 5W', '6-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('week')
  })

  it('非法：在日字段使用 #', () => {
    const r = validateCron('0 0 0 6#3 * ?', '6-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('day')
  })

  it('非法：# 后值越界 6', () => {
    const r = validateCron('0 0 0 ? * 6#6', '6-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('week')
  })

  it('非法：在秒字段使用 L', () => {
    const r = validateCron('L * * * * ?', '6-field')
    expect(r.valid).toBe(false)
    expect(r.errorField).toBe('sec')
  })
})

describe('explainCron - 5 段模式', () => {
  it('`* * * * *` → 每分钟执行', () => {
    expect(explainCron('* * * * *', '5-field')).toBe('每分钟执行')
  })

  it('`0 * * * *` → 每小时的第 0 分钟执行', () => {
    expect(explainCron('0 * * * *', '5-field')).toBe('每小时的第 0 分钟执行')
  })

  it('`30 * * * *` → 每小时的第 30 分钟执行', () => {
    expect(explainCron('30 * * * *', '5-field')).toBe('每小时的第 30 分钟执行')
  })

  it('`0 0 * * *` → 每天 00:00 执行', () => {
    expect(explainCron('0 0 * * *', '5-field')).toBe('每天 00:00 执行')
  })

  it('`0 1 * * *` → 每天 01:00 执行', () => {
    expect(explainCron('0 1 * * *', '5-field')).toBe('每天 01:00 执行')
  })

  it('`*/5 * * * *` → 每 5 分钟执行', () => {
    expect(explainCron('*/5 * * * *', '5-field')).toBe('每 5 分钟执行')
  })

  it('`0 0 1 * *` → 每月 1 日 00:00 执行', () => {
    expect(explainCron('0 0 1 * *', '5-field')).toBe('每月 1 日 00:00 执行')
  })

  it('`0 30 9 ? * MON-FRI` 非法（字段数不匹配）→ 表达式无效', () => {
    expect(explainCron('0 30 9 ? * MON-FRI', '5-field')).toBe(
      '表达式无效，无法生成解释',
    )
  })
})

describe('explainCron - 6 段模式', () => {
  it('`0 */5 * * * ?` → 每 5 分钟执行', () => {
    expect(explainCron('0 */5 * * * ?', '6-field')).toBe('每 5 分钟执行')
  })

  it('`0 0 8 * * ?` → 每天 08:00 执行（sec=0 省略秒）', () => {
    expect(explainCron('0 0 8 * * ?', '6-field')).toBe('每天 08:00 执行')
  })

  it('`0 0 0 1 * ?` → 每月 1 日 00:00:00 执行（每月模式含秒）', () => {
    expect(explainCron('0 0 0 1 * ?', '6-field')).toBe(
      '每月 1 日 00:00:00 执行',
    )
  })

  it('`0 0 * * * ?` → 每小时的第 0 分钟执行', () => {
    expect(explainCron('0 0 * * * ?', '6-field')).toBe(
      '每小时的第 0 分钟执行',
    )
  })

  it('`0 * * * * ?` → 每分钟的第 0 秒执行', () => {
    expect(explainCron('0 * * * * ?', '6-field')).toBe(
      '每分钟的第 0 秒执行',
    )
  })

  it('`0 30 * * * ?` → 每小时的第 30 分钟执行', () => {
    expect(explainCron('0 30 * * * ?', '6-field')).toBe(
      '每小时的第 30 分钟执行',
    )
  })

  it('`* * * * * ?` → 每秒执行', () => {
    expect(explainCron('* * * * * ?', '6-field')).toBe('每秒执行')
  })

  it('`0 30 9 ? * MON-FRI` → 每周一到周五 09:30 执行（工作日模式省略秒）', () => {
    expect(explainCron('0 30 9 ? * MON-FRI', '6-field')).toBe(
      '每周一到周五 09:30 执行',
    )
  })

  it('`0 0 0 15 * ?` → 每月 15 日 00:00:00 执行（每月模式含秒）', () => {
    expect(explainCron('0 0 0 15 * ?', '6-field')).toBe(
      '每月 15 日 00:00:00 执行',
    )
  })

  it('`0 30 0 1 * ?` → 每月 1 日 00:30:00 执行（每月非 0 点含秒）', () => {
    expect(explainCron('0 30 0 1 * ?', '6-field')).toBe(
      '每月 1 日 00:30:00 执行',
    )
  })
})

describe('getNextTriggerTimes', () => {
  it('返回数量等于请求数量', () => {
    const times = getNextTriggerTimes('* * * * *', '5-field', 5)
    expect(times).toHaveLength(5)
  })

  it('默认返回 10 个时间', () => {
    const times = getNextTriggerTimes('* * * * *', '5-field')
    expect(times).toHaveLength(10)
  })

  it('所有时间均在起始时间之后', () => {
    const from = new Date('2026-01-01T00:00:00Z')
    const times = getNextTriggerTimes('* * * * *', '5-field', 5, from)
    for (const t of times) {
      expect(t.getTime()).toBeGreaterThan(from.getTime())
    }
  })

  it('时间严格递增', () => {
    const times = getNextTriggerTimes('0 */5 * * * ?', '6-field', 10)
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!.getTime()).toBeGreaterThan(times[i - 1]!.getTime())
    }
  })

  it('`* * * * *` 5 段：相邻时间相差 1 分钟', () => {
    const from = new Date('2026-01-01T00:00:00Z')
    const times = getNextTriggerTimes('* * * * *', '5-field', 3, from)
    expect(times).toHaveLength(3)
    const diff1 = times[1]!.getTime() - times[0]!.getTime()
    const diff2 = times[2]!.getTime() - times[1]!.getTime()
    expect(diff1).toBe(60 * 1000)
    expect(diff2).toBe(60 * 1000)
  })

  it('`0 * * * *` 5 段：每小时第 0 分钟触发，相邻相差 1 小时', () => {
    const from = new Date('2026-01-01T00:30:00Z')
    const times = getNextTriggerTimes('0 * * * *', '5-field', 3, from)
    expect(times).toHaveLength(3)
    for (const t of times) {
      expect(t.getMinutes()).toBe(0)
    }
    const diff1 = times[1]!.getTime() - times[0]!.getTime()
    expect(diff1).toBe(3600 * 1000)
  })

  it('`0 0 * * * ?` 6 段：每小时第 0 分钟触发，相差 1 小时', () => {
    const from = new Date('2026-01-01T00:30:30Z')
    const times = getNextTriggerTimes('0 0 * * * ?', '6-field', 3, from)
    expect(times).toHaveLength(3)
    for (const t of times) {
      expect(t.getMinutes()).toBe(0)
      expect(t.getSeconds()).toBe(0)
    }
    const diff1 = times[1]!.getTime() - times[0]!.getTime()
    expect(diff1).toBe(3600 * 1000)
  })

  it('`0 0 0 * * ?` 6 段：每天 0 点触发，相差 1 天', () => {
    const from = new Date('2026-01-01T12:00:00Z')
    const times = getNextTriggerTimes('0 0 0 * * ?', '6-field', 3, from)
    expect(times).toHaveLength(3)
    for (const t of times) {
      expect(t.getHours()).toBe(0)
      expect(t.getMinutes()).toBe(0)
      expect(t.getSeconds()).toBe(0)
    }
    const diff1 = times[1]!.getTime() - times[0]!.getTime()
    expect(diff1).toBe(24 * 3600 * 1000)
  })

  it('`0 */5 * * * ?` 6 段：每 5 分钟触发', () => {
    const from = new Date('2026-01-01T00:00:30Z')
    const times = getNextTriggerTimes('0 */5 * * * ?', '6-field', 3, from)
    expect(times).toHaveLength(3)
    const diff1 = times[1]!.getTime() - times[0]!.getTime()
    expect(diff1).toBe(5 * 60 * 1000)
  })

  it('无效表达式返回空数组', () => {
    expect(getNextTriggerTimes('invalid', '5-field', 5)).toEqual([])
  })

  it('5 段 `0 * * * *` 触发时间秒数为 0', () => {
    const from = new Date('2026-01-01T12:34:56Z')
    const times = getNextTriggerTimes('0 * * * *', '5-field', 3, from)
    for (const t of times) {
      expect(t.getSeconds()).toBe(0)
    }
  })

  it('`0 0 0 1 * ?` 每月 1 日触发', () => {
    const from = new Date('2026-01-15T00:00:00Z')
    const times = getNextTriggerTimes('0 0 0 1 * ?', '6-field', 3, from)
    expect(times).toHaveLength(3)
    for (const t of times) {
      expect(t.getDate()).toBe(1)
      expect(t.getHours()).toBe(0)
      expect(t.getMinutes()).toBe(0)
    }
  })

  it('`0 30 9 ? * MON-FRI` 仅工作日触发（6 段）', () => {
    const from = new Date('2026-01-01T00:00:00Z') // 周四
    const times = getNextTriggerTimes('0 30 9 ? * MON-FRI', '6-field', 5, from)
    expect(times).toHaveLength(5)
    for (const t of times) {
      const w = t.getDay()
      expect(w).toBeGreaterThanOrEqual(1)
      expect(w).toBeLessThanOrEqual(5)
      expect(t.getHours()).toBe(9)
      expect(t.getMinutes()).toBe(30)
    }
  })
})

describe('getFieldInfos', () => {
  it('5 段模式返回 5 个字段', () => {
    const infos = getFieldInfos('5-field')
    expect(infos).toHaveLength(5)
    expect(infos.map((i) => i.label)).toEqual(['分', '时', '日', '月', '周'])
  })

  it('6 段模式返回 6 个字段', () => {
    const infos = getFieldInfos('6-field')
    expect(infos).toHaveLength(6)
    expect(infos.map((i) => i.label)).toEqual([
      '秒',
      '分',
      '时',
      '日',
      '月',
      '周',
    ])
  })

  it('字段 min/max 符合预期', () => {
    const infos = getFieldInfos('6-field')
    const [sec, min, hour, day, month, week] = infos
    expect(sec).toEqual({ label: '秒', min: 0, max: 59 })
    expect(min).toEqual({ label: '分', min: 0, max: 59 })
    expect(hour).toEqual({ label: '时', min: 0, max: 23 })
    expect(day).toEqual({ label: '日', min: 1, max: 31 })
    expect(month).toEqual({ label: '月', min: 1, max: 12 })
    expect(week).toEqual({ label: '周', min: 0, max: 7 })
  })
})

describe('CronMode 类型', () => {
  it('类型联合包含两个成员', () => {
    const a: CronMode = '5-field'
    const b: CronMode = '6-field'
    expect(a).toBe('5-field')
    expect(b).toBe('6-field')
  })
})
