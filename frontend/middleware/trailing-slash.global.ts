/**
 * trailing-slash.global.ts - 全站无尾斜杠规范中间件
 *
 * 规则：全站统一无尾斜杠（trailing slash）
 * - 根路径 '/' 保留
 * - 其他路径若以 '/' 结尾，则 301 重定向到去除尾斜杠的版本
 * - 保留 query 与 hash
 *
 * 与 nginx 配置（后续 Task 23）共同强制 trailing slash 规范，
 * 配合 <link rel="canonical"> 避免 SEO 重复内容问题
 */
export default defineNuxtRouteMiddleware((to) => {
  // 根路径保留，不处理
  if (to.path === '/') return

  // 路径长度 > 1 且以 '/' 结尾时，重定向去除尾斜杠
  if (to.path.length > 1 && to.path.endsWith('/')) {
    const path = to.path.replace(/\/+$/, '') || '/'
    return navigateTo(
      {
        path,
        query: to.query,
        hash: to.hash,
      },
      { redirectCode: 301 },
    )
  }
})
