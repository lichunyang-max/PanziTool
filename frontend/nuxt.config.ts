// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import { process } from 'std-env'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // SSR 模式：开发模式启用 SSR 以支持 HMR，生产构建也启用 SSR 以生成完整 HTML
  ssr: true,

  // Vite 开发服务器配置
  vite: {
    plugins: [tailwindcss()],
    // 开发环境代理：将 /api/ 转发到后端（模拟生产 Nginx 反代，避免跨域）
    server: {
      proxy: {
        '/api/': {
          target: process.env.NUXT_API_BASE || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  },

  // 全局样式入口（含 PanziPool 设计系统）
  css: ['~/assets/css/main.css'],

  // 模块
  modules: ['@nuxt/eslint'],

  // 运行时配置：环境相关配置，避免硬编码
  // - apiBase: 服务端内网地址（SSR 阶段使用，如 Docker 内网 http://java-api:8080）
  // - public.apiBase: 客户端公开地址（如 https://www.panzipool.com/api）
  runtimeConfig: {
    // 纯静态模式：SSR 已关闭，apiBase 不再使用，保留兼容
    apiBase: '',
    public: {
      // 空字符串 = 使用相对路径，API 请求自动跟随当前页面域名
      // 开发时可通过 .env 覆盖为 http://localhost:8080
      // 生产环境由 Nginx 反向代理 /api/ 到后端
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
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
      titleTemplate: '%s | 盘子工具站',
      title: '盘子工具站',
      meta: [
        {
          name: 'description',
          content:
            '盘子工具站 - JSON格式化、URL编码、Base64、时间戳、正则测试、JWT解析、哈希计算及图片压缩裁剪等开发者与图片工具，无需安装，隐私优先。',
        },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'baidu-site-verification', content: 'codeva-KAhMB4oexB' },
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

  // Nitro 配置：静态预渲染（构建时生成所有路由的完整 HTML，利于 SEO / 百度收录）
  // dev 模式下 nuxt dev 会忽略此预设，使用内置开发服务器
  nitro: {
    preset: 'static',
    routeRules: {
      '/**': { prerender: true },
    },
    prerender: {
      crawlLinks: true, // 从页面中的 <NuxtLink> 爬取所有路由
      failOnError: false, // API 不可用时降级渲染，不中断构建
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
