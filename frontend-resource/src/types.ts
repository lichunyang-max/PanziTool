/**
 * 资源站类型定义（与后端 /api/v1/resources/* 响应结构对应）。
 */

/** 资源条目（卡片展示用，来自资源树） */
export interface ResourceItem {
  id: number
  name: string
  url: string
  /** 图标图片 URL，null 时前端展示默认图标 */
  image: string | null
  /** 资源描述，悬停展示 */
  description: string | null
  /** 下载次数 */
  downloadCount: number
  /** 点赞次数 */
  likeCount: number
  sortOrder: number
}

/** 目录树节点（一级目录 → 二级目录 → 资源） */
export interface ResourceCategoryNode {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
  children: ResourceCategoryNode[]
  items: ResourceItem[]
}

/** 资源详情（/resources/items/{id} 响应） */
export interface ResourceItemDetail {
  id: number
  categoryId: number
  categoryName: string | null
  rootCategoryName: string | null
  name: string
  url: string
  image: string | null
  description: string | null
  downloadCount: number
  likeCount: number
}

/** 点赞结果载荷 */
export interface LikeResult {
  liked: boolean
  likeCount: number
}
