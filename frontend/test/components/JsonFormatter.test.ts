// @vitest-environment nuxt
/**
 * JsonFormatterTool.vue 组件渲染测试
 *
 * 测试要点：
 * - 组件可挂载并渲染输入/输出区
 * - 输入框存在
 * - 格式化/压缩/校验按钮可点击
 * - 输入合法 JSON 后格式化输出正确
 * - 校验合法/非法 JSON 显示对应提示
 *
 * mock 策略：
 * - mockNuxtImport('useAnalytics')：避免事件上报干扰
 * - mockNuxtImport('useRoute')：提供 slug 路由参数
 */
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import JsonFormatterTool from '~/components/tool/JsonFormatterTool.vue'

// mock useAnalytics 避免事件上报干扰
mockNuxtImport('useAnalytics', () => {
  return () => ({
    reportEvent: vi.fn(),
    reportPageView: vi.fn(),
  })
})

// mock useRoute 提供 slug 参数
mockNuxtImport('useRoute', () => {
  return () => ({
    params: { slug: 'json-formatter' },
    path: '/tools/json-formatter',
  })
})

describe('JsonFormatterTool 组件渲染测试', () => {
  it('组件应可挂载并渲染输入/输出区', () => {
    const wrapper = mount(JsonFormatterTool)
    expect(wrapper.exists()).toBe(true)
    // 输入区与输出区标签均应渲染
    expect(wrapper.text()).toContain('输入')
    expect(wrapper.text()).toContain('输出')
  })

  it('应包含 JSON 输入框', () => {
    const wrapper = mount(JsonFormatterTool)
    const textarea = wrapper.find('textarea[aria-label="JSON 输入"]')
    expect(textarea.exists()).toBe(true)
  })

  it('应包含格式化按钮且可点击', () => {
    const wrapper = mount(JsonFormatterTool)
    const btn = wrapper.find('button[aria-label="格式化 JSON"]')
    expect(btn.exists()).toBe(true)
    // 按钮不应被禁用
    expect(btn.attributes('disabled')).toBeFalsy()
  })

  it('输入合法 JSON 后点击格式化应输出正确结果', async () => {
    const wrapper = mount(JsonFormatterTool)
    // 输入合法 JSON
    await wrapper
      .find('textarea[aria-label="JSON 输入"]')
      .setValue('{"name":"PanziPool","count":7}')
    // 点击格式化按钮
    await wrapper.find('button[aria-label="格式化 JSON"]').trigger('click')
    // 输出区应包含格式化后的 JSON（带缩进与空格）
    const code = wrapper.find('pre code')
    expect(code.text()).toContain('"name": "PanziPool"')
    expect(code.text()).toContain('"count": 7')
  })

  it('点击校验按钮校验合法 JSON 应显示成功提示', async () => {
    const wrapper = mount(JsonFormatterTool)
    await wrapper.find('textarea[aria-label="JSON 输入"]').setValue('{"a":1}')
    await wrapper.find('button[aria-label="校验 JSON"]').trigger('click')
    expect(wrapper.text()).toContain('JSON 校验通过')
  })

  it('点击压缩按钮应输出压缩后的 JSON', async () => {
    const wrapper = mount(JsonFormatterTool)
    // 输入带缩进的 JSON
    await wrapper
      .find('textarea[aria-label="JSON 输入"]')
      .setValue('{\n  "name": "PanziPool",\n  "count": 7\n}')
    // 点击压缩按钮
    await wrapper.find('button[aria-label="压缩 JSON"]').trigger('click')
    const code = wrapper.find('pre code')
    // 压缩后应无多余空白
    expect(code.text()).toContain('{"name":"PanziPool","count":7}')
  })
})
