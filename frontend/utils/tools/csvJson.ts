/**
 * csvJson.ts - CSV 与 JSON 互转纯函数
 *
 * 忠实移植自 panziui/tools/csv-json-convert.html 的内联脚本：
 * - parseCsv：状态机解析 CSV，正确处理引号内分隔符 / 换行 / 转义引号（""）
 * - autoType：将纯数字、布尔值自动转换为对应类型（超长数字保持文本）
 * - csvToJson：CSV → JSON 数组（首行表头），输出为格式化 JSON 字符串
 * - jsonToCsv：JSON 对象数组 → CSV（合并所有键作表头，含特殊字符自动加引号转义）
 *
 * 遵循 RFC 4180：值中含分隔符、双引号或换行时用双引号包裹，内部双引号转义为 ""。
 */
export interface CsvJsonResult {
  success: boolean
  output?: string
  error?: string
}

/** CSV 分隔符 */
export type Delimiter = ',' | ';' | '\t'

/**
 * 解析 CSV 文本为二维数组
 *
 * 状态机扫描，正确处理引号包裹字段内的分隔符、换行与转义引号（""）。
 * 完全空的行会被过滤。
 *
 * @param text CSV 文本
 * @param delimiter 分隔符
 */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        } // 转义引号
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === delimiter) {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r') {
      i++
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += ch
    i++
  }
  // 最后一行
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

/**
 * 将单元格值自动转换为自然类型
 *
 * - 纯整数：转 Number，超长数字（如手机号）保持文本
 * - 小数：转 Number
 * - "true" / "false"：转 Boolean
 * - 其余：保持字符串
 */
function autoType(v: string): string | number | boolean {
  if (v === '') return ''
  if (/^-?\d+$/.test(v)) {
    const n = Number(v)
    if (String(n) === v && Math.abs(n) <= Number.MAX_SAFE_INTEGER) return n
    return v
  }
  if (/^-?\d+\.\d+$/.test(v)) return Number(v)
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

/**
 * 将 CSV 转换为格式化 JSON 字符串
 *
 * 第一行作为表头，后续每行转为对象。空表头会被 trim。
 *
 * @param input CSV 文本
 * @param delimiter 分隔符，默认逗号
 * @returns JSON 字符串结果，失败时返回 error 信息
 */
export function csvToJson(
  input: string,
  delimiter: Delimiter = ',',
): CsvJsonResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    const rows = parseCsv(input, delimiter)
    if (rows.length < 2) {
      return { success: false, error: 'CSV 至少需要表头一行 + 数据一行' }
    }
    const header = rows[0].map((h) => h.trim())
    const arr = rows.slice(1).map((r) => {
      const obj: Record<string, string | number | boolean> = {}
      header.forEach((h, idx) => {
        obj[h] = autoType(r[idx] !== undefined ? r[idx] : '')
      })
      return obj
    })
    return { success: true, output: JSON.stringify(arr, null, 2) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: `CSV 解析失败：${msg}` }
  }
}

/** 将单元格值转为 CSV 安全字符串（含分隔符/引号/换行时加引号转义） */
function escapeCell(v: unknown): string {
  let s: string
  if (v === null || v === undefined) s = ''
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/**
 * 将 JSON 对象数组转换为 CSV 字符串
 *
 * 扫描整个数组，把所有出现过的键按出现顺序合并为表头；某对象缺少的键对应单元格留空。
 * 仅支持对象数组，嵌套对象/数组会被序列化为 JSON 字符串放入单元格。
 *
 * @param input JSON 文本（必须为对象数组）
 * @returns CSV 字符串结果，失败时返回 error 信息
 */
export function jsonToCsv(input: string): CsvJsonResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: `JSON 解析失败：${msg}` }
  }
  if (!Array.isArray(data)) {
    return {
      success: false,
      error: '输入必须是 JSON 数组，例如 [{"name":"张三"}]',
    }
  }
  if (data.length === 0) {
    return { success: false, error: 'JSON 数组为空，无法生成表头' }
  }
  const header: string[] = []
  for (const item of data) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return {
        success: false,
        error: '数组元素必须是对象，如 {"name":"张三"}',
      }
    }
    for (const k of Object.keys(item as Record<string, unknown>)) {
      if (header.indexOf(k) === -1) header.push(k)
    }
  }
  const lines = [header.map(escapeCell).join(',')]
  for (const item of data) {
    const rec = item as Record<string, unknown>
    lines.push(header.map((h) => escapeCell(rec[h])).join(','))
  }
  return { success: true, output: lines.join('\n') }
}
