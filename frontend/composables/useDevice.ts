/**
 * useDevice.ts - 设备检测 composable
 *
 * 职责：统一提供 isMobile 响应式状态与 detectDevice 检测方法
 *
 * 检测策略：
 * - SSR 阶段（含 Nitro prerender）：
 *   通过 nuxtApp.payload 注入 UA 信息（服务端渲染时由 server handler 写入），
 *   若无 payload UA 信息（纯静态 prerender 场景），默认按桌面设备处理，
 *   客户端水合后再通过 window.innerWidth 做精准检测（见 middleware/device-detect.global.ts）。
 *
 * - 客户端水合后：
 *   1) window.innerWidth <= 768 判定为移动设备（优先、最准确）
 *   2) User-Agent 包含 mobile 关键字作为兜底
 *
 * - 爬虫识别：
 *   若 UA 命中 Googlebot|Bingbot|Baiduspider|YandexBot|DuckDuckBot 等爬虫关键字，
 *   一律按桌面设备处理（避免爬虫被分流至移动端布局，影响 PC 端收录）。
 */



/** 移动端 UA 关键字（大小写不敏感） */
const MOBILE_UA_KEYWORDS = [
  'Mobile',
  'Android',
  'iPhone',
  'iPad',
  'iPod',
  'BlackBerry',
  'IEMobile',
  'Opera Mini',
]

/** 爬虫 UA 关键字（命中则按桌面设备处理） */
const CRAWLER_UA_KEYWORDS = [
  'Googlebot',
  'Bingbot',
  'Baiduspider',
  'YandexBot',
  'DuckDuckBot',
  'DuckDuckBot/1.1',
  'Baiduspider',
]

/** 移动端断点（px） */
const MOBILE_BREAKPOINT = 768

/** PC → Mobile 路由映射 */
const MOBILE_ROUTE_MAP: Record<string, string> = {
  '/': '/mobile/',
  '/about': '/mobile/about',
  '/privacy': '/mobile/privacy',
  '/category/developer': '/mobile/tools',
  '/category/image': '/mobile/image-tools',
}

/** Mobile → PC 路由映射 */
const DESKTOP_ROUTE_MAP: Record<string, string> = {
  '/mobile/': '/',
  '/mobile/about': '/about',
  '/mobile/privacy': '/privacy',
  '/mobile/tools': '/category/developer',
  '/mobile/image-tools': '/category/image',
}

/** PC 路径 → 移动端路径 */
export function getMobileRedirectPath(path: string): string | null {
  if (path.startsWith('/mobile')) return null
  if (path.startsWith('/admin')) return null
  if (MOBILE_ROUTE_MAP[path]) return MOBILE_ROUTE_MAP[path]
  const toolsMatch = path.match(/^\/tools\/(.+)$/)
  if (toolsMatch) return `/mobile/tools/${toolsMatch[1]}`
  const imageToolsMatch = path.match(/^\/image-tools\/(.+)$/)
  if (imageToolsMatch) return `/mobile/image-tools/${imageToolsMatch[1]}`
  return null
}

/** 移动端路径 → PC 路径 */
export function getDesktopRedirectPath(path: string): string | null {
  if (!path.startsWith('/mobile')) return null
  if (DESKTOP_ROUTE_MAP[path]) return DESKTOP_ROUTE_MAP[path]
  const toolsMatch = path.match(/^\/mobile\/tools\/(.+)$/)
  if (toolsMatch) return `/tools/${toolsMatch[1]}`
  const imageToolsMatch = path.match(/^\/mobile\/image-tools\/(.+)$/)
  if (imageToolsMatch) return `/image-tools/${imageToolsMatch[1]}`
  return null
}

export interface DeviceDetectionResult {
  /** 是否移动设备（爬虫强制为 false） */
  isMobile: boolean
  /** 是否为爬虫（用于 SEO 日志或后续策略） */
  isCrawler: boolean
  /** 触发检测的来源 */
  source: 'ssr-ua' | 'client-width' | 'client-ua' | 'unknown'
}

/**
 * 字符串命中关键字列表（大小写不敏感）
 */
function matchKeywords(source: string, keywords: string[]): boolean {
  if (!source) return false
  const lower = source.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

/**
 * 纯函数：根据 UA + 窗口宽度判定设备类型
 */
export function detectDeviceFromEnv(params: {
  userAgent?: string
  windowWidth?: number
}): DeviceDetectionResult {
  const { userAgent = '', windowWidth } = params

  // 1) 爬虫优先 -> 按桌面
  if (userAgent && matchKeywords(userAgent, CRAWLER_UA_KEYWORDS)) {
    return { isMobile: false, isCrawler: true, source: userAgent ? 'ssr-ua' : 'unknown' }
  }

  // 2) 客户端：宽度优先
  if (typeof windowWidth === 'number') {
    if (windowWidth > 0 && windowWidth <= MOBILE_BREAKPOINT) {
      return { isMobile: true, isCrawler: false, source: 'client-width' }
    }
    // 宽度大于断点 -> 桌面
    if (windowWidth > MOBILE_BREAKPOINT) {
      return { isMobile: false, isCrawler: false, source: 'client-width' }
    }
  }

  // 3) UA 兜底
  if (userAgent) {
    const isMobileUA = matchKeywords(userAgent, MOBILE_UA_KEYWORDS)
    return {
      isMobile: isMobileUA,
      isCrawler: false,
      source: userAgent.includes('Mozilla') ? 'client-ua' : 'ssr-ua',
    }
  }

  // 4) 未知环境 -> 桌面安全兜底
  return { isMobile: false, isCrawler: false, source: 'unknown' }
}

/**
 * useDevice - 响应式设备状态
 *
 * 使用 useState 保证 SSR 与客户端、跨组件共享同一份状态。
 * 在 Nitro prerender 静态场景下，初始值通过客户端 middleware 首次调用 detectDevice 确定。
 */
export function useDevice() {
  // useState key 必须唯一，跨请求共享安全
  const isMobile = useState<boolean>('pz:isMobile', () => false)

  /**
   * 执行设备检测并同步至响应式状态
   * @param userAgent SSR 阶段可从 headers 获取
   */
  function detectDevice(userAgent?: string): DeviceDetectionResult {
    let result: DeviceDetectionResult

    if (import.meta.client) {
      result = detectDeviceFromEnv({
        userAgent: userAgent ?? navigator.userAgent,
        windowWidth: window.innerWidth,
      })
    } else {
      // SSR 阶段：仅依赖 UA（若传入），否则按桌面安全兜底
      result = detectDeviceFromEnv({ userAgent })
    }

    isMobile.value = result.isMobile
    return result
  }

  /**
   * 客户端监听窗口尺寸变化：同步 isMobile 响应式状态
   * 返回 cleanup 函数（可在 onBeforeUnmount 中调用）
   *
   * 路由重定向由 plugins/device-detect.client.ts 统一处理
   */
  function setupResizeListener(): () => void {
    if (import.meta.server) return () => {}

    const handleResize = () => {
      const widthMobile = window.innerWidth > 0 && window.innerWidth <= MOBILE_BREAKPOINT
      if (widthMobile !== isMobile.value) {
        isMobile.value = widthMobile
      }
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

  return {
    isMobile,
    detectDevice,
    setupResizeListener,
  }
}

/**
 * SSR 专用：从 event.headers 提取 UA 并判定
 * 用于 server 端 handler / middleware 调用，将结果注入 payload
 */
export function detectDeviceFromRequest(headers: Record<string, string | string[] | undefined>): DeviceDetectionResult {
  const uaRaw = headers['user-agent'] ?? headers['User-Agent'] ?? ''
  const userAgent = Array.isArray(uaRaw) ? uaRaw[0] ?? '' : uaRaw
  return detectDeviceFromEnv({ userAgent })
}
