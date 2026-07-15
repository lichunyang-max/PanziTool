/**
 * useAnonId.ts - 匿名 ID 管理 composable
 *
 * 在 localStorage 生成/读取 UUID（匿名 anon_id）
 * 管理 liked_tools 列表（localStorage，JSON 数组）
 * - 存储格式：{slug}_{YYYY-MM-DD} 键（按自然天管理）
 * - isLiked(slug) 判断今日是否已点赞
 * - addLiked(slug) 添加到当日已点赞列表
 * - 旧记录因日期不匹配自动失效，无需清理
 */

const ANON_ID_KEY = 'panzipool_anon_id'
const LIKED_TOOLS_KEY = 'panzipool_liked_tools'

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 获取今日日期（YYYY-MM-DD，UTC）
 */
function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function getAnonId(): string {
  if (import.meta.server) return ''
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = generateUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

function getLikedTools(): string[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(LIKED_TOOLS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

function setLikedTools(tools: string[]): void {
  if (import.meta.server) return
  localStorage.setItem(LIKED_TOOLS_KEY, JSON.stringify(tools))
}

export function useAnonId() {
  const anonId = ref('')

  // 客户端水合后初始化
  if (import.meta.client) {
    anonId.value = getAnonId()
  }

  const likedTools = ref<string[]>([])

  if (import.meta.client) {
    likedTools.value = getLikedTools()
  }

  /**
   * 判断今日是否已点赞某工具
   * 按 {slug}_{YYYY-MM-DD} 键查找；旧记录因日期不匹配自动失效
   */
  function isLiked(slug: string): boolean {
    return likedTools.value.includes(`${slug}_${getToday()}`)
  }

  /**
   * 添加工具到当日已点赞列表
   * 存储为 {slug}_{YYYY-MM-DD} 键，自然天滚动后自动失效
   */
  function addLiked(slug: string): void {
    const key = `${slug}_${getToday()}`
    if (!likedTools.value.includes(key)) {
      likedTools.value.push(key)
      setLikedTools(likedTools.value)
    }
  }

  return {
    anonId: readonly(anonId),
    likedTools: readonly(likedTools),
    isLiked,
    addLiked,
  }
}
