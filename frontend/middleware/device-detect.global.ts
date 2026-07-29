/**
 * device-detect.global.ts - 全局路由中间件：设备检测与路由映射
 *
 * 职责：
 * 1. 在 SSR 阶段通过 headers.User-Agent 判定设备类型，
 *    并将结果写入 nuxtApp.payload.pzDevice，供客户端水合时使用。
 * 2. 在客户端每次路由切换时，通过 detectDevice()
 *    根据 window.innerWidth 做精准判定，同步 isMobile 响应式状态。
 * 3. 移动端用户自动重定向到 /mobile/ 路径下的移动端页面。
 * 4. 爬虫保持 PC 端路径不变（确保 SEO）。
 *
 * 注意：客户端始终以 window.innerWidth 为准，不信任 SSR UA 判定结果，
 * 因为 Chrome DevTools 响应式模式不修改 UA，仅改变视口尺寸。
 */

import { detectDeviceFromRequest, useDevice, getMobileRedirectPath } from '~/composables/useDevice'

export default defineNuxtRouteMiddleware((to) => {
  const { isMobile, detectDevice } = useDevice()

  // --- 1) SSR 阶段：从 event.headers 读取 UA 判定 ---
  if (import.meta.server) {
    const nuxtApp = useNuxtApp() as NuxtApp & {
      ssrContext?: { event?: { headers: Record<string, string | string[] | undefined> } }
    }
    const event = nuxtApp.ssrContext?.event
    if (event) {
      const result = detectDeviceFromRequest(event.headers)
      nuxtApp.payload.pzDevice = {
        isMobile: result.isMobile,
        isCrawler: result.isCrawler,
        source: result.source,
      }
      isMobile.value = result.isMobile

      // 移动端 SSR 重定向
      if (result.isMobile && !result.isCrawler) {
        const redirect = getMobileRedirectPath(to.path)
        if (redirect) {
          return navigateTo(redirect, { replace: true })
        }
      }
    }
  }

  // --- 2) 客户端：始终用 window.innerWidth 重新检测 ---
  if (import.meta.client) {
    detectDevice()

    // 移动端客户端重定向
    if (isMobile.value) {
      const redirect = getMobileRedirectPath(to.path)
      if (redirect) {
        return navigateTo(redirect, { replace: true })
      }
    }
  }
})