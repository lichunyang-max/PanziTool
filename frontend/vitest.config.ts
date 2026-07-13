import { defineVitestConfig } from '@nuxt/test-utils/config'

/**
 * Vitest 配置
 * - 默认使用 happy-dom 环境（快速，适合纯函数单测）
 * - 组件测试可通过文件内 // @vitest-environment nuxt 注释切换到 nuxt 环境
 * - 后续 Task 22 将完善前端测试覆盖
 */
export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    include: [
      'test/**/*.{test,spec}.{js,ts}',
      'utils/**/*.{test,spec}.{js,ts}',
    ],
    exclude: ['node_modules', '.nuxt', '.output', 'dist'],
  },
})
