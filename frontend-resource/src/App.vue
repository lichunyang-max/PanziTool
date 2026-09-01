<script setup lang="ts">
/**
 * App.vue - 资源站主布局
 *
 * 左侧为一级/二级目录树（Sidebar），右侧为当前选中目录下的资源卡片网格：
 * - 选中二级目录：仅展示该目录下的资源
 * - 选中一级目录：按二级目录分组展示其下全部资源
 * - 顶部搜索框：在当前展示范围内按名称过滤
 */
import { computed, onMounted, ref } from 'vue'
import { fetchResourceTree } from './api'
import type { ResourceCategoryNode } from './types'
import Sidebar from './components/Sidebar.vue'
import ResourceCard from './components/ResourceCard.vue'

const tree = ref<ResourceCategoryNode[]>([])
const loading = ref(true)
const errorMessage = ref('')
const selectedId = ref<number | null>(null)
const expandedIds = ref<Set<number>>(new Set())
const keyword = ref('')

/** 所有目录（含一级与二级）的 id → 节点映射 */
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

/** 当前选中的节点 */
const selectedNode = computed(() =>
  selectedId.value == null ? null : (nodeMap.value.get(selectedId.value) ?? null),
)

/** 右侧分组展示结构：[{ group: 二级目录 | null, items }] */
const groups = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  const kw = keyword.value.trim().toLowerCase()

  const filterItems = (list: ResourceCategoryNode['items']) =>
    kw ? list.filter((it) => it.name.toLowerCase().includes(kw)) : list

  if (node.parentId === null && node.children.length > 0) {
    // 一级目录：直属资源（不分组展示在最前）+ 非空二级目录分组
    const result: { group: ResourceCategoryNode | null; items: ResourceCategoryNode['items'] }[] = []
    const direct = filterItems(node.items)
    if (direct.length > 0) {
      result.push({ group: null, items: direct })
    }
    for (const child of node.children) {
      const childItems = filterItems(child.items)
      if (childItems.length > 0) {
        result.push({ group: child, items: childItems })
      }
    }
    return result
  }
  return [{ group: null, items: filterItems(node.items) }]
})

const hasVisibleItems = computed(() =>
  groups.value.some((g) => g.items.length > 0),
)

/** 面包屑路径 */
const breadcrumb = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  if (node.parentId === null) return [node.name]
  const parent = nodeMap.value.get(node.parentId)
  return parent ? [parent.name, node.name] : [node.name]
})

function selectNode(node: ResourceCategoryNode) {
  selectedId.value = node.id
  if (node.parentId === null) {
    // 点一级目录：展开并默认选中其第一个二级目录（若有）
    expandedIds.value.add(node.id)
    if (node.children.length > 0 && node.items.length === 0) {
      selectedId.value = node.children[0].id
    }
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

onMounted(async () => {
  try {
    tree.value = await fetchResourceTree()
    // 默认选中第一个目录
    if (tree.value.length > 0) {
      selectNode(tree.value[0])
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '加载失败，请刷新重试'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- ============ 顶部导航 ============ -->
  <header class="site-header">
    <a class="site-logo" href="/">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      盘子资源站
    </a>
    <div class="site-search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input v-model="keyword" type="search" placeholder="搜索当前分类下的资源..." aria-label="搜索资源" />
    </div>
  </header>

  <div class="layout">
    <!-- ============ 左侧目录 ============ -->
    <Sidebar
      :tree="tree"
      :selected-id="selectedId"
      :expanded-ids="expandedIds"
      :loading="loading"
      @select="selectNode"
      @toggle="toggleExpand"
    />

    <!-- ============ 右侧内容 ============ -->
    <main class="content">
      <!-- 加载中 -->
      <div v-if="loading" class="content-loading">
        <div class="spinner" />
        <span>资源加载中...</span>
      </div>

      <!-- 加载失败 -->
      <div v-else-if="errorMessage" class="content-loading">
        <span class="content-error">{{ errorMessage }}</span>
      </div>

      <!-- 无数据 -->
      <div v-else-if="tree.length === 0" class="content-empty">
        <span>暂无资源数据，请先在管理后台配置目录与资源</span>
      </div>

      <!-- 内容 -->
      <template v-else-if="selectedNode">
        <nav class="breadcrumb">
          <template v-for="(item, i) in breadcrumb" :key="i">
            <span v-if="i > 0">/</span>
            <span>{{ item }}</span>
          </template>
        </nav>
        <h1 class="content-title">{{ selectedNode.name }}</h1>
        <p class="content-desc">
          {{ groups.reduce((n, g) => n + g.items.length, 0) }} 个资源
        </p>

        <div v-if="!hasVisibleItems" class="content-empty">
          <span>{{ keyword ? '没有匹配的资源' : '该分类下暂无资源' }}</span>
        </div>

        <template v-else>
          <section v-for="g in groups" :key="g.group?.id ?? 'root'" class="group">
            <h2 v-if="g.group" class="group-title">{{ g.group.name }}</h2>
            <div class="resource-grid">
              <ResourceCard v-for="item in g.items" :key="item.id" :item="item" />
            </div>
          </section>
        </template>
      </template>
    </main>
  </div>
</template>
