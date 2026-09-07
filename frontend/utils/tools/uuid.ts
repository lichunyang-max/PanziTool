/**
 * uuid.ts - UUID 生成纯函数
 *
 * 基于 Web Crypto API（crypto.getRandomValues）生成密码学安全随机数，
 * 支持 UUID v4（纯随机）与 v7（毫秒时间戳前缀 + 随机）。
 *
 * 所有生成逻辑在浏览器本地完成，不上传服务器。
 */

/** UUID 版本 */
export type UuidVersion = 'v4' | 'v7'

/** UUID 格式化选项 */
export interface UuidFormatOptions {
  /** 去除连字符 */
  noHyphen?: boolean
  /** 大写 */
  upper?: boolean
  /** 大括号包裹 */
  braces?: boolean
}

/** 批量生成结果 */
export interface UuidBatchResult {
  success: boolean
  list?: string[]
  error?: string
}

/** 生成密码学安全随机字节 */
function randomBytes(n: number): Uint8Array {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(n)
    cryptoObj.getRandomValues(bytes)
    return bytes
  }
  // 降级：Math.random（非密码学安全，仅在极端环境使用）
  const bytes = new Uint8Array(n)
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}

/** 字节转两位十六进制 */
function byteToHex(b: number): string {
  return b.toString(16).padStart(2, '0')
}

/** 将 16 字节格式化为标准 UUID 字符串（8-4-4-4-12） */
function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, byteToHex).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * 生成单个 UUID v4（纯随机）
 *
 * 122 位随机位，version 位固定为 0x4，variant 位固定为 10xx。
 * 优先使用 crypto.randomUUID（性能更佳），失败时手动实现。
 */
export function generateUuidV4(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.randomUUID) {
    try {
      return cryptoObj.randomUUID()
    } catch {
      // 降级到手动实现
    }
  }
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
  return bytesToUuid(bytes)
}

/**
 * 生成单个 UUID v7（毫秒时间戳前缀 + 随机）
 *
 * 前 48 位为毫秒级 Unix 时间戳（大端），version 位固定为 0x7，
 * variant 位固定为 10xx。时间有序，适合数据库主键。
 */
export function generateUuidV7(): string {
  const ts = BigInt(Date.now()) // 48 位毫秒时间戳
  const bytes = randomBytes(16)
  // 前 6 字节写时间戳（大端）
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number((ts >> BigInt((5 - i) * 8)) & BigInt(0xff))
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70 // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
  return bytesToUuid(bytes)
}

/** 根据版本生成单个 UUID */
export function generateUuid(version: UuidVersion): string {
  return version === 'v7' ? generateUuidV7() : generateUuidV4()
}

/**
 * 按格式选项格式化 UUID
 *
 * @param uuid 标准 UUID 字符串
 * @param options 格式化选项
 */
export function formatUuid(
  uuid: string,
  options: UuidFormatOptions = {},
): string {
  let out = uuid
  if (options.noHyphen) {
    out = out.replace(/-/g, '')
  }
  if (options.upper) {
    out = out.toUpperCase()
  }
  if (options.braces) {
    out = `{${out}}`
  }
  return out
}

/**
 * 批量生成 UUID
 *
 * @param version UUID 版本
 * @param count 生成数量（1-1000）
 * @param options 格式化选项
 * @returns 批量生成结果
 */
export function generateUuidBatch(
  version: UuidVersion,
  count: number,
  options: UuidFormatOptions = {},
): UuidBatchResult {
  const safeCount = Math.floor(count)
  if (!Number.isFinite(safeCount) || safeCount < 1 || safeCount > 1000) {
    return { success: false, error: '生成数量必须在 1-1000 之间' }
  }
  const list: string[] = []
  for (let i = 0; i < safeCount; i++) {
    list.push(formatUuid(generateUuid(version), options))
  }
  return { success: true, list }
}
