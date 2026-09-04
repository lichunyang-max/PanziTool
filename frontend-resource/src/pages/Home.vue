<script setup lang="ts">
/**
 * Home.vue - 资源列表页（按设计稿重构）
 *
 * 三种视图：
 * - 首页（未选中分类）：欢迎 hero + 统计卡片（分类数/资源数/总下载/总点赞）
 *                      + 全部分类导航 + 热门推荐（按下载次数取前 8）
 * - 选中一级目录：hero（子分类数/资源数）+ 子分类导航 + 推荐资源
 * - 选中二级目录：hero（上级分类 · 资源数）+ 资源列表（下载次数降序）
 * 全局搜索：同时过滤目录树与当前展示的资源
 */
import { computed, onMounted, ref } from 'vue'
import { fetchResourceTree } from '../api'
import type { ResourceCategoryNode, ResourceItem } from '../types'
import Sidebar from '../components/Sidebar.vue'
import ResourceCard from '../components/ResourceCard.vue'

const tree = ref<ResourceCategoryNode[]>([])
const loading = ref(true)
const errorMessage = ref('')
const selectedId = ref<number | null>(null)
const expandedIds = ref<Set<number>>(new Set())
const keyword = ref('')

/** 所有目录的 id → 节点映射 */
const nodeMap = computed(() => {
  const map = new Map<number, ResourceCategoryNode>()
  const walk = (nodes: ResourceCategoryNode[]) => {
    for (const n of nodes) {
      map.set(n.id, n)
      walk(n.children)
    }
  }
  walk(tree.value)
  return map
})

const selectedNode = computed(() =>
  selectedId.value == null ? null : (nodeMap.value.get(selectedId.value) ?? null),
)

// ============ 统计 ============

/** 节点资源总数（直属 + 所有子分类） */
function countTotal(node: ResourceCategoryNode): number {
  let total = node.items.length
  for (const child of node.children) {
    total += countTotal(child)
  }
  return total
}

const totalCategories = computed(() => {
  let count = 0
  const walk = (nodes: ResourceCategoryNode[]) => {
    for (const n of nodes) {
      count++
      walk(n.children)
    }
  }
  walk(tree.value)
  return count
})

const totalResources = computed(() => {
  let count = 0
  const walk = (nodes: ResourceCategoryNode[]) => {
    for (const n of nodes) {
      count += n.items.length
      walk(n.children)
    }
  }
  walk(tree.value)
  return count
})

const totalDownloads = computed(() => {
  let sum = 0
  const walk = (nodes: ResourceCategoryNode[]) => {
    for (const n of nodes) {
      for (const it of n.items) sum += it.downloadCount ?? 0
      walk(n.children)
    }
  }
  walk(tree.value)
  return sum
})

const totalLikes = computed(() => {
  let sum = 0
  const walk = (nodes: ResourceCategoryNode[]) => {
    for (const n of nodes) {
      for (const it of n.items) sum += it.likeCount ?? 0
      walk(n.children)
    }
  }
  walk(tree.value)
  return sum
})

// ============ 展示数据 ============

const kw = computed(() => keyword.value.trim().toLowerCase())

/** 关键词过滤资源 */
function filterItems(list: ResourceItem[]): ResourceItem[] {
  return kw.value
    ? list.filter((it) => it.name.toLowerCase().includes(kw.value))
    : list
}

/** 收集节点下所有资源（含子分类，按下载次数排序取前 N） */
function collectResources(node: ResourceCategoryNode, limit: number): ResourceItem[] {
  const list: ResourceItem[] = []
  const walk = (n: ResourceCategoryNode) => {
    for (const it of n.items) list.push(it)
    n.children.forEach(walk)
  }
  walk(node)
  const filtered = filterItems(list)
  return filtered
    .sort((a, b) => (b.downloadCount ?? 0) - (a.downloadCount ?? 0))
    .slice(0, limit)
}

/** 面包屑路径 */
const breadcrumb = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  if (node.parentId === null) return [node.name]
  const parent = nodeMap.value.get(node.parentId)
  return parent ? [parent.name, node.name] : [node.name]
})

/** 当前视图模式 */
const viewMode = computed(() => {
  const node = selectedNode.value
  if (!node) return 'home'
  return node.parentId === null ? 'category' : 'leaf'
})

/** 选中目录下的直属资源（二级视图） */
const leafItems = computed(() =>
  viewMode.value === 'leaf' && selectedNode.value
    ? filterItems(selectedNode.value.items)
    : [],
)

/** 推荐资源（首页/一级目录视图，下载次数前 8） */
const featuredItems = computed(() => {
  if (viewMode.value === 'leaf') return []
  const source = viewMode.value === 'home'
    ? { children: tree.value, items: [] as ResourceItem[] } as ResourceCategoryNode
    : selectedNode.value!
  if (kw.value && viewMode.value === 'home') {
    // 搜索时展示全部匹配资源
    return collectAll(source, 24)
  }
  return collectResources(source, 8)
})

function collectAll(node: ResourceCategoryNode, limit: number): ResourceItem[] {
  const list: ResourceItem[] = []
  const walk = (n: ResourceCategoryNode) => {
    for (const it of n.items) list.push(it)
    n.children.forEach(walk)
  }
  walk(node)
  return list.slice(0, limit)
}

// ============ 交互 ============

function selectNode(node: ResourceCategoryNode) {
  selectedId.value = node.id
  if (node.parentId === null) {
    expandedIds.value.add(node.id)
  }
}

function toggleExpand(node: ResourceCategoryNode) {
  const set = new Set(expandedIds.value)
  if (set.has(node.id)) {
    set.delete(node.id)
  } else {
    set.add(node.id)
  }
  expandedIds.value = set
}

function expandAll() {
  const set = new Set<number>()
  const walk = (nodes: ResourceCategoryNode[]) => {
    for (const n of nodes) {
      if (n.children.length > 0) set.add(n.id)
      walk(n.children)
    }
  }
  walk(tree.value)
  expandedIds.value = set
}

function collapseAll() {
  expandedIds.value = new Set()
}

onMounted(async () => {
  try {
    tree.value = await fetchResourceTree()
    // 默认展开所有一级目录
    expandedIds.value = new Set(tree.value.map((n) => n.id))
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '加载失败，请刷新重试'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="layout">
    <!-- ============ 左侧栏 ============ -->
    <Sidebar
      :tree="tree"
      :selected-id="selectedId"
      :expanded-ids="expandedIds"
      :loading="loading"
      v-model:keyword="keyword"
      @select="selectNode"
      @toggle="toggleExpand"
    />

    <!-- ============ 右侧内容 ============ -->
    <main class="main">
      <!-- 顶栏：面包屑 + 展开折叠 -->
      <div class="topbar">
        <div class="breadcrumb">
          <span>首页</span>
          <span class="sep">›</span>
          <template v-if="breadcrumb.length === 0">
            <span class="current">资源总览</span>
          </template>
          <template v-else>
            <template v-for="(item, i) in breadcrumb" :key="i">
              <span v-if="i > 0" class="sep">›</span>
              <span :class="{ current: i === breadcrumb.length - 1 }">{{ item }}</span>
            </template>
          </template>
        </div>
        <div class="topbar-actions">
          <button type="button" @click="expandAll">全部展开</button>
          <button type="button" @click="collapseAll">全部折叠</button>
        </div>
      </div>

      <div class="content">
        <!-- 加载中 -->
        <div v-if="loading" class="content-loading">
          <div class="spinner" />
          <span>资源加载中...</span>
        </div>

        <!-- 加载失败 -->
        <div v-else-if="errorMessage" class="content-loading">
          <span class="content-error">{{ errorMessage }}</span>
        </div>

        <!-- ============ 首页视图 ============ -->
        <template v-else-if="viewMode === 'home'">
          <div class="hero">
            <h2>👋 欢迎来到盘子资源站</h2>
            <p>
              精心整理 {{ totalCategories }} 大分类 · 收录 {{ totalResources }}+
              优质资源 · 一站式获取你需要的全部资源
            </p>
          </div>

          <!-- 统计卡片 -->
          <div class="stats">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(79, 124, 255, 0.12); color: #4f7cff">📚</div>
              <div class="stat-info">
                <div class="num">{{ totalCategories }}</div>
                <div class="label">资源分类</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(255, 122, 89, 0.12); color: #ff7a59">📦</div>
              <div class="stat-info">
                <div class="num">{{ totalResources }}</div>
                <div class="label">资源数量</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(108, 92, 231, 0.12); color: #6c5ce7">🔥</div>
              <div class="stat-info">
                <div class="num">{{ totalDownloads }}</div>
                <div class="label">累计下载</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981">💯</div>
              <div class="stat-info">
                <div class="num">{{ totalLikes }}</div>
                <div class="label">累计点赞</div>
              </div>
            </div>
          </div>

          <!-- 分类导航 -->
          <div class="section-title">资源分类</div>
          <div class="sub-grid">
            <div
              v-for="root in tree"
              :key="root.id"
              class="sub-card"
              @click="selectNode(root)"
            >
              <span class="sc-icon">{{ root.icon || '📁' }}</span>
              <div>
                <div class="sc-title">{{ root.name }}</div>
                <div class="sc-count">{{ countTotal(root) }} 个资源</div>
              </div>
            </div>
          </div>

          <!-- 热门推荐 -->
          <template v-if="featuredItems.length > 0">
            <div class="section-title">🔥 热门推荐</div>
            <div class="resource-grid">
              <ResourceCard v-for="item in featuredItems" :key="item.id" :item="item" />
            </div>
          </template>
          <div v-else class="content-empty">
            <div class="empty-icon">📭</div>
            <span>{{ keyword ? '没有匹配的资源' : '暂无资源数据，请先在管理后台配置' }}</span>
          </div>
        </template>

        <!-- ============ 一级目录视图 ============ -->
        <template v-else-if="viewMode === 'category' && selectedNode">
          <div class="hero">
            <h2>{{ selectedNode.icon || '📁' }} {{ selectedNode.name }}</h2>
            <p>
              共 {{ selectedNode.children.length }} 个子分类 · 收录
              {{ countTotal(selectedNode) }} 个优质资源
            </p>
          </div>

          <!-- 子分类导航 -->
          <template v-if="selectedNode.children.length > 0">
            <div class="section-title">子分类导航</div>
            <div class="sub-grid">
              <div
                v-for="child in selectedNode.children"
                :key="child.id"
                class="sub-card"
                @click="selectNode(child)"
              >
                <span class="sc-icon">{{ child.icon || '📄' }}</span>
                <div>
                  <div class="sc-title">{{ child.name }}</div>
                  <div class="sc-count">{{ child.items.length }} 个资源</div>
                </div>
              </div>
            </div>
          </template>

          <!-- 推荐资源 -->
          <template v-if="featuredItems.length > 0">
            <div class="section-title">🔥 推荐资源</div>
            <div class="resource-grid">
              <ResourceCard v-for="item in featuredItems" :key="item.id" :item="item" />
            </div>
          </template>
          <div
            v-else-if="selectedNode.children.length === 0"
            class="content-empty"
          >
            <div class="empty-icon">📭</div>
            <span>该分类下暂无资源</span>
          </div>
        </template>

        <!-- ============ 二级目录视图 ============ -->
        <template v-else-if="viewMode === 'leaf' && selectedNode">
          <div class="hero">
            <h2>{{ selectedNode.icon || '📄' }} {{ selectedNode.name }}</h2>
            <p>
              {{ breadcrumb[0] ? breadcrumb[0] + ' · ' : '' }}共收录
              {{ leafItems.length }} 个资源
            </p>
          </div>

          <div v-if="leafItems.length > 0" class="resource-grid">
            <ResourceCard v-for="item in leafItems" :key="item.id" :item="item" />
          </div>
          <div v-else class="content-empty">
            <div class="empty-icon">📭</div>
            <span>{{ keyword ? '没有匹配的资源' : '该分类下暂无资源' }}</span>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
