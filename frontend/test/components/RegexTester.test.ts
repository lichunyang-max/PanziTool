// @vitest-environment nuxt
/**
 * RegexTesterTool.vue 组件渲染测试
 *
 * 测试要点：
 * - 组件可挂载并渲染正则输入栏
 * - 正则输入框存在
 * - 挂载后默认正则匹配默认文本（找到 2 个匹配）
 * - 修改正则后点击执行更新匹配结果
 * - 清空按钮清空输入和结果
 *
 * mock 策略：
 * - vi.mock('~/composables/useAnalytics')：避免事件上报干扰
 * - vi.useFakeTimers：避免防抖 watch 中的 setTimeout 自动触发
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegexTesterTool from '~/components/tool/RegexTesterTool.vue'

// mock useAnalytics 避免事件上报干扰（RegexTesterTool 显式导入该 composable）
vi.mock('~/composables/useAnalytics', () => ({
  useAnalytics: () => ({
    reportEvent: vi.fn(),
    reportPageView: vi.fn(),
  }),
}))

describe('RegexTesterTool 组件渲染测试', () => {
  beforeEach(() => {
    // 使用假定时器，避免防抖 watch 的 setTimeout(execute, 300) 自动触发
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('组件应可挂载并渲染正则输入栏', () => {
    const wrapper = mount(RegexTesterTool, {
      props: { slug: 'regex-tester' },
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('正则')
  })

  it('应包含正则表达式输入框', () => {
    const wrapper = mount(RegexTesterTool, {
      props: { slug: 'regex-tester' },
    })
    const input = wrapper.find('#pz-regex-input')
    expect(input.exists()).toBe(true)
  })

  it('挂载后默认正则应匹配默认文本（找到 2 个匹配）', async () => {
    const wrapper = mount(RegexTesterTool, {
      props: { slug: 'regex-tester' },
    })
    // 等待 onMounted 中的 execute() 执行完成
    await flushPromises()
    // 默认正则 \b(\w+)@(\w+)\.(\w+)\b 匹配 support@panzipool.com 和 admin@example.org
    expect(wrapper.text()).toContain('找到 2 个匹配')
  })

  it('修改正则后点击执行应更新匹配结果', async () => {
    const wrapper = mount(RegexTesterTool, {
      props: { slug: 'regex-tester' },
    })
    // 修改正则为 admin
    await wrapper.find('#pz-regex-input').setValue('admin')
    // 点击"执行"按钮（唯一的 pz-btn-primary）
    await wrapper.find('button.pz-btn-primary').trigger('click')
    // admin@example.org 中匹配 1 个
    expect(wrapper.text()).toContain('找到 1 个匹配')
  })

  it('点击清空按钮应清空输入和结果', async () => {
    const wrapper = mount(RegexTesterTool, {
      props: { slug: 'regex-tester' },
    })
    // 点击"清空"按钮
    const clearBtn = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === '清空')
    expect(clearBtn).toBeTruthy()
    await clearBtn!.trigger('click')
    // 清空后匹配数为 0，显示空状态
    expect(wrapper.text()).toContain('找到 0 个匹配')
    expect(wrapper.text()).toContain('暂无匹配结果')
  })
})
