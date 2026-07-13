/**
 * jwt.ts - JWT 解码纯函数
 *
 * 功能：
 * - base64UrlDecode: Base64URL 字符串解码为 UTF-8 字符串
 * - decodeJwt: 解析 JWT 令牌，返回 Header/Payload/Signature 三段信息
 *
 * 安全说明：
 * - 本工具仅解码不验签，签名验证需要密钥
 * - 所有解码在浏览器本地完成，不上传服务器
 * - Payload 是 Base64URL 编码而非加密，任何人都能解码查看
 */

/**
 * JWT 解析结果各字段
 */
export interface JwtParts {
  /** JSON 美化后的 header 字符串 */
  header: string
  /** JSON 美化后的 payload 字符串 */
  payload: string
  /** 签名原始字符串（Base64URL 编码） */
  signature: string
  /** 解析后的 header 对象 */
  headerObj: Record<string, unknown>
  /** 解析后的 payload 对象 */
  payloadObj: Record<string, unknown>
  /** 签名算法（如 HS256） */
  algo: string
  /** 令牌类型（如 JWT） */
  type: string
  /** Header 段字符长度 */
  headerLength: number
  /** Payload 段字符长度 */
  payloadLength: number
  /** Signature 段字符长度 */
  signatureLength: number
  /** 令牌总字符长度（含两个点分隔符） */
  totalLength: number
  /** exp 声明转可读时间（YYYY-MM-DD HH:mm:ss） */
  expReadable?: string
  /** iat 声明转可读时间（YYYY-MM-DD HH:mm:ss） */
  iatReadable?: string
}

/**
 * decodeJwt 返回类型
 */
export interface DecodeJwtResult {
  success: boolean
  parts?: JwtParts
  error?: string
}

/**
 * 将 Unix 时间戳（秒）格式化为可读的本地时间字符串
 *
 * @param ts - Unix 时间戳（秒）
 * @returns 格式化后的时间字符串，如 "2018-01-18 09:30:22"
 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Base64URL 解码函数
 *
 * 将 Base64URL 编码的字符串解码为 UTF-8 字符串。
 * 处理步骤：
 * 1. 将 URL 安全字符 - 替换为 +，_ 替换为 /
 * 2. 补齐 Base64 padding（=）
 * 3. 解码为二进制字符串
 * 4. 转换为 UTF-8 字符串
 *
 * @param str - Base64URL 编码的字符串
 * @returns 解码后的 UTF-8 字符串
 * @throws 当输入不是合法的 Base64 字符串时抛出异常
 */
export function base64UrlDecode(str: string): string {
  // 将 URL 安全字符替换为标准 Base64 字符
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')

  // 补齐 padding（Base64 长度必须是 4 的倍数）
  const pad = base64.length % 4
  if (pad) {
    base64 += '='.repeat(4 - pad)
  }

  // 解码 Base64 为二进制字符串
  const binaryString = atob(base64)

  // 将二进制字符串转换为 UTF-8 字符串
  // 使用 TextDecoder 正确处理多字节 UTF-8 字符
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * 解析 JWT 令牌
 *
 * 将 JWT 令牌解码为 Header、Payload、Signature 三段信息。
 * 仅解码不验签，不涉及任何网络请求。
 *
 * @param token - JWT 令牌字符串（格式：xxxxx.yyyyy.zzzzz）
 * @returns 解析结果，包含 success 标志和 parts 或 error 信息
 */
export function decodeJwt(token: string): DecodeJwtResult {
  // 空值检查
  if (!token || !token.trim()) {
    return { success: false, error: '请输入JWT令牌' }
  }

  const trimmed = token.trim()
  const segments = trimmed.split('.')

  // 段数检查：JWT 必须由三段组成
  if (segments.length !== 3) {
    return {
      success: false,
      error: 'JWT格式错误：令牌必须由三段用点(.)分隔的Base64URL字符串组成',
    }
  }

  const [headerRaw, payloadRaw, signatureRaw] = segments

  // 空段检查
  if (!headerRaw || !payloadRaw || !signatureRaw) {
    return { success: false, error: 'JWT格式错误：三段内容不能为空' }
  }

  // 解码 Header
  let headerObj: Record<string, unknown>
  try {
    const headerStr = base64UrlDecode(headerRaw)
    headerObj = JSON.parse(headerStr)
  } catch {
    return {
      success: false,
      error: 'Header解码失败：无效的Base64URL或JSON格式',
    }
  }

  // 解码 Payload
  let payloadObj: Record<string, unknown>
  try {
    const payloadStr = base64UrlDecode(payloadRaw)
    payloadObj = JSON.parse(payloadStr)
  } catch {
    return {
      success: false,
      error: 'Payload解码失败：无效的Base64URL或JSON格式',
    }
  }

  // 提取签名算法
  const algo = (headerObj.alg as string) || '未知'

  // 检测令牌类型
  let type = 'JWT'
  if (headerObj.enc) {
    type = 'JWE (加密)'
  } else if (headerObj.typ) {
    type = String(headerObj.typ).toUpperCase()
  }

  // 计算各段长度
  const headerLength = headerRaw.length
  const payloadLength = payloadRaw.length
  const signatureLength = signatureRaw.length
  const totalLength = headerLength + payloadLength + signatureLength + 2 // +2 为两个点分隔符

  // 美化 JSON 输出
  const header = JSON.stringify(headerObj, null, 2)
  const payload = JSON.stringify(payloadObj, null, 2)

  const parts: JwtParts = {
    header,
    payload,
    signature: signatureRaw,
    headerObj,
    payloadObj,
    algo,
    type,
    headerLength,
    payloadLength,
    signatureLength,
    totalLength,
  }

  // exp 转可读时间
  const exp = payloadObj.exp
  if (typeof exp === 'number') {
    parts.expReadable = formatTimestamp(exp)
  }

  // iat 转可读时间
  const iat = payloadObj.iat
  if (typeof iat === 'number') {
    parts.iatReadable = formatTimestamp(iat)
  }

  return { success: true, parts }
}
