import { describe, expect, it } from 'vitest'
import {
  addLineBreaks,
  decodeBase64,
  encodeBase64,
} from './base64'

/**
 * Base64 编解码纯函数单元测试
 *
 * 覆盖：
 * - 英文编码/解码
 * - 中文 UTF-8 编码/解码（关键测试）
 * - ASCII 模式
 * - 换行添加
 * - 非法 Base64 解码异常
 * - 空输入
 */
describe('encodeBase64 / decodeBase64', () => {
  describe('英文编码/解码', () => {
    it('应正确编码英文字符串', () => {
      const result = encodeBase64('Hello World')
      expect(result.success).toBe(true)
      expect(result.output).toBe('SGVsbG8gV29ybGQ=')
    })

    it('应正确解码英文字符串', () => {
      const result = decodeBase64('SGVsbG8gV29ybGQ=')
      expect(result.success).toBe(true)
      expect(result.output).toBe('Hello World')
    })

    it('英文编解码应可往返还原', () => {
      const text = 'The quick brown fox jumps over the lazy dog'
      const encoded = encodeBase64(text)
      expect(encoded.success).toBe(true)
      const decoded = decodeBase64(encoded.output!)
      expect(decoded.success).toBe(true)
      expect(decoded.output).toBe(text)
    })
  })

  describe('中文 UTF-8 编码/解码（关键测试）', () => {
    it('应正确编码中文字符串为 UTF-8 Base64', () => {
      // "中文" UTF-8 字节为 E4 B8 AD E6 96 87 → Base64 "5Lit5paH"
      const result = encodeBase64('中文')
      expect(result.success).toBe(true)
      expect(result.output).toBe('5Lit5paH')
    })

    it('应正确解码 UTF-8 Base64 为中文', () => {
      const result = decodeBase64('5Lit5paH')
      expect(result.success).toBe(true)
      expect(result.output).toBe('中文')
    })

    it('中英混合编解码应可往返还原', () => {
      const text = 'Hello 世界！PanziPool 工具聚合站 2026'
      const encoded = encodeBase64(text)
      expect(encoded.success).toBe(true)
      const decoded = decodeBase64(encoded.output!)
      expect(decoded.success).toBe(true)
      expect(decoded.output).toBe(text)
    })

    it('应正确处理 Emoji 等四字节字符', () => {
      const text = '你好 🚀🎉 工具'
      const encoded = encodeBase64(text)
      expect(encoded.success).toBe(true)
      const decoded = decodeBase64(encoded.output!)
      expect(decoded.success).toBe(true)
      expect(decoded.output).toBe(text)
    })
  })

  describe('ASCII 模式', () => {
    it('ASCII 模式应正确编码纯英文字符串', () => {
      const result = encodeBase64('Hello', 'ascii')
      expect(result.success).toBe(true)
      expect(result.output).toBe('SGVsbG8=')
    })

    it('ASCII 模式应正确解码为英文字符串', () => {
      const result = decodeBase64('SGVsbG8=', 'ascii')
      expect(result.success).toBe(true)
      expect(result.output).toBe('Hello')
    })

    it('ASCII 模式编码中文字符应失败', () => {
      // btoa 无法处理码点 > 0xFF 的字符，应返回失败结果而非抛错
      const result = encodeBase64('中文', 'ascii')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('ASCII 模式解码应返回原始二进制字符串', () => {
      // "ABC" → "QUJD"
      const result = decodeBase64('QUJD', 'ascii')
      expect(result.success).toBe(true)
      expect(result.output).toBe('ABC')
    })
  })

  describe('换行添加（addLineBreaks）', () => {
    it('应在每 76 字符处插入换行', () => {
      const input = 'A'.repeat(152)
      const result = addLineBreaks(input, 76)
      const lines = result.split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('A'.repeat(76))
      expect(lines[1]).toBe('A'.repeat(76))
    })

    it('末尾不保留多余换行', () => {
      const input = 'A'.repeat(152)
      const result = addLineBreaks(input, 76)
      expect(result.endsWith('\n')).toBe(false)
    })

    it('非整数倍长度应保留尾部短行', () => {
      const input = 'A'.repeat(80)
      const result = addLineBreaks(input, 76)
      const lines = result.split('\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('A'.repeat(76))
      expect(lines[1]).toBe('A'.repeat(4))
    })

    it('恰好 76 字符时不应添加换行', () => {
      const input = 'A'.repeat(76)
      const result = addLineBreaks(input, 76)
      expect(result).toBe(input)
      expect(result.includes('\n')).toBe(false)
    })

    it('支持自定义宽度', () => {
      const result = addLineBreaks('ABCDEFGH', 4)
      expect(result).toBe('ABCD\nEFGH')
    })

    it('空字符串应返回空字符串', () => {
      expect(addLineBreaks('', 76)).toBe('')
    })

    it('带换行的 Base64 解码应可还原中文', () => {
      const text = '中文测试换行功能'
      const encoded = encodeBase64(text)
      expect(encoded.success).toBe(true)
      const withBreaks = addLineBreaks(encoded.output!, 4)
      const decoded = decodeBase64(withBreaks)
      expect(decoded.success).toBe(true)
      expect(decoded.output).toBe(text)
    })
  })

  describe('非法 Base64 解码异常', () => {
    it('包含非法字符应返回失败', () => {
      const result = decodeBase64('!!!!')
      expect(result.success).toBe(false)
      expect(result.error).toContain('无效')
    })

    it('包含非 Base64 字符（如点号）应返回失败', () => {
      const result = decodeBase64('A.BC=')
      expect(result.success).toBe(false)
    })

    it('长度不是 4 的倍数应返回失败', () => {
      const result = decodeBase64('abc')
      expect(result.success).toBe(false)
      expect(result.error).toContain('长度')
    })

    it('过多填充符应返回失败', () => {
      // 三个 = 超出合法填充上限
      const result = decodeBase64('YQ===')
      expect(result.success).toBe(false)
    })

    it('解码失败时不应抛出异常', () => {
      expect(() => decodeBase64('@@@@@@@@')).not.toThrow()
    })
  })

  describe('空输入', () => {
    it('编码空字符串应返回空输出', () => {
      const result = encodeBase64('')
      expect(result.success).toBe(true)
      expect(result.output).toBe('')
    })

    it('解码空字符串应返回空输出', () => {
      const result = decodeBase64('')
      expect(result.success).toBe(true)
      expect(result.output).toBe('')
    })

    it('仅含空白的字符串解码应返回空输出', () => {
      const result = decodeBase64('   \n\t  ')
      expect(result.success).toBe(true)
      expect(result.output).toBe('')
    })
  })

  describe('默认字符集', () => {
    it('未指定 charset 时默认使用 UTF-8', () => {
      const encoded = encodeBase64('中文')
      expect(encoded.output).toBe('5Lit5paH')
      const decoded = decodeBase64(encoded.output!)
      expect(decoded.output).toBe('中文')
    })
  })
})
