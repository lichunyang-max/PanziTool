/**
 * useAnalytics.ts - 事件上报客户端 composable
 *
 * - reportEvent(event_type, tool_slug?) 事件上报
 * - 非阻塞 fire-and-forget（fetch + catch 静默忽略）
 * - 页面卸载前通过 sendBeacon 发送剩余事件
 * - page_view 事件：客户端水合后上报，路由切换去重
 */

type EventType = 'page_view' | 'tool_use' | 'copy' | 'download'

interface AnalyticsEvent {
  event_type: EventType
  tool_slug?: string
  anon_id: string
  timestamp: number
}

const EVENT_QUEUE: AnalyticsEvent[] = []
const MAX_QUEUE_SIZE = 50
const FLUSH_INTERVAL = 5000 // 5s 批量发送
const SENT_PAGE_VIEWS = new Set<string>()

let flushTimer: ReturnType<typeof setInterval> | null = null
let beaconSent = false

function getAnonId(): string {
  if (import.meta.server) return ''
  let id = localStorage.getItem('panzipool_anon_id')
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
    localStorage.setItem('panzipool_anon_id', id)
  }
  return id
}

let cachedApiBase: string | null = null

function getApiBase(): string {
  if (cachedApiBase) return cachedApiBase
  const config = useRuntimeConfig()
  cachedApiBase = import.meta.server ? config.apiBase : config.public.apiBase
  return cachedApiBase
}

async function flushEvents(): Promise<void> {
  if (EVENT_QUEUE.length === 0) return
  const events = [...EVENT_QUEUE]
  EVENT_QUEUE.length = 0

  try {
    const baseURL = getApiBase()
    await fetch(`${baseURL}/api/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    })
  } catch {
    // 静默忽略上报失败
  }
}

function sendBeaconFlush(): void {
  if (beaconSent || EVENT_QUEUE.length === 0) return
  beaconSent = true

  const baseURL = getApiBase()
  const blob = new Blob([JSON.stringify({ events: [...EVENT_QUEUE] })], {
    type: 'application/json',
  })
  EVENT_QUEUE.length = 0
  navigator.sendBeacon(`${baseURL}/api/v1/events`, blob)
}

/**
 * 将关键事件同步至百度统计（运营分析）
 *
 * 映射规则：
 * - tool_use  → 百度统计事件(category: 'tool', action: 'use',      value: toolSlug)
 * - copy      → 百度统计事件(category: 'tool', action: 'copy',     value: toolSlug)
 * - download  → 百度统计事件(category: 'tool', action: 'download', value: toolSlug)
 * - page_view 不同步（百度统计 hm.js 自动上报 PV）
 *
 * 通过 window._hmt.push 直接发送，独立于自建统计队列（不阻塞、不影响自建逻辑）。
 * 仅在客户端被调用：reportEvent 在 SSR 阶段已被替换为空操作。
 * _hmt 类型由 composables/useBaiduTongji.ts 全局声明。
 */
function syncToBaiduTongji(type: EventType, toolSlug?: string): void {
  // page_view 由百度统计自动上报，无需同步
  if (type === 'page_view') return

  // 事件动作映射
  const actionMap: Record<'tool_use' | 'copy' | 'download', string> = {
    tool_use: 'use',
    copy: 'copy',
    download: 'download',
  }
  const action = actionMap[type]

  // 工具事件以 toolSlug 作为事件值，缺失则跳过
  if (!toolSlug) return

  // 直接通过 _hmt.push 发送，独立于自建统计队列
  window._hmt?.push(['_trackEvent', 'tool', action, toolSlug])
}

export function useAnalytics() {
  if (import.meta.server) {
    return {
      reportEvent: (_type: EventType, _slug?: string) => {},
      reportPageView: (_path: string) => {},
    }
  }

  // 启动定时批量发送
  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL)
    window.addEventListener('beforeunload', sendBeaconFlush)
    window.addEventListener('pagehide', sendBeaconFlush)
  }

  /**
   * 上报事件（fire-and-forget）
   *
   * 同时完成两件事：
   * 1. 自建统计：事件入队，批量发送至 PanziPool 后端（站内展示计数）
   * 2. 百度统计：同步关键事件至百度统计（运营分析），见 syncToBaiduTongji
   */
  function reportEvent(type: EventType, toolSlug?: string): void {
    // 同步关键事件至百度统计（运营分析），独立于自建统计队列
    syncToBaiduTongji(type, toolSlug)

    if (EVENT_QUEUE.length >= MAX_QUEUE_SIZE) return

    EVENT_QUEUE.push({
      event_type: type,
      tool_slug: toolSlug,
      anon_id: getAnonId(),
      timestamp: Date.now(),
    })
  }

  /**
   * 上报 page_view 事件（路由切换去重）
   */
  function reportPageView(path: string): void {
    // 去重：同一路径短时间内不重复上报
    if (SENT_PAGE_VIEWS.has(path)) return
    SENT_PAGE_VIEWS.add(path)

    // 限制 set 大小
    if (SENT_PAGE_VIEWS.size > 100) {
      const first = SENT_PAGE_VIEWS.values().next().value
      if (first) {
        SENT_PAGE_VIEWS.delete(first)
      }
    }

    reportEvent('page_view')
  }

  return { reportEvent, reportPageView }
}
