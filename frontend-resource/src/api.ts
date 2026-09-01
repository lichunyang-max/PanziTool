import type {
  LikeResult,
  ResourceCategoryNode,
  ResourceItemDetail,
} from './types'

/**
 * 统一 API 客户端。
 *
 * API_BASE 默认为空（相对路径），生产环境由 Nginx 同域反代 /api/v1/ 到后端；
 * 如需直连后端，可在打包时通过 VITE_API_BASE 环境变量覆盖。
 */
const API_BASE: string = import.meta.env.VITE_API_BASE || ''

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

/**
 * 获取完整资源树（一级目录 → 二级目录 → 资源，资源按下载次数降序）。
 */
export async function fetchResourceTree(): Promise<ResourceCategoryNode[]> {
  const res = await fetch(`${API_BASE}/api/v1/resources/tree`)
  if (!res.ok) {
    throw new Error(`请求失败 (${res.status})`)
  }
  const json = (await res.json()) as ApiResponse<ResourceCategoryNode[]>
  if (json.code !== 0) {
    throw new Error(json.message || '获取资源数据失败')
  }
  return json.data ?? []
}

/**
 * 获取资源详情。
 */
export async function fetchResourceDetail(id: number): Promise<ResourceItemDetail> {
  const res = await fetch(`${API_BASE}/api/v1/resources/items/${id}`)
  if (!res.ok) {
    throw new Error(res.status === 404 ? '资源不存在或已下线' : `请求失败 (${res.status})`)
  }
  const json = (await res.json()) as ApiResponse<ResourceItemDetail>
  if (json.code !== 0) {
    throw new Error(json.message || '获取资源详情失败')
  }
  return json.data
}

/**
 * 记录一次下载（点击跳转时调用）。
 */
export async function recordDownload(id: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/resources/items/${id}/download`, { method: 'POST' })
  } catch {
    // 下载计数失败静默忽略，不阻断跳转
  }
}

/**
 * 点赞资源。返回 null 表示重复点赞（已点过）。
 */
export async function likeResource(id: number, anonId: string): Promise<LikeResult | null> {
  const res = await fetch(`${API_BASE}/api/v1/resources/items/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anon_id: anonId }),
  })
  const json = (await res.json()) as ApiResponse<LikeResult>
  if (res.status === 409) {
    // 重复点赞：携带当前次数
    return json.data ?? null
  }
  if (json.code !== 0) {
    throw new Error(json.message || '点赞失败')
  }
  return json.data
}

// ============================================================================
// 匿名用户 ID（localStorage UUID），用于点赞防刷
// ============================================================================

const ANON_ID_KEY = 'panzi_resource_anon_id'

/** 已点赞的资源 ID 列表（localStorage，避免刷新后重复点赞提示） */
const LIKED_KEY = 'panzi_resource_liked'

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // 兼容降级：简易 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 获取（或首次生成）匿名用户 ID。
 */
export function getAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = generateUuid()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

/**
 * 本地是否已点赞某资源。
 */
export function isLikedLocal(id: number): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]') as number[]
    return list.includes(id)
  } catch {
    return false
  }
}

/**
 * 标记本地已点赞。
 */
export function markLikedLocal(id: number): void {
  try {
    const list = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]') as number[]
    if (!list.includes(id)) {
      list.push(id)
      localStorage.setItem(LIKED_KEY, JSON.stringify(list))
    }
  } catch {
    // 忽略 localStorage 异常
  }
}
