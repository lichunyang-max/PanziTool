/**
 * plugins/ga4.client.ts - Google Analytics 4 插件
 *
 * 职责：
 * 1. 客户端异步注入 GA4 gtag.js 脚本
 * 2. 监听 SPA 路由切换，上报 page_view 事件
 *
 * 设计要点：
 * - GA4 Measurement ID 通过 runtimeConfig.public.ga4MeasurementId 管理
 * - SSR 阶段不执行任何统计代码
 * - 与百度统计职责分离：GA4 负责国际用户分析，百度统计负责国内用户分析
 * - 未配置 ID 时静默跳过（本地开发环境）
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  const measurementId = config.public.ga4MeasurementId as string
  if (!measurementId) return

  // 初始化 gtag
  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  gtag('js', new Date())
  gtag('config', measurementId, {
    send_page_view: false, // 手动控制 page_view 上报，避免重复
  })

  // 异步加载 gtag.js
  const gtagScript = document.createElement('script')
  gtagScript.async = true
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(gtagScript)

  // 将 gtag 函数挂载到 window 供 composable 使用
  window.gtag = gtag

  // SPA 路由切换 PV 统计
  const router = useRouter()
  router.afterEach((to) => {
    gtag('event', 'page_view', {
      page_path: to.fullPath,
      page_title: document.title,
    })
  })
})
