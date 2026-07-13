// @vitest-environment nuxt
/**
 * TimestampTool.vue 组件渲染测试
 *
 * 测试要点：
 * - 组件可挂载并渲染实时时间戳卡片
 * - 时间戳输入框存在
 * - 输入合法时间戳后转换功能正常
 * - 输入无效时间戳显示错误提示
 *
 * mock 策略：
 * - vi.mock('~/composables/useAnalytics')：避免事件上报干扰
 * - vi.useFakeTimers：避免 onMounted 中的 setInterval 持续触发
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TimestampTool from '~/components/tool/TimestampTool.vue'

// mock useAnalytics 避免事件上报干扰（TimestampTool 显式导入该 composable）
vi.mock('~/composables/useAnalytics', () => ({
  useAnalytics: () => ({
    reportEvent: vi.fn(),
    reportPageView: vi.fn(),
  }),
}))

describe('TimestampTool 组件渲染测试', () => {
  beforeEach(() => {
    // 使用假定时器，避免 onMounted 中的 setInterval(updateLive, 1000) 持续触发
    vi.useFakeTimers()
    // 固定系统时间，保证实时时间戳计算可复现
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('组件应可挂载并渲染实时时间戳卡片', () => {
    const wrapper = mount(TimestampTool, { props: { slug: 'timestamp' } })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('当前 Unix 时间戳')
  })

  it('应包含时间戳输入框', () => {
    const wrapper = mount(TimestampTool, { props: { slug: 'timestamp' } })
    const input = wrapper.find('#pz-ts-input')
    expect(input.exists()).toBe(true)
  })

  it('输入合法时间戳后点击转换应显示日期时间', async () => {
    const wrapper = mount(TimestampTool, { props: { slug: 'timestamp' } })
    // 输入秒级时间戳 1698765432（UTC+8 → 2023-10-31 23:17:12）
    await wrapper.find('#pz-ts-input').setValue('1698765432')
    // 点击左栏"转换"按钮（第一个 pz-btn-primary）
    await wrapper.find('button.pz-btn-primary').trigger('click')
    // 第一个 .pz-conv-output 是日期时间输出
    const outputs = wrapper.findAll('.pz-conv-output')
    expect(outputs[0].text()).toContain('2023-10-31 23:17:12')
  })

  it('输入无效时间戳应显示错误提示', async () => {
    const wrapper = mount(TimestampTool, { props: { slug: 'timestamp' } })
    await wrapper.find('#pz-ts-input').setValue('abc')
    await wrapper.find('button.pz-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('无效的时间戳输入：非数字')
  })

  it('应包含时区选择按钮组', () => {
    const wrapper = mount(TimestampTool, { props: { slug: 'timestamp' } })
    expect(wrapper.text()).toContain('时区选择')
    // 默认选中北京时间
    const beijingBtn = wrapper.findAll('button.pz-tz-pill').find((b) =>
      b.text().includes('北京时间'),
    )
    expect(beijingBtn).toBeTruthy()
  })
})
