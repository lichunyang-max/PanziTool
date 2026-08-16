/**
 * useGA4.ts - Google Analytics 4 事件上报 composable
 *
 * 封装 gtag 调用，提供类型安全的事件埋点接口：
 * - trackPageView(path)  SPA 路由切换 PV 统计
 * - trackEvent(action, params?)  自定义事件埋点
 * - trackToolUse(slug)  工具使用事件
 * - trackCopy(slug)  复制事件
 * - trackDownload(slug)  下载事件
 *
 * 安全性：
 * - SSR 阶段返回空操作，不访问 window
 * - 若 gtag 未加载则静默忽略
 */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function useGA4() {
  if (import.meta.server) {
    return {
      trackPageView: (_path: string) => {},
      trackEvent: (_action: string, _params?: Record<string, unknown>) => {},
      trackToolUse: (_slug: string) => {},
      trackCopy: (_slug: string) => {},
      trackDownload: (_slug: string) => {},
    }
  }

  function trackPageView(path: string): void {
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_title: document.title,
    })
  }

  function trackEvent(action: string, params?: Record<string, unknown>): void {
    window.gtag?.('event', action, params)
  }

  function trackToolUse(slug: string): void {
    trackEvent('tool_use', { tool_slug: slug })
  }

  function trackCopy(slug: string): void {
    trackEvent('copy', { tool_slug: slug })
  }

  function trackDownload(slug: string): void {
    trackEvent('download', { tool_slug: slug })
  }

  return { trackPageView, trackEvent, trackToolUse, trackCopy, trackDownload }
}
