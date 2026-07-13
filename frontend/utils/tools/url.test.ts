import { describe, expect, it } from 'vitest'
import {
  batchDecode,
  batchEncode,
  decodeUrl,
  encodeUrl,
} from './url'

/**
 * url.ts 纯函数单元测试
 *
 * 覆盖：
 * - encodeURIComponent 编码/解码
 * - encodeURI 编码/解码
 * - 空格编码为 %20 和 +
 * - 中文编码
 * - 批量处理
 * - 非法 URL 编码解码异常处理
 */

describe('encodeUrl - encodeURIComponent', () => {
  it('应编码所有特殊字符', () => {
    const input = 'https://example.com/path?q=hello world&lang=zh'
    const result = encodeUrl(input, 'encodeURIComponent', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe(
      'https%3A%2F%2Fexample.com%2Fpath%3Fq%3Dhello%20world%26lang%3Dzh',
    )
  })

  it('应编码冒号、斜杠、问号等结构字符', () => {
    const result = encodeUrl('a/b:c?d=e', 'encodeURIComponent', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('a%2Fb%3Ac%3Fd%3De')
  })

  it('空字符串应返回空成功结果', () => {
    const result = encodeUrl('', 'encodeURIComponent', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('')
  })
})

describe('encodeUrl - encodeURI', () => {
  it('应保留 URL 结构字符（/ : ? = & #）', () => {
    const input = 'https://example.com/path?q=hello world'
    const result = encodeUrl(input, 'encodeURI', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('https://example.com/path?q=hello%20world')
  })

  it('不应编码 # ? = & 等保留字符', () => {
    const result = encodeUrl('#?=&', 'encodeURI', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('#?=&')
  })
})

describe('空格编码方式', () => {
  it('percent20 模式应将空格编码为 %20', () => {
    const result = encodeUrl('a b', 'encodeURIComponent', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('a%20b')
  })

  it('plus 模式应将空格编码为 +', () => {
    const result = encodeUrl('a b', 'encodeURIComponent', 'plus')
    expect(result.success).toBe(true)
    expect(result.output).toBe('a+b')
  })

  it('plus 模式下字面 + 应仍被编码为 %2B（不被误转为空格）', () => {
    const result = encodeUrl('a+b', 'encodeURIComponent', 'plus')
    expect(result.success).toBe(true)
    // encodeURIComponent('+') === '%2B'，不会被 %20→+ 替换影响
    expect(result.output).toBe('a%2Bb')
  })

  it('解码 percent20 模式应还原空格', () => {
    const result = decodeUrl('a%20b', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('a b')
  })

  it('解码 plus 模式应将 + 还原为空格', () => {
    const result = decodeUrl('a+b', 'plus')
    expect(result.success).toBe(true)
    expect(result.output).toBe('a b')
  })

  it('解码 plus 模式下 %2B 应还原为字面 +', () => {
    const result = decodeUrl('a%2Bb', 'plus')
    expect(result.success).toBe(true)
    expect(result.output).toBe('a+b')
  })
})

describe('中文编码', () => {
  it('应将中文编码为 UTF-8 百分号序列', () => {
    const result = encodeUrl('中文', 'encodeURIComponent', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('%E4%B8%AD%E6%96%87')
  })

  it('应正确解码中文百分号序列', () => {
    const result = decodeUrl('%E4%B8%AD%E6%96%87', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('中文')
  })

  it('encodeURI 也应编码中文', () => {
    const result = encodeUrl('中文', 'encodeURI', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('%E4%B8%AD%E6%96%87')
  })

  it('应处理混合中文与 URL 的编码', () => {
    const input = 'https://example.com/搜索?q=中文测试'
    const result = encodeUrl(input, 'encodeURIComponent', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe(
      'https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2%3Fq%3D%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95',
    )
  })

  it('应正确解码混合中文 URL', () => {
    const encoded =
      'https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2%3Fq%3D%E4%B8%AD%E6%96%87'
    const result = decodeUrl(encoded, 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('https://example.com/搜索?q=中文')
  })
})

describe('解码能力', () => {
  it('decodeUrl 能正确还原 encodeURI 的输出', () => {
    const original = 'https://example.com/path?q=hello world'
    const encoded = encodeUrl(original, 'encodeURI', 'percent20')
    expect(encoded.success).toBe(true)
    const decoded = decodeUrl(encoded.output!, 'percent20')
    expect(decoded.success).toBe(true)
    expect(decoded.output).toBe(original)
  })

  it('decodeUrl 能正确还原 encodeURIComponent 的输出', () => {
    const original = 'https://example.com/path?q=hello world&x=1'
    const encoded = encodeUrl(original, 'encodeURIComponent', 'percent20')
    expect(encoded.success).toBe(true)
    const decoded = decodeUrl(encoded.output!, 'percent20')
    expect(decoded.success).toBe(true)
    expect(decoded.output).toBe(original)
  })

  it('decodeUrl 能正确还原 plus 模式的编码', () => {
    const original = 'hello world foo'
    const encoded = encodeUrl(original, 'encodeURIComponent', 'plus')
    expect(encoded.success).toBe(true)
    expect(encoded.output).toBe('hello+world+foo')
    const decoded = decodeUrl(encoded.output!, 'plus')
    expect(decoded.success).toBe(true)
    expect(decoded.output).toBe(original)
  })

  it('空字符串解码应返回空成功结果', () => {
    const result = decodeUrl('', 'percent20')
    expect(result.success).toBe(true)
    expect(result.output).toBe('')
  })
})

describe('批量处理', () => {
  it('batchEncode 应逐行编码', () => {
    const input = 'a b\n中文\nc/d'
    const result = batchEncode(input, 'encodeURIComponent', 'percent20')
    expect(result).toEqual(['a%20b', '%E4%B8%AD%E6%96%87', 'c%2Fd'])
  })

  it('batchEncode plus 模式应将空格编码为 +', () => {
    const input = 'a b\nc d'
    const result = batchEncode(input, 'encodeURIComponent', 'plus')
    expect(result).toEqual(['a+b', 'c+d'])
  })

  it('batchEncode 应保留空行为空字符串', () => {
    const input = 'a\n\nb'
    const result = batchEncode(input, 'encodeURIComponent', 'percent20')
    expect(result).toEqual(['a', '', 'b'])
  })

  it('batchDecode 应逐行解码', () => {
    const input = 'a%20b\n%E4%B8%AD%E6%96%87'
    const result = batchDecode(input, 'percent20')
    expect(result).toEqual(['a b', '中文'])
  })

  it('batchDecode plus 模式应将 + 还原为空格', () => {
    const input = 'a+b\nc+d'
    const result = batchDecode(input, 'plus')
    expect(result).toEqual(['a b', 'c d'])
  })

  it('batchDecode 应处理包含错误行的输入', () => {
    const input = 'a%20b\n%ZZ\nc%20d'
    const result = batchDecode(input, 'percent20')
    expect(result[0]).toBe('a b')
    expect(result[1]).toContain('[错误]')
    expect(result[2]).toBe('c d')
  })

  it('batchDecode 应保留空行为空字符串', () => {
    const input = 'a%20b\n\nb'
    const result = batchDecode(input, 'percent20')
    expect(result).toEqual(['a b', '', 'b'])
  })

  it('batchEncode 应兼容 \\r\\n 换行', () => {
    const input = 'a\r\nb'
    const result = batchEncode(input, 'encodeURIComponent', 'percent20')
    expect(result).toEqual(['a', 'b'])
  })
})

describe('非法 URL 编码解码异常处理', () => {
  it('解码无效序列 %ZZ 应返回失败', () => {
    const result = decodeUrl('%ZZ', 'percent20')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('解码失败')
  })

  it('解码不完整的百分号序列 %2 应返回失败', () => {
    const result = decodeUrl('%2', 'percent20')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('解码 %E4%B8 应返回失败（不完整的中文字节序列）', () => {
    const result = decodeUrl('%E4%B8', 'percent20')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('失败结果不应包含 output 字段', () => {
    const result = decodeUrl('%ZZ', 'percent20')
    expect(result.success).toBe(false)
    expect(result.output).toBeUndefined()
  })

  it('batchDecode 错误行应包含 [错误] 前缀', () => {
    const input = '%ZZ'
    const result = batchDecode(input, 'percent20')
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('[错误]')
  })
})
