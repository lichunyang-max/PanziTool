// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import { process } from 'std-env'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // 开发环境：将构建目录重定向到临时目录（绕过沙箱写入限制）
  buildDir: process.env.NUXT_BUILD_DIR || '.nuxt',

  // SSR 模式：开发模式启用 SSR 以支持 HMR，生产构建也启用 SSR 以生成完整 HTML
  ssr: true,

  // Vite 开发服务器配置
  vite: {
    plugins: [tailwindcss()],
    cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.cache/vite',
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
  runtimeConfig: {
    apiBase: '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      // 百度统计 ID（国内用户分析）
      baiduTongjiId: '06c8d960aee8a68f0a9a229ff4a18ceb',
      // Google Analytics 4 Measurement ID（国际用户分析）
      ga4MeasurementId: process.env.NUXT_GA4_ID || 'G-TZ0LF39W77',
      adSlots: {
        homeTop: '',
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
        // 百度站长平台验证
        { name: 'baidu-site-verification', content: 'codeva-KAhMB4oexB' },
        // Google Search Console 验证（部署时通过环境变量覆盖）
        ...(process.env.NUXT_GSC_VERIFICATION
          ? [{ name: 'google-site-verification', content: process.env.NUXT_GSC_VERIFICATION }]
          : []),
      ],
      link: [
        // DNS 预解析：加速外部资源连接
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: 'https://hm.baidu.com' },
        { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
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
  nitro: {
    preset: 'static',
    routeRules: {
      '/**': { prerender: true },
    },
    prerender: {
      crawlLinks: true,
      failOnError: false,
      routes: [
        '/sitemap.xml',
        '/',
        '/category/developer',
        '/category/image',
        '/about',
        '/privacy',
        '/tools/json-formatter',
        '/tools/regex-tester',
        '/tools/timestamp',
        '/tools/url-encode',
        '/tools/jwt-decoder',
        '/tools/base64',
        '/tools/hash',
        '/tools/cron',
        '/tools/qr-code',
        '/tools/image-compress',
        '/tools/image-crop',
        '/tools/image-convert',
        '/tools/id-photo',
      ],
    },
  },

  // 全局路由配置：无尾斜杠
  router: {
    trailingSlash: false,
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // ESLint 配置
  eslint: {
    config: {
      stylistic: false,
    },
  },

  // 实验性功能
  experimental: {
    typedPages: true,
  },
})
