/**
 * useBaiduTongji.ts - 百度统计事件上报 composable
 *
 * 封装百度统计 _hmt.push 调用，提供类型安全的事件埋点接口：
 * - trackPageView(path)  SPA 路由切换 PV 统计
 * - trackEvent(category, action, value?)  事件埋点
 *
 * 安全性：
 * - SSR 阶段返回空操作，不访问 window
 * - 若 _hmt 队列不存在则静默忽略（可选链），不影响业务逻辑
 *
 * 职责边界：百度统计仅用于运营分析（PV/UV、用户行为路径），
 * 与自建统计 useAnalytics（站内展示：工具使用次数、点赞次数）职责分离。
 */

/** 百度统计 _hmt 指令队列：每个元素为一条命令数组，格式由百度统计官方定义 */
declare global {
  interface Window {
    _hmt?: unknown[]
  }
}

export function useBaiduTongji() {
  // SSR 阶段为空操作，避免访问 window
  if (import.meta.server) {
    return {
      trackPageView: (_path: string) => {},
      trackEvent: (_category: string, _action: string, _value?: string) => {},
    }
  }

  /**
   * 上报页面浏览（SPA 路由切换 PV）
   * @param path 页面完整路径（如 /tool/json-formatter）
   */
  function trackPageView(path: string): void {
    window._hmt?.push(['_trackPageView', path])
  }

  /**
   * 上报事件埋点
   * @param category 事件类别（如 tool）
   * @param action   事件动作（如 use、copy、download）
   * @param value    事件值（如 toolSlug）
   */
  function trackEvent(category: string, action: string, value?: string): void {
    if (value !== undefined) {
      window._hmt?.push(['_trackEvent', category, action, value])
    } else {
      window._hmt?.push(['_trackEvent', category, action])
    }
  }

  return { trackPageView, trackEvent }
}
