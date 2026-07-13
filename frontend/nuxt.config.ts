// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // SSR 模式（默认开启，显式声明以明确意图）
  ssr: true,

  // 注册 Tailwind CSS v4 Vite 插件（v4 推荐方式）
  vite: {
    plugins: [tailwindcss()],
  },

  // 全局样式入口（含 PanziPool 设计系统）
  css: ['~/assets/css/main.css'],

  // 模块
  modules: ['@nuxt/eslint'],

  // 运行时配置：环境相关配置，避免硬编码
  // - apiBase: 服务端内网地址（SSR 阶段使用，如 Docker 内网 http://java-api:8080）
  // - public.apiBase: 客户端公开地址（如 https://www.panzipool.com/api）
  runtimeConfig: {
    apiBase: process.env.NUXT_API_BASE || 'http://localhost:8080',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
      baiduTongjiId: '06c8d960aee8a68f0a9a229ff4a18ceb',
      adSlots: {
        homeTop: '', // 广告位 key，空字符串表示未配置
        sidebar: '',
        toolBottom: '',
      },
    },
  },

  // 应用全局 head 配置：字体、基础 meta、SEO 模板
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
        class: 'light',
        'data-theme': 'light',
      },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1.0',
      titleTemplate: '%s | PanziPool 工具聚合站',
      title: 'PanziPool 工具聚合站',
      meta: [
        {
          name: 'description',
          content:
            'PanziPool 在线工具聚合站 - JSON格式化、URL编码、Base64、时间戳、正则测试、JWT解析、哈希计算及图片压缩裁剪等开发者与图片工具，无需安装，隐私优先。',
        },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        // Google Fonts: Inter + Noto Sans SC + JetBrains Mono
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap',
        },
        // Favicon
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  // Nitro 配置：trailing slash 规范（全站无尾斜杠）
  nitro: {
    routeRules: {
      // 预渲染规则将在后续 Task 中按页面配置
    },
  },

  // 全局路由配置：无尾斜杠
  router: {
    trailingSlash: false,
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: false, // 开发阶段关闭自动类型检查以加速，通过 lint 覆盖
  },

  // ESLint 配置
  eslint: {
    config: {
      stylistic: false, // 使用 Prettier 处理代码风格
    },
  },

  // 实验性功能
  experimental: {
    // 允许在组件中使用 typed pages 路由
    typedPages: true,
  },
})
