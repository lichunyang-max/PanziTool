/**
 * hash.ts - 哈希计算纯函数
 *
 * 支持 MD5、SHA-1、SHA-256、SHA-384、SHA-512 算法。
 * - SHA 系列：使用浏览器原生 Web Crypto API（crypto.subtle.digest）
 * - MD5：Web Crypto 不支持，通过动态 import js-md5 懒加载（不影响首屏体积）
 *
 * 所有函数均为纯函数（无副作用），可在 SSR 与客户端环境调用。
 * 注意：crypto.subtle 仅在安全上下文（HTTPS / localhost）可用。
 */

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

/**
 * 将 ArrayBuffer 转为小写十六进制字符串。
 *
 * @param buffer 哈希计算返回的原始字节缓冲区
 * @returns 小写十六进制字符串（每个字节占 2 个字符）
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16)
    hex += h.length === 1 ? '0' + h : h
  }
  return hex
}

/**
 * 使用 js-md5 计算 MD5（动态加载，避免打包进首屏 chunk）。
 * js-md5 接受 string | number[] | ArrayBuffer | Uint8Array，此处统一传 Uint8Array。
 */
async function computeMD5(data: Uint8Array): Promise<string> {
  const { default: md5 } = await import('js-md5')
  return md5(data)
}

/**
 * 对字节数组计算指定算法的哈希值，返回小写十六进制字符串。
 *
 * @param data UTF-8 编码后的字节数组
 * @param algorithm 哈希算法
 */
async function computeHashFromBytes(data: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'MD5') {
    return computeMD5(data)
  }
  // SHA-1 / SHA-256 / SHA-384 / SHA-512 由 Web Crypto API 提供
  const digestBuffer = await crypto.subtle.digest(algorithm, data)
  return bufferToHex(digestBuffer)
}

/**
 * 计算文本哈希值。
 *
 * 文本先通过 TextEncoder 编码为 UTF-8 字节，再计算哈希，
 * 确保与各语言（Python hashlib / Node crypto）的 UTF-8 结果一致。
 *
 * @param text 待计算哈希的文本
 * @param algorithm 哈希算法
 * @returns 小写十六进制哈希字符串
 */
export async function computeTextHash(text: string, algorithm: HashAlgorithm): Promise<string> {
  const data = new TextEncoder().encode(text)
  return computeHashFromBytes(data, algorithm)
}

/**
 * 计算文件哈希值。
 *
 * 文件通过 File API 读取为 ArrayBuffer，所有计算在浏览器本地完成，
 * 文件不会上传到服务器。
 *
 * @param file 浏览器 File 对象
 * @param algorithm 哈希算法
 * @returns 小写十六进制哈希字符串
 */
export async function computeFileHash(file: File, algorithm: HashAlgorithm): Promise<string> {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)
  return computeHashFromBytes(data, algorithm)
}
