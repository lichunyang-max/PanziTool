/**
 * mockData.ts - Mock 随机数据生成纯函数
 *
 * 批量生成手机号、姓名、地址、邮箱、身份证号、日期、金额、随机字符串等模拟数据，
 * 支持 JSON / CSV / SQL 三种输出格式。身份证号按 GB 11643 规则随机生成并通过
 * ISO 7064 MOD 11-2 校验位计算，可通过前端格式校验但纯属虚构。
 *
 * 所有函数为纯函数，无 DOM 依赖，可在 SSR 与测试环境运行。
 * 忠实移植自 panziui/tools/mock-data.html 内联脚本。
 */

/** 字段类型 */
export type MockField =
  | 'name'
  | 'phone'
  | 'email'
  | 'idcard'
  | 'address'
  | 'date'
  | 'amount'
  | 'token'

/** 输出格式 */
export type MockFormat = 'json' | 'csv' | 'sql'

/** 操作结果 */
export interface MockResult {
  success: boolean
  output?: string
  error?: string
}

/** 字段中文标签 */
export const MOCK_FIELD_LABELS: Record<MockField, string> = {
  name: '姓名',
  phone: '手机号',
  email: '邮箱',
  idcard: '身份证号',
  address: '地址',
  date: '日期',
  amount: '金额',
  token: '随机字符串',
}

/** SQL 输出使用的字段名 */
const MOCK_FIELD_DB: Record<MockField, string> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  idcard: 'id_card',
  address: 'address',
  date: 'birth_date',
  amount: 'amount',
  token: 'token',
}

/** 字段配置（供 UI 渲染复选框，默认勾选 name/phone/email） */
export const MOCK_FIELD_OPTIONS: {
  value: MockField
  label: string
  checked: boolean
}[] = [
  { value: 'name', label: '姓名', checked: true },
  { value: 'phone', label: '手机号', checked: true },
  { value: 'email', label: '邮箱', checked: true },
  { value: 'idcard', label: '身份证号', checked: false },
  { value: 'address', label: '地址', checked: false },
  { value: 'date', label: '日期', checked: false },
  { value: 'amount', label: '金额', checked: false },
  { value: 'token', label: '随机字符串', checked: false },
]

/** 输出格式选项 */
export const MOCK_FORMAT_OPTIONS: { value: MockFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'sql', label: 'SQL' },
]

// ---------- 随机基础 ----------
function rnd(n: number): number {
  return Math.floor(Math.random() * n)
}

function pick<T>(arr: T[]): T {
  return arr[rnd(arr.length)]
}

// ---------- 各字段生成器 ----------
const SURNAMES = [
  '张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马',
  '朱', '胡', '郭', '何', '林', '罗', '高', '郑', '梁', '谢', '宋', '唐', '韩',
  '冯', '邓', '曹', '彭',
]
const GIVEN_1 = [
  '伟', '芳', '娜', '敏', '静', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛',
  '明', '超', '秀英', '霞', '平', '刚', '桂英', '鑫', '浩', '宇', '欣', '怡', '子',
  '雨', '晨', '思', '梦',
]
const GIVEN_2 = [
  '婷', '轩', '涵', '琪', '睿', '辰', '逸', '然', '泽', '宁', '乐', '安', '一',
  '凡', '清', '云', '岚', '溪', '可', '心', '', '', '', '',
]

function mockName(): string {
  let name = pick(SURNAMES) + pick(GIVEN_1)
  if (Math.random() < 0.5) name += pick(GIVEN_2)
  return name
}

function mockPhone(): string {
  const second = 3 + rnd(7) // 3-9
  let tail = ''
  for (let i = 0; i < 9; i++) tail += rnd(10)
  return '1' + second + tail
}

const PINYIN = [
  'wang', 'li', 'zhang', 'liu', 'chen', 'yang', 'huang', 'zhao', 'wu', 'zhou',
  'xu', 'sun', 'lin', 'he', 'guo', 'gao',
]
const EMAIL_DOMAINS = [
  'qq.com', '163.com', '126.com', 'example.com', 'gmail.com', 'outlook.com',
]

function mockEmail(): string {
  return pick(PINYIN) + (100 + rnd(9900)) + '@' + pick(EMAIL_DOMAINS)
}

// 身份证：地区码 + 出生日期 + 顺序码 + 校验位（ISO 7064 MOD 11-2）
const AREA_CODES = [
  '110101', '110105', '310101', '310104', '440103', '440304', '440305', '330102',
  '320102', '510104', '420102', '610102', '370202', '500103', '120101', '500101',
  '350203', '430102',
]
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CHECK = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

function mockIdCard(): string {
  const area = pick(AREA_CODES)
  const year = 1970 + rnd(36)
  const month = 1 + rnd(12)
  const day = 1 + rnd(28)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const seq = String(100 + rnd(900)) // 3位顺序码
  const body = area + year + mm + dd + seq
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += Number.parseInt(body[i], 10) * ID_WEIGHTS[i]
  }
  return body + ID_CHECK[sum % 11]
}

const PROVINCES = [
  '北京市', '上海市', '广东省广州市', '浙江省杭州市', '江苏省南京市', '四川省成都市',
  '湖北省武汉市', '山东省青岛市', '福建省厦门市', '湖南省长沙市',
]
const ROADS = [
  '人民路', '中山路', '解放大道', '建设路', '和平街', '科技大道', '幸福路', '朝阳路',
  '文化路', '滨江道',
]

function mockAddress(): string {
  return (
    pick(PROVINCES) +
    pick(ROADS) +
    (1 + rnd(999)) +
    '号' +
    (1 + rnd(30)) +
    '单元' +
    (101 + rnd(900))
  )
}

function mockDate(): string {
  const start = Date.UTC(1970, 0, 1)
  const end = Date.UTC(2005, 11, 31)
  const t = new Date(start + Math.floor(Math.random() * (end - start)))
  const y = t.getUTCFullYear()
  const m = String(t.getUTCMonth() + 1).padStart(2, '0')
  const d = String(t.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function mockAmount(): string {
  return (Math.random() * 99999.99 + 0.01).toFixed(2)
}

const TOKEN_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function mockToken(): string {
  let s = ''
  for (let i = 0; i < 16; i++) s += TOKEN_CHARS[rnd(TOKEN_CHARS.length)]
  return s
}

const MOCK_GENERATORS: Record<MockField, () => string> = {
  name: mockName,
  phone: mockPhone,
  email: mockEmail,
  idcard: mockIdCard,
  address: mockAddress,
  date: mockDate,
  amount: mockAmount,
  token: mockToken,
}

/**
 * 生成数据行（不渲染）。
 *
 * @param fields 已勾选字段列表
 * @param count  生成数量
 * @returns 行数组，每行为字段值映射；数量为 0 时返回空数组
 */
export function generateMockRows(
  fields: MockField[],
  count: number,
): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  for (let i = 0; i < count; i++) {
    const row: Record<string, string> = {}
    fields.forEach((f) => {
      row[f] = MOCK_GENERATORS[f]()
    })
    rows.push(row)
  }
  return rows
}

/**
 * 渲染数据为指定格式字符串。
 *
 * @param rows   数据行
 * @param fields 字段顺序
 * @param format json / csv / sql
 * @returns 渲染结果文本
 */
export function renderMock(
  rows: Record<string, string>[],
  fields: MockField[],
  format: MockFormat,
): string {
  if (rows.length === 0) return ''

  if (format === 'json') {
    const list = rows.map((row) => {
      const obj: Record<string, string> = {}
      fields.forEach((f) => {
        obj[f] = row[f]
      })
      return JSON.stringify(obj)
    })
    return '[\n' + list.map((s) => '  ' + s).join(',\n') + '\n]'
  }

  if (format === 'csv') {
    const header = fields.map((f) => MOCK_FIELD_LABELS[f]).join(',')
    const lines = rows.map((row) => fields.map((f) => row[f]).join(','))
    return [header].concat(lines).join('\n')
  }

  // SQL
  const cols = fields.map((f) => MOCK_FIELD_DB[f]).join(', ')
  const values = rows.map((row) => {
    const vals = fields.map((f) => {
      const v = String(row[f]).replace(/'/g, "''")
      return `'${v}'`
    })
    return `INSERT INTO mock_data (${cols}) VALUES (${vals.join(', ')});`
  })
  return values.join('\n')
}

/**
 * 生成并渲染 Mock 数据（主入口）。
 *
 * @param fields 已勾选字段列表
 * @param count  生成数量（1-500）
 * @param format json / csv / sql
 * @returns 成功返回 { success: true, output }，参数非法返回中文错误
 */
export function generateMockData(
  fields: MockField[],
  count: number,
  format: MockFormat,
): MockResult {
  if (fields.length === 0) {
    return { success: false, error: '请至少勾选一个字段' }
  }
  if (!Number.isFinite(count) || count < 0) {
    return { success: false, error: '生成数量必须为非负数' }
  }
  if (count === 0) {
    return { success: true, output: '' }
  }
  if (count > 500) {
    return { success: false, error: '生成数量必须在 1-500 之间' }
  }

  try {
    const rows = generateMockRows(fields, count)
    return { success: true, output: renderMock(rows, fields, format) }
  } catch (err) {
    return {
      success: false,
      error: `生成失败：${err instanceof Error ? err.message : '未知错误'}`,
    }
  }
}
