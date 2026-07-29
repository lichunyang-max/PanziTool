/**
 * device-detect.client.ts - 客户端设备检测与重定向插件
 *
 * 执行时机：Nuxt app:mounted 钩子（路由已完全初始化）
 *
 * 职责：
 * 1. 用 window.innerWidth 检测设备类型（Chrome DevTools 响应式模式不修改 UA）
 * 2. 若为移动端（宽度 <= 768），重定向到对应的 /mobile/ 路径
 * 3. 同步 isMobile 响应式状态供组件使用
 * 4. 挂载 resize 监听器，窗口尺寸跨越断点时动态切换
 */

import { getMobileRedirectPath, getDesktopRedirectPath } from '~/composables/useDevice'

const MOBILE_BREAKPOINT = 768

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const { detectDevice } = useDevice()
    const result = detectDevice()

    if (result.isMobile) {
      const currentPath = nuxtApp.$router.currentRoute.value.path
      const redirect = getMobileRedirectPath(currentPath)
      if (redirect && currentPath !== redirect) {
        nuxtApp.$router.replace(redirect)
        return
      }
    }

    // 挂载 resize 监听器
    const handleResize = () => {
      const { isMobile } = useDevice()
      const widthMobile = window.innerWidth > 0 && window.innerWidth <= MOBILE_BREAKPOINT

      if (widthMobile !== isMobile.value) {
        // 同步状态
        isMobile.value = widthMobile

        const currentPath = nuxtApp.$router.currentRoute.value.path
        if (widthMobile) {
          const redirect = getMobileRedirectPath(currentPath)
          if (redirect && currentPath !== redirect) {
            nuxtApp.$router.replace(redirect)
          }
        } else {
          const pcPath = getDesktopRedirectPath(currentPath)
          if (pcPath && currentPath !== pcPath) {
            nuxtApp.$router.replace(pcPath)
          }
        }
      }
    }

    window.addEventListener('resize', handleResize, { passive: true })
  })
})