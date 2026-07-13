import { describe, expect, it } from 'vitest'
import { compressJson, formatJson, validateJson } from './json'

/**
 * json.ts 纯函数单元测试
 *
 * 覆盖：
 * - 合法 JSON 格式化（缩进 2 和 4）
 * - 合法 JSON 压缩
 * - 非法 JSON 校验（返回错误信息与行列位置）
 * - 空输入处理
 * - 嵌套对象 / 数组处理
 * - Unicode 字符处理
 */

describe('formatJson - 格式化', () => {
  it('应使用 2 空格缩进格式化合法 JSON', () => {
    const result = formatJson('{"name":"PanziPool","count":7}')
    expect(result.success).toBe(true)
    expect(result.output).toBe(
      '{\n  "name": "PanziPool",\n  "count": 7\n}',
    )
  })

  it('应使用 4 空格缩进格式化合法 JSON', () => {
    const result = formatJson('{"a":1}', 4)
    expect(result.success).toBe(true)
    expect(result.output).toBe('{\n    "a": 1\n}')
  })

  it('默认缩进应为 2 空格', () => {
    const result = formatJson('{"a":1}')
    expect(result.success).toBe(true)
    expect(result.output).toBe('{\n  "a": 1\n}')
  })

  it('非 4 的缩进值应回退为 2 空格', () => {
    const result = formatJson('{"a":1}', 8)
    expect(result.success).toBe(true)
    expect(result.output).toBe('{\n  "a": 1\n}')
  })

  it('应处理嵌套对象', () => {
    const input = '{"a":{"b":1}}'
    const result = formatJson(input, 2)
    expect(result.success).toBe(true)
    expect(result.output).toBe('{\n  "a": {\n    "b": 1\n  }\n}')
  })

  it('应处理数组', () => {
    const result = formatJson('[1,2,3]')
    expect(result.success).toBe(true)
    expect(result.output).toBe('[\n  1,\n  2,\n  3\n]')
  })

  it('应处理嵌套数组与对象混合', () => {
    const input = '{"list":[{"id":1},{"id":2}]}'
    const result = formatJson(input, 2)
    expect(result.success).toBe(true)
    expect(result.output).toBe(
      '{\n  "list": [\n    {\n      "id": 1\n    },\n    {\n      "id": 2\n    }\n  ]\n}',
    )
  })

  it('应处理 Unicode 字符（中文）', () => {
    const result = formatJson('{"name":"中文"}')
    expect(result.success).toBe(true)
    expect(result.output).toContain('中文')
  })

  it('应处理 Unicode 字符（emoji）', () => {
    const result = formatJson('{"emoji":"🎉"}')
    expect(result.success).toBe(true)
    expect(result.output).toContain('🎉')
  })

  it('应处理带空白的输入', () => {
    const result = formatJson('  {"a":1}  ')
    expect(result.success).toBe(true)
    expect(result.output).toBe('{\n  "a": 1\n}')
  })

  it('应处理布尔值、null 和数字', () => {
    const result = formatJson('{"a":true,"b":false,"c":null,"d":3.14}')
    expect(result.success).toBe(true)
    expect(result.output).toContain('true')
    expect(result.output).toContain('false')
    expect(result.output).toContain('null')
    expect(result.output).toContain('3.14')
  })

  it('非法 JSON 应返回失败和错误信息', () => {
    const result = formatJson('{"a":}')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.output).toBeUndefined()
  })

  it('空字符串应返回失败', () => {
    const result = formatJson('')
    expect(result.success).toBe(false)
    expect(result.error).toContain('空')
  })

  it('纯空白输入应返回失败', () => {
    const result = formatJson('   \n\t  ')
    expect(result.success).toBe(false)
    expect(result.error).toContain('空')
  })
})

describe('compressJson - 压缩', () => {
  it('应压缩带缩进的 JSON', () => {
    const input = '{\n  "name": "PanziPool",\n  "count": 7\n}'
    const result = compressJson(input)
    expect(result.success).toBe(true)
    expect(result.output).toBe('{"name":"PanziPool","count":7}')
  })

  it('应压缩嵌套结构', () => {
    const input = '{\n  "a": {\n    "b": 1\n  }\n}'
    const result = compressJson(input)
    expect(result.success).toBe(true)
    expect(result.output).toBe('{"a":{"b":1}}')
  })

  it('应压缩数组', () => {
    const input = '[\n  1,\n  2,\n  3\n]'
    const result = compressJson(input)
    expect(result.success).toBe(true)
    expect(result.output).toBe('[1,2,3]')
  })

  it('应保留 Unicode 字符', () => {
    const input = '{\n  "name": "中文"\n}'
    const result = compressJson(input)
    expect(result.success).toBe(true)
    expect(result.output).toContain('中文')
  })

  it('已压缩的 JSON 应保持不变', () => {
    const input = '{"a":1,"b":2}'
    const result = compressJson(input)
    expect(result.success).toBe(true)
    expect(result.output).toBe('{"a":1,"b":2}')
  })

  it('非法 JSON 应返回失败和错误信息', () => {
    const result = compressJson('{invalid}')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.output).toBeUndefined()
  })

  it('空字符串应返回失败', () => {
    const result = compressJson('')
    expect(result.success).toBe(false)
    expect(result.error).toContain('空')
  })

  it('纯空白输入应返回失败', () => {
    const result = compressJson('  ')
    expect(result.success).toBe(false)
    expect(result.error).toContain('空')
  })
})

describe('validateJson - 校验', () => {
  it('合法 JSON 对象应校验通过', () => {
    const result = validateJson('{"a":1}')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('合法 JSON 数组应校验通过', () => {
    const result = validateJson('[1,2,3]')
    expect(result.valid).toBe(true)
  })

  it('合法嵌套 JSON 应校验通过', () => {
    const result = validateJson('{"a":{"b":[1,2,3]},"c":null}')
    expect(result.valid).toBe(true)
  })

  it('合法 JSON 应无行列信息', () => {
    const result = validateJson('{"a":1}')
    expect(result.valid).toBe(true)
    expect(result.line).toBeUndefined()
    expect(result.column).toBeUndefined()
  })

  it('非法 JSON 应返回错误信息', () => {
    const result = validateJson('{"a":}')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('非法 JSON 应返回行列位置', () => {
    // {bad} 在 Node 22 产生 "Expected ... at position 1 (line 1 column 2)"
    const result = validateJson('{bad}')
    expect(result.valid).toBe(false)
    expect(result.line).toBe(1)
    expect(result.column).toBe(2)
  })

  it('多行 JSON 错误应返回正确行号', () => {
    // 第三行有非法属性名 bad
    const input = '{\n  "a": 1,\n  bad}'
    const result = validateJson(input)
    expect(result.valid).toBe(false)
    expect(result.line).toBe(3)
    expect(result.column).toBe(3)
  })

  it('多行 JSON 缺少逗号应返回正确行号', () => {
    const input = '{\n  "a": 1\n  "b": 2\n}'
    const result = validateJson(input)
    expect(result.valid).toBe(false)
    expect(result.line).toBe(3)
  })

  it('Unexpected token 错误应 best-effort 返回位置', () => {
    // {"a":} 在 Node 22 产生 "Unexpected token '}'" 无直接位置
    // best-effort 定位 } 首次出现 → line 1, column 6
    const result = validateJson('{"a":}')
    expect(result.valid).toBe(false)
    expect(result.line).toBe(1)
    expect(result.column).toBe(6)
  })

  it('空字符串应返回失败', () => {
    const result = validateJson('')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('空')
  })

  it('纯空白输入应返回失败', () => {
    const result = validateJson('   ')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('空')
  })

  it('Unicode 字符应校验通过', () => {
    const result = validateJson('{"name":"中文","emoji":"🎉"}')
    expect(result.valid).toBe(true)
  })

  it('布尔值和 null 应校验通过', () => {
    expect(validateJson('{"a":true,"b":false,"c":null}').valid).toBe(true)
  })

  it('不完整 JSON 应返回失败', () => {
    const result = validateJson('{"a":')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
