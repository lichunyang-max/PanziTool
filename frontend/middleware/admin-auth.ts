/**
 * admin-auth.ts - 管理后台路由中间件
 *
 * 检查登录状态：
 * - 客户端：检查 localStorage 中的 admin_logged_in 标记
 * - 服务端 (SSR)：检查 admin_token Cookie 是否存在
 * 若未登录则重定向到 /admin/login。
 *
 * 说明：admin_token 为 HttpOnly cookie（由后端设置），
 * 客户端 JS 无法读取，因此使用单独的 localStorage 标记
 * 作为前端登录状态标识。SSR 环境下通过 Cookie 头检查。
 * 后端拦截器仍会校验真实 token。
 */

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) {
    const loggedIn = localStorage.getItem('admin_logged_in')
    if (!loggedIn) {
      return navigateTo('/admin/login')
    }
  } else if (import.meta.server) {
    // SSR 环境下通过 Cookie 头检查是否有 admin_token
    const event = useRequestEvent()
    const cookieHeader = event?.node?.req?.headers?.cookie || ''
    if (!cookieHeader.includes('admin_token=')) {
      return navigateTo('/admin/login')
    }
  }
})
