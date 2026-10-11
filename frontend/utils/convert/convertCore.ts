/**
 * convertCore.ts - 换算工具共享核心
 *
 * 供 convert 分类的单位换算工具共用：
 * - 单位/分组类型定义（支持线性系数与温度类偏移函数）
 * - 统一的数值格式化（小数位数 / 输出格式 / 千分位）
 */

export interface ConvertUnit {
  /** 单位中文名 */
  name: string
  /** 单位符号或补充说明 */
  symbol: string
  /** 原始值 → 基准值：线性系数，或温度类转换函数 */
  toBase: number | ((v: number) => number)
  /** 基准值 → 原始值；省略时对线性系数取倒数，函数单位必须提供 */
  fromBase?: (v: number) => number
}

export interface ConvertGroup {
  /** 分组标题，如「公制」「英制」 */
  title: string
  units: ConvertUnit[]
}

export type DecimalMode = 'auto' | 0 | 2 | 4 | 6 | 8
export type OutputStyle = 'plain' | 'scientific' | 'thousand'

/** 单位原始值 ↔ 基准值互转 */
export function unitToBase(unit: ConvertUnit, v: number): number {
  return typeof unit.toBase === 'function' ? unit.toBase(v) : v * unit.toBase
}

export function unitFromBase(unit: ConvertUnit, base: number): number {
  if (unit.fromBase) return unit.fromBase(base)
  if (typeof unit.toBase === 'function') return base
  return base / unit.toBase
}

/** 源单位值 → 目标单位值 */
export function convertUnitValue(
  source: ConvertUnit,
  target: ConvertUnit,
  value: number,
): number {
  return unitFromBase(target, unitToBase(source, value))
}

/**
 * 按设置格式化换算结果
 * - decimals='auto'：保留 7 位有效数字并去掉尾随零
 * - style='scientific'：指数记法（始终 7 位有效数字）
 * - style='thousand'：整数部分千分位逗号分隔
 */
export function formatConvertValue(
  v: number,
  decimals: DecimalMode,
  style: OutputStyle,
): string {
  if (!isFinite(v)) return '—'
  if (style === 'scientific') {
    if (v === 0) return '0'
    return v.toExponential(6).replace('e', 'e')
  }

  let s: string
  if (decimals === 'auto') {
    if (v === 0) s = '0'
    else {
      s = String(Number(v.toPrecision(7)))
    }
  } else {
    s = v.toFixed(decimals)
  }

  if (style === 'thousand') {
    const neg = s.startsWith('-')
    if (neg) s = s.slice(1)
    const [int, frac] = s.split('.')
    s = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac !== undefined ? '.' + frac : '')
    if (neg) s = '-' + s
  }
  return s
}

/** 从输入字符串解析数值（容忍逗号分隔） */
export function parseConvertInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return isFinite(n) ? n : null
}
