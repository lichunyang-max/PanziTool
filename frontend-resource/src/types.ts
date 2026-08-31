/**
 * 资源站类型定义（与后端 /api/v1/resources/tree 响应结构对应）。
 */

/** 资源条目（名称 / 链接 / 图片三要素） */
export interface ResourceItem {
  id: number
  name: string
  url: string
  /** 图标图片 URL，null 时前端展示默认图标 */
  image: string | null
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
