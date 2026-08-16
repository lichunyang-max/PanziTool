/**
 * useAnalytics.ts - 事件上报客户端 composable
 *
 * - reportEvent(event_type, tool_slug?) 事件上报
 * - 非阻塞 fire-and-forget（fetch + catch 静默忽略）
 * - 页面卸载前通过 sendBeacon 发送剩余事件
 * - page_view 事件：客户端水合后上报，路由切换去重
 *
 * 多渠道同步：
 * - 自建统计：事件入队批量发送至后端（站内展示计数）
 * - 百度统计：同步关键事件至 hm.js（国内运营分析）
 * - GA4：同步关键事件至 gtag（国际用户分析）
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
const FLUSH_INTERVAL = 5000
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
 * 同步关键事件至百度统计 + GA4
 */
function syncToExternalAnalytics(type: EventType, toolSlug?: string): void {
  // page_view 由各统计平台自动/插件上报，无需手动同步
  if (type === 'page_view') return

  const actionMap: Record<'tool_use' | 'copy' | 'download', string> = {
    tool_use: 'use',
    copy: 'copy',
    download: 'download',
  }
  const action = actionMap[type]

  if (!toolSlug) return

  // 百度统计
  window._hmt?.push(['_trackEvent', 'tool', action, toolSlug])

  // GA4
  window.gtag?.('event', type, { tool_slug: toolSlug })
}

export function useAnalytics() {
  if (import.meta.server) {
    return {
      reportEvent: (_type: EventType, _slug?: string) => {},
      reportPageView: (_path: string) => {},
    }
  }

  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL)
    window.addEventListener('beforeunload', sendBeaconFlush)
    window.addEventListener('pagehide', sendBeaconFlush)
  }

  function reportEvent(type: EventType, toolSlug?: string): void {
    // 同步关键事件至百度统计 + GA4
    syncToExternalAnalytics(type, toolSlug)

    if (EVENT_QUEUE.length >= MAX_QUEUE_SIZE) return

    EVENT_QUEUE.push({
      event_type: type,
      tool_slug: toolSlug,
      anon_id: getAnonId(),
      timestamp: Date.now(),
    })
  }

  function reportPageView(path: string): void {
    if (SENT_PAGE_VIEWS.has(path)) return
    SENT_PAGE_VIEWS.add(path)

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
