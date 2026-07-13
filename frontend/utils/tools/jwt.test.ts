/**
 * jwt.test.ts - JWT 解码纯函数单元测试
 *
 * 测试覆盖：
 * - 合法 JWT 解析（Header + Payload + Signature）
 * - exp/iat 转可读时间
 * - base64url 解码
 * - 非法 JWT（少于3段）
 * - 非法 base64url
 * - 非法 JSON payload
 * - 空 token
 */
import { describe, expect, it } from 'vitest'
import { base64UrlDecode, decodeJwt, formatTimestamp } from './jwt'

// === 测试用 JWT 示例 ===

// 合法 JWT（HS256，含 iat，不含 exp）
// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

// 合法 JWT（HS256，含 iat 和 exp，exp 在远期未来）
// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022,"exp":9752345678}
const SAMPLE_JWT_WITH_EXP =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk3NTIzNDU2Nzh9.jND5T1q3GFlvRDXm3V6KNqg8Zq5jvBmCZ_iIqjB4HMI'

// === 辅助函数 ===

/**
 * 将字符串编码为 Base64URL（测试辅助）
 *
 * 使用 TextEncoder 正确处理 UTF-8 多字节字符，
 * 因为 btoa() 仅支持 Latin1 字符（码点 0-255）。
 */
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// === base64UrlDecode 测试 ===

describe('base64UrlDecode', () => {
  it('应正确解码标准 Base64URL 字符串', () => {
    // "hello" -> Base64URL: "aGVsbG8"
    expect(base64UrlDecode('aGVsbG8')).toBe('hello')
  })

  it('应将 URL 安全字符 - 和 _ 转换为 + 和 /', () => {
    // "???" -> Base64: "Pz8/" -> Base64URL: "Pz8_"（_ 替换 /）
    expect(base64UrlDecode('Pz8_')).toBe('???')
    // "~~~~" -> Base64URL 含 - 字符
    const encoded = toBase64Url('~~~~')
    expect(base64UrlDecode(encoded)).toBe('~~~~')
  })

  it('应正确处理需要补齐 padding 的字符串', () => {
    // "Hi" -> Base64: "SGk=" -> Base64URL: "SGk"（去除 padding）
    expect(base64UrlDecode('SGk')).toBe('Hi')
    // "H" -> Base64: "SA==" -> Base64URL: "SA"
    expect(base64UrlDecode('SA')).toBe('H')
  })

  it('应正确解码 UTF-8 多字节字符', () => {
    const encoded = toBase64Url('你好世界')
    expect(base64UrlDecode(encoded)).toBe('你好世界')
  })

  it('应正确解码 JWT header 段', () => {
    // SAMPLE_JWT 的 header 段
    const headerSegment = SAMPLE_JWT.split('.')[0]
    const decoded = base64UrlDecode(headerSegment)
    expect(JSON.parse(decoded)).toEqual({ alg: 'HS256', typ: 'JWT' })
  })

  it('应正确解码 JWT payload 段', () => {
    const payloadSegment = SAMPLE_JWT.split('.')[1]
    const decoded = base64UrlDecode(payloadSegment)
    const parsed = JSON.parse(decoded)
    expect(parsed.sub).toBe('1234567890')
    expect(parsed.name).toBe('John Doe')
    expect(parsed.iat).toBe(1516239022)
  })

  it('应在遇到非法 Base64 字符时抛出异常', () => {
    // 包含非 Base64 字符 "!" 和空格
    expect(() => base64UrlDecode('!!!invalid!!!')).toThrow()
  })
})

// === formatTimestamp 测试 ===

describe('formatTimestamp', () => {
  it('应将 Unix 时间戳格式化为 YYYY-MM-DD HH:mm:ss', () => {
    const result = formatTimestamp(1516239022)
    // 验证格式
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('应正确处理 epoch 零点', () => {
    const result = formatTimestamp(0)
    // 验证格式（时间部分取决于本地时区，UTC+8 为 08:00:00）
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    // epoch 0 对应 1970 年
    expect(result).toContain('1970-')
  })
})

// === decodeJwt 测试 - 合法 JWT ===

describe('decodeJwt - 合法 JWT 解析', () => {
  it('应成功解析合法 JWT 并返回三段内容', () => {
    const result = decodeJwt(SAMPLE_JWT)
    expect(result.success).toBe(true)
    expect(result.parts).toBeDefined()
  })

  it('应正确解析 Header 对象', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const parts = result.parts!
    expect(parts.headerObj.alg).toBe('HS256')
    expect(parts.headerObj.typ).toBe('JWT')
  })

  it('应正确解析 Payload 对象', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const parts = result.parts!
    expect(parts.payloadObj.sub).toBe('1234567890')
    expect(parts.payloadObj.name).toBe('John Doe')
    expect(parts.payloadObj.iat).toBe(1516239022)
  })

  it('应正确提取 Signature 原始字符串', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const parts = result.parts!
    expect(parts.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
  })

  it('应返回美化后的 JSON header 字符串', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const header = result.parts!.header
    expect(header).toContain('"alg": "HS256"')
    expect(header).toContain('"typ": "JWT"')
    // 美化后的 JSON 应包含换行
    expect(header).toContain('\n')
  })

  it('应返回美化后的 JSON payload 字符串', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const payload = result.parts!.payload
    expect(payload).toContain('"sub": "1234567890"')
    expect(payload).toContain('"name": "John Doe"')
    expect(payload).toContain('"iat": 1516239022')
  })

  it('应正确提取签名算法', () => {
    const result = decodeJwt(SAMPLE_JWT)
    expect(result.parts!.algo).toBe('HS256')
  })

  it('应正确提取令牌类型', () => {
    const result = decodeJwt(SAMPLE_JWT)
    expect(result.parts!.type).toBe('JWT')
  })

  it('应正确计算各段长度和总长度', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const parts = result.parts!
    const segments = SAMPLE_JWT.split('.')

    expect(parts.headerLength).toBe(segments[0].length)
    expect(parts.payloadLength).toBe(segments[1].length)
    expect(parts.signatureLength).toBe(segments[2].length)
    // 总长度 = header + payload + signature + 2（两个点）
    expect(parts.totalLength).toBe(
      parts.headerLength + parts.payloadLength + parts.signatureLength + 2,
    )
    // 总长度应等于原始 token 长度
    expect(parts.totalLength).toBe(SAMPLE_JWT.length)
  })
})

// === decodeJwt 测试 - exp/iat 可读时间 ===

describe('decodeJwt - exp/iat 可读时间转换', () => {
  it('应将 iat 转换为可读时间', () => {
    const result = decodeJwt(SAMPLE_JWT)
    const parts = result.parts!
    expect(parts.iatReadable).toBeDefined()
    expect(parts.iatReadable).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    // 验证时间值正确（与 formatTimestamp 一致）
    expect(parts.iatReadable).toBe(formatTimestamp(1516239022))
  })

  it('应将 exp 转换为可读时间', () => {
    const result = decodeJwt(SAMPLE_JWT_WITH_EXP)
    const parts = result.parts!
    expect(parts.expReadable).toBeDefined()
    expect(parts.expReadable).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(parts.expReadable).toBe(formatTimestamp(9752345678))
  })

  it('当 payload 不含 exp 时 expReadable 应为 undefined', () => {
    const result = decodeJwt(SAMPLE_JWT)
    expect(result.parts!.expReadable).toBeUndefined()
  })

  it('当 payload 不含 iat 时 iatReadable 应为 undefined', () => {
    // 构造一个不含 iat 的 JWT
    // Header: {"alg":"HS256","typ":"JWT"}
    // Payload: {"sub":"1234567890"}
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = toBase64Url(JSON.stringify({ sub: '1234567890' }))
    const token = `${header}.${payload}.signature`
    const result = decodeJwt(token)
    expect(result.parts!.iatReadable).toBeUndefined()
    expect(result.parts!.expReadable).toBeUndefined()
  })
})

// === decodeJwt 测试 - 非法输入 ===

describe('decodeJwt - 非法输入处理', () => {
  it('应拒绝空字符串', () => {
    const result = decodeJwt('')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.parts).toBeUndefined()
  })

  it('应拒绝仅含空白字符的 token', () => {
    const result = decodeJwt('   \n\t  ')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('应拒绝少于三段的 JWT（两段）', () => {
    const result = decodeJwt('abc.def')
    expect(result.success).toBe(false)
    expect(result.error).toContain('三段')
  })

  it('应拒绝多于三段的 JWT（四段）', () => {
    const result = decodeJwt('a.b.c.d')
    expect(result.success).toBe(false)
    expect(result.error).toContain('三段')
  })

  it('应拒绝只有一段的 JWT', () => {
    const result = decodeJwt('justonestring')
    expect(result.success).toBe(false)
    expect(result.error).toContain('三段')
  })

  it('应拒绝含空段的 JWT', () => {
    const result = decodeJwt('..signature')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('应拒绝非法 base64url 的 Header', () => {
    // Header 段包含非法字符
    const result = decodeJwt('!!!invalid!!!.eyJzdWIiOiIxMjMifQ.signature')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Header')
  })

  it('应拒绝非法 base64url 的 Payload', () => {
    // 合法 Header，非法 Payload
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const result = decodeJwt(`${header}.!!!invalid!!!.signature`)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Payload')
  })

  it('应拒绝合法 base64url 但非法 JSON 的 Payload', () => {
    // "notjson" 是合法的 Base64URL 解码结果，但不是合法 JSON
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const invalidPayload = toBase64Url('notjson')
    const result = decodeJwt(`${header}.${invalidPayload}.signature`)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Payload')
  })

  it('应拒绝合法 base64url 但非法 JSON 的 Header', () => {
    // 合法 Base64URL 但非法 JSON
    const invalidHeader = toBase64Url('notjson')
    const payload = toBase64Url(JSON.stringify({ sub: '123' }))
    const result = decodeJwt(`${invalidHeader}.${payload}.signature`)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Header')
  })
})

// === decodeJwt 测试 - 边界情况 ===

describe('decodeJwt - 边界情况', () => {
  it('应正确处理含前后空白的 JWT', () => {
    const result = decodeJwt(`  ${SAMPLE_JWT}  \n`)
    expect(result.success).toBe(true)
    expect(result.parts!.algo).toBe('HS256')
  })

  it('当 header 不含 alg 字段时 algo 应为 "未知"', () => {
    const header = toBase64Url(JSON.stringify({ typ: 'JWT' }))
    const payload = toBase64Url(JSON.stringify({ sub: '123' }))
    const token = `${header}.${payload}.signature`
    const result = decodeJwt(token)
    expect(result.success).toBe(true)
    expect(result.parts!.algo).toBe('未知')
  })

  it('当 header 不含 typ 字段时 type 应默认为 "JWT"', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'HS256' }))
    const payload = toBase64Url(JSON.stringify({ sub: '123' }))
    const token = `${header}.${payload}.signature`
    const result = decodeJwt(token)
    expect(result.success).toBe(true)
    expect(result.parts!.type).toBe('JWT')
  })

  it('当 header 含 enc 字段时 type 应为 "JWE (加密)"', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'dir', enc: 'A128GCM' }))
    const payload = toBase64Url(JSON.stringify({ sub: '123' }))
    const token = `${header}.${payload}.signature`
    const result = decodeJwt(token)
    expect(result.success).toBe(true)
    expect(result.parts!.type).toBe('JWE (加密)')
  })

  it('应正确处理含特殊字符 name 的 Payload', () => {
    // Payload 含 Unicode 字符
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = toBase64Url(
      JSON.stringify({ name: '张三', role: '管理员' }),
    )
    const token = `${header}.${payload}.signature`
    const result = decodeJwt(token)
    expect(result.success).toBe(true)
    expect(result.parts!.payloadObj.name).toBe('张三')
    expect(result.parts!.payloadObj.role).toBe('管理员')
  })
})
