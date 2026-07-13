/**
 * plugins/baidu-tongji.ts - 百度统计插件
 *
 * 职责：
 * 1. 客户端异步注入百度统计 hm.js 脚本（async 加载，不阻塞首屏渲染）
 * 2. 监听 SPA 路由切换，通过 trackPageView 上报 PV
 *
 * 设计要点：
 * - 百度统计 ID 通过 runtimeConfig.public.baiduTongjiId 管理，不硬编码
 * - SSR 阶段不执行任何统计代码（不注入脚本、不注册路由钩子）
 * - 百度统计仅用于运营分析（PV/UV、用户行为路径），与自建统计
 *   （useAnalytics，站内展示计数）职责分离，互不干扰
 * - 首屏 PV 由 hm.js 加载后自动上报，afterEach 仅负责后续 SPA 路由切换
 */
export default defineNuxtPlugin(() => {
  // SSR 阶段跳过，不注入任何统计脚本
  if (import.meta.server) return

  const config = useRuntimeConfig()
  const tongjiId = config.public.baiduTongjiId
  // 未配置统计 ID 时静默跳过（如本地开发未配置）
  if (!tongjiId) return

  // 初始化 _hmt 指令队列：hm.js 加载前缓存的指令会在脚本加载完成后依次执行
  window._hmt = window._hmt || []

  // 异步加载 hm.js，不阻塞首屏渲染
  const hm = document.createElement('script')
  hm.src = `https://hm.baidu.com/hm.js?${tongjiId}`
  hm.async = true
  const s = document.getElementsByTagName('script')[0]
  s?.parentNode?.insertBefore(hm, s)

  // SPA 路由切换 PV 统计：复用 composable 提供的安全上报方法
  const { trackPageView } = useBaiduTongji()
  const router = useRouter()
  router.afterEach((to) => {
    trackPageView(to.fullPath)
  })
})
