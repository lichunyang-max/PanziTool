import type { ResourceCategoryNode } from './types'

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
 * 获取完整资源树（一级目录 → 二级目录 → 资源）。
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
