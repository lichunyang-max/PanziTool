import { describe, expect, it } from 'vitest'
import {
  bufferToHex,
  computeTextHash,
  computeFileHash,
  type HashAlgorithm,
} from './hash'

/**
 * hash.ts 单元测试
 *
 * 参考值通过 Node.js crypto 模块独立计算，确保与各语言实现一致。
 * 所有哈希均为小写十六进制字符串。
 */

describe('bufferToHex', () => {
  it('应将空 ArrayBuffer 转为空字符串', () => {
    expect(bufferToHex(new ArrayBuffer(0))).toBe('')
  })

  it('应将单字节 ArrayBuffer 正确转为两位十六进制', () => {
    const buf = new Uint8Array([0x0a]).buffer
    expect(bufferToHex(buf)).toBe('0a')
  })

  it('应将多字节 ArrayBuffer 正确转为十六进制（含前导零补位）', () => {
    // 0x00, 0xff, 0x0f, 0x10 → "00ff0f10"
    const buf = new Uint8Array([0x00, 0xff, 0x0f, 0x10]).buffer
    expect(bufferToHex(buf)).toBe('00ff0f10')
  })

  it('应输出小写十六进制', () => {
    const buf = new Uint8Array([0xab, 0xcd, 0xef]).buffer
    expect(bufferToHex(buf)).toBe('abcdef')
  })
})

describe('computeTextHash - SHA 系列', () => {
  it('SHA-256 计算 "hello" 已知值', async () => {
    const hash = await computeTextHash('hello', 'SHA-256')
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('SHA-1 计算 "hello" 已知值', async () => {
    const hash = await computeTextHash('hello', 'SHA-1')
    expect(hash).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('SHA-512 计算 "hello" 已知值', async () => {
    const hash = await computeTextHash('hello', 'SHA-512')
    expect(hash).toBe(
      '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
    )
  })

  it('SHA-384 计算 "hello" 已知值', async () => {
    const hash = await computeTextHash('hello', 'SHA-384')
    expect(hash).toBe(
      '59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f',
    )
  })
})

describe('computeTextHash - MD5（动态 import js-md5）', () => {
  it('MD5 计算 "hello" 已知值', async () => {
    const hash = await computeTextHash('hello', 'MD5')
    expect(hash).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('MD5 计算 "Hello"（大写 H）已知值，验证大小写敏感', async () => {
    const hash = await computeTextHash('Hello', 'MD5')
    expect(hash).toBe('8b1a9953c4611296a827abf8c47804d7')
  })
})

describe('computeTextHash - 边界场景', () => {
  it('空文本 SHA-256', async () => {
    const hash = await computeTextHash('', 'SHA-256')
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('空文本 SHA-1', async () => {
    const hash = await computeTextHash('', 'SHA-1')
    expect(hash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })

  it('空文本 MD5', async () => {
    const hash = await computeTextHash('', 'MD5')
    expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('中文文本 SHA-256（UTF-8 编码）', async () => {
    const hash = await computeTextHash('中文', 'SHA-256')
    expect(hash).toBe('72726d8818f693066ceb69afa364218b692e62ea92b385782363780f47529c21')
  })

  it('中文文本 SHA-1（UTF-8 编码）', async () => {
    const hash = await computeTextHash('中文', 'SHA-1')
    expect(hash).toBe('7be2d2d20c106eee0836c9bc2b939890a78e8fb3')
  })

  it('中文文本 MD5（UTF-8 编码）', async () => {
    const hash = await computeTextHash('中文', 'MD5')
    expect(hash).toBe('a7bac2239fcdcb3a067903d8077c4a07')
  })
})

describe('computeTextHash - 一致性', () => {
  it('相同输入相同算法应产生相同输出', async () => {
    const algo: HashAlgorithm = 'SHA-256'
    const a = await computeTextHash('consistency test', algo)
    const b = await computeTextHash('consistency test', algo)
    expect(a).toBe(b)
  })

  it('不同算法对同一输入应产生不同输出', async () => {
    const sha1 = await computeTextHash('hello', 'SHA-1')
    const sha256 = await computeTextHash('hello', 'SHA-256')
    const md5 = await computeTextHash('hello', 'MD5')
    expect(sha1).not.toBe(sha256)
    expect(sha256).not.toBe(md5)
    expect(sha1).not.toBe(md5)
  })

  it('SHA-256 输出长度为 64 字符', async () => {
    const hash = await computeTextHash('hello', 'SHA-256')
    expect(hash).toHaveLength(64)
  })

  it('MD5 输出长度为 32 字符', async () => {
    const hash = await computeTextHash('hello', 'MD5')
    expect(hash).toHaveLength(32)
  })

  it('SHA-512 输出长度为 128 字符', async () => {
    const hash = await computeTextHash('hello', 'SHA-512')
    expect(hash).toHaveLength(128)
  })
})

describe('computeFileHash', () => {
  it('应正确计算文件内容的哈希（与文本哈希一致）', async () => {
    const text = 'hello'
    const file = new File([text], 'hello.txt', { type: 'text/plain' })
    const fileHash = await computeFileHash(file, 'SHA-256')
    const textHash = await computeTextHash(text, 'SHA-256')
    expect(fileHash).toBe(textHash)
  })

  it('应正确计算二进制文件 MD5', async () => {
    // 构造一个包含 "hello" 字节的文件
    const file = new File(['hello'], 'hello.bin')
    const hash = await computeFileHash(file, 'MD5')
    expect(hash).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('空文件 SHA-256', async () => {
    const file = new File([''], 'empty.txt')
    const hash = await computeFileHash(file, 'SHA-256')
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})
