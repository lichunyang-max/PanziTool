// @nuxt/eslint flat config
// 由 @nuxt/eslint 模块自动生成 .nuxt/eslint.config.mjs，在此扩展
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // 全局规则覆盖（与 Prettier 协作，关闭风格类规则）
  rules: {
    // Vue 单文件组件相关
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
  },
})
