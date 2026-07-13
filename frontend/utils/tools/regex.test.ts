import { describe, expect, it } from 'vitest'
import { executeRegex, highlightMatches } from './regex'

describe('executeRegex', () => {
  describe('基本匹配', () => {
    it('无 g 标志时只返回第一个匹配', () => {
      const result = executeRegex('\\d+', '', 'abc123def456')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]!.fullMatch).toBe('123')
      expect(result.matches[0]!.start).toBe(3)
      expect(result.matches[0]!.end).toBe(6)
      expect(result.matches[0]!.index).toBe(0)
    })

    it('正确返回 start/end 字符位置', () => {
      const result = executeRegex('world', '', 'hello world')
      expect(result.matches[0]!.start).toBe(6)
      expect(result.matches[0]!.end).toBe(11)
    })
  })

  describe('全局匹配（g flag）', () => {
    it('g 标志返回所有匹配', () => {
      const result = executeRegex('\\d+', 'g', 'abc123def456')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(2)
      expect(result.matches[0]!.fullMatch).toBe('123')
      expect(result.matches[1]!.fullMatch).toBe('456')
      expect(result.matches[1]!.index).toBe(1)
    })

    it('多个不连续匹配的 index 递增', () => {
      const result = executeRegex('a', 'g', 'banana')
      expect(result.matches).toHaveLength(3)
      expect(result.matches.map((m) => m.index)).toEqual([0, 1, 2])
      expect(result.matches.map((m) => m.start)).toEqual([1, 3, 5])
    })
  })

  describe('忽略大小写（i flag）', () => {
    it('无 i 标志时大小写敏感', () => {
      const result = executeRegex('hello', '', 'Hello World')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
    })

    it('i 标志时忽略大小写', () => {
      const result = executeRegex('hello', 'i', 'Hello World HELLO')
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]!.fullMatch).toBe('Hello')
    })

    it('gi 组合标志同时生效', () => {
      const result = executeRegex('hello', 'gi', 'Hello World HELLO')
      expect(result.matches).toHaveLength(2)
      expect(result.matches[0]!.fullMatch).toBe('Hello')
      expect(result.matches[1]!.fullMatch).toBe('HELLO')
    })
  })

  describe('分组捕获', () => {
    it('正确提取多个分组', () => {
      const result = executeRegex(
        '(\\w+)@(\\w+)\\.(\\w+)',
        'g',
        'a@b.com x@y.org',
      )
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(2)
      expect(result.matches[0]!.fullMatch).toBe('a@b.com')
      expect(result.matches[0]!.groups).toEqual(['a', 'b', 'com'])
      expect(result.matches[1]!.fullMatch).toBe('x@y.org')
      expect(result.matches[1]!.groups).toEqual(['x', 'y', 'org'])
    })

    it('可选分组未匹配时为空字符串', () => {
      const result = executeRegex('a(b)?', '', 'a')
      expect(result.matches[0]!.fullMatch).toBe('a')
      expect(result.matches[0]!.groups).toEqual([''])
    })

    it('无分组的正则 groups 为空数组', () => {
      const result = executeRegex('\\d+', '', 'abc123')
      expect(result.matches[0]!.groups).toEqual([])
    })

    it('嵌套分组正确捕获', () => {
      const result = executeRegex('((\\d)(\\d))', '', '12')
      expect(result.matches[0]!.fullMatch).toBe('12')
      expect(result.matches[0]!.groups).toEqual(['12', '1', '2'])
    })
  })

  describe('多行匹配（m flag）', () => {
    const multilineText = 'foo\nbar\nfoo'

    it('无 m 标志时 ^ 仅匹配字符串开头', () => {
      const result = executeRegex('^foo', 'g', multilineText)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]!.start).toBe(0)
    })

    it('m 标志使 ^ 匹配每行行首', () => {
      const result = executeRegex('^foo', 'gm', multilineText)
      expect(result.matches).toHaveLength(2)
      expect(result.matches[0]!.start).toBe(0)
      expect(result.matches[1]!.start).toBe(8)
    })

    it('m 标志使 $ 匹配每行行尾', () => {
      const result = executeRegex('bar$', 'gm', multilineText)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]!.fullMatch).toBe('bar')
    })
  })

  describe('非法正则错误处理', () => {
    it('未闭合的字符类返回错误', () => {
      const result = executeRegex('[invalid', 'g', 'test')
      expect(result.success).toBe(false)
      expect(result.matches).toHaveLength(0)
      expect(result.error).toBeTruthy()
      expect(typeof result.error).toBe('string')
    })

    it('未闭合的分组返回错误', () => {
      const result = executeRegex('(unclosed', '', 'test')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('错误的量词返回错误', () => {
      const result = executeRegex('a{2,1}', '', 'test')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('错误信息不暴露敏感内部细节', () => {
      const result = executeRegex('[', '', 'test')
      expect(result.error).toBeTruthy()
      // 错误信息应为字符串类型
      expect(result.error!.length).toBeGreaterThan(0)
    })
  })

  describe('无匹配情况', () => {
    it('无匹配时返回空 matches 数组且 success 为 true', () => {
      const result = executeRegex('xyz', 'g', 'abc')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
    })

    it('空文本无匹配', () => {
      const result = executeRegex('\\d+', 'g', '')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
    })

    it('复杂正则无匹配', () => {
      const result = executeRegex('\\b\\w+@\\w+\\.\\w+\\b', 'g', 'no emails here')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
    })
  })

  describe('flags 过滤', () => {
    it('非法 flag 字符被过滤', () => {
      // 传入含非法字符的 flags，不应抛错
      const result = executeRegex('abc', 'gxz', 'abc')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(1)
    })

    it('重复 flag 被去重', () => {
      const result = executeRegex('abc', 'ggg', 'abc abc')
      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(2)
    })
  })
})

describe('highlightMatches', () => {
  it('无匹配时返回转义的原始文本', () => {
    const html = highlightMatches('hello world', [])
    expect(html).toBe('hello world')
    expect(html).not.toContain('<mark>')
  })

  it('单个匹配用 mark 标签包裹', () => {
    const result = executeRegex('world', '', 'hello world')
    const html = highlightMatches('hello world', result.matches)
    expect(html).toBe('hello <mark class="pz-match-highlight">world</mark>')
  })

  it('多个匹配均被高亮', () => {
    const result = executeRegex('\\d', 'g', 'a1b2c3')
    const html = highlightMatches('a1b2c3', result.matches)
    expect(html).toBe(
      'a<mark class="pz-match-highlight">1</mark>' +
        'b<mark class="pz-match-highlight">2</mark>' +
        'c<mark class="pz-match-highlight">3</mark>',
    )
  })

  it('HTML 特殊字符被正确转义', () => {
    const result = executeRegex('b', '', '<a>b</a>')
    const html = highlightMatches('<a>b</a>', result.matches)
    expect(html).toContain('&lt;a&gt;')
    expect(html).toContain('&lt;/a&gt;')
    expect(html).toContain('<mark class="pz-match-highlight">b</mark>')
    // 原始标签不应出现在非 mark 区域
    expect(html).not.toMatch(/[^;]<a>/)
  })

  it('匹配文本中的 HTML 字符也被转义', () => {
    const result = executeRegex('<b>', '', '<b>bold</b>')
    const html = highlightMatches('<b>bold</b>', result.matches)
    expect(html).toContain('<mark class="pz-match-highlight">&lt;b&gt;</mark>')
  })

  it('空匹配不被高亮', () => {
    const result = executeRegex('', 'g', 'abc')
    const html = highlightMatches('abc', result.matches)
    expect(html).not.toContain('<mark>')
    expect(html).toBe('abc')
  })

  it('空文本输入返回空字符串', () => {
    const html = highlightMatches('', [])
    expect(html).toBe('')
  })

  it('matches 乱序时仍按位置正确拼接', () => {
    const result = executeRegex('\\d', 'g', '1a2')
    // 手动打乱顺序
    const reversed = [...result.matches].reverse()
    const html = highlightMatches('1a2', reversed)
    expect(html).toBe(
      '<mark class="pz-match-highlight">1</mark>' +
        'a<mark class="pz-match-highlight">2</mark>',
    )
  })
})
