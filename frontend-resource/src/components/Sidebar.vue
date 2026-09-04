<script setup lang="ts">
/**
 * Sidebar.vue - 左侧栏：品牌 + 全局搜索 + 目录树
 *
 * - 树节点展示 icon（emoji）+ 名称 + 资源数量徽标
 * - 点击节点：选中并展开（一级）；点击箭头：仅切换展开
 * - 全局搜索：匹配目录名或其下资源名，过滤树并自动展开父级
 */
import { computed } from 'vue'
import type { ResourceCategoryNode } from '../types'

const props = defineProps<{
  tree: ResourceCategoryNode[]
  selectedId: number | null
  expandedIds: Set<number>
  loading: boolean
  keyword: string
}>()

const emit = defineEmits<{
  select: [node: ResourceCategoryNode]
  toggle: [node: ResourceCategoryNode]
  'update:keyword': [value: string]
}>()

/** 计算节点资源总数（含直属资源与所有子分类资源） */
function countTotal(node: ResourceCategoryNode): number {
  let total = node.items.length
  for (const child of node.children) {
    total += countTotal(child)
  }
  return total
}

/** 过滤后的树（搜索时仅显示匹配节点及其祖先） */
const filteredTree = computed(() => {
  const kw = props.keyword.trim().toLowerCase()
  if (!kw) return props.tree

  function filter(nodes: ResourceCategoryNode[]): ResourceCategoryNode[] {
    const result: ResourceCategoryNode[] = []
    for (const node of nodes) {
      const selfMatch =
        node.name.toLowerCase().includes(kw) ||
        node.items.some((it) => it.name.toLowerCase().includes(kw))
      const filteredChildren = filter(node.children)
      if (selfMatch || filteredChildren.length > 0) {
        // 保留原节点（匹配时保留全部子节点，否则仅保留匹配子节点）
        result.push({
          ...node,
          children: selfMatch ? node.children : filteredChildren,
        })
      }
    }
    return result
  }
  return filter(props.tree)
})

function onSelect(node: ResourceCategoryNode) {
  emit('select', node)
}

function onToggle(event: MouseEvent, node: ResourceCategoryNode) {
  event.stopPropagation()
  emit('toggle', node)
}

function isExpanded(node: ResourceCategoryNode): boolean {
  return props.expandedIds.has(node.id)
}
</script>

<template>
  <aside class="sidebar">
    <!-- 品牌 -->
    <div class="brand">
      <div class="brand-logo">盘</div>
      <div class="brand-text">
        <h1>盘子资源站</h1>
        <p>你的私人资源宝库</p>
      </div>
    </div>

    <!-- 全局搜索 -->
    <div class="search-box">
      <span class="search-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="text"
        placeholder="搜索资源..."
        :value="keyword"
        aria-label="全局搜索"
        @input="emit('update:keyword', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="sidebar-title">资源分类</div>

    <!-- 目录树 -->
    <div class="tree">
      <div v-if="loading" class="content-loading" style="padding: 40px 0">
        <div class="spinner" />
      </div>

      <div v-else-if="filteredTree.length === 0" class="content-empty" style="padding: 40px 10px">
        <div class="empty-icon">🔍</div>
        <span>没有匹配的分类</span>
      </div>

      <template v-else>
        <div v-for="root in filteredTree" :key="root.id" class="tree-node">
          <!-- 一级目录 -->
          <div
            class="node-row"
            :class="{ active: selectedId === root.id }"
            @click="onSelect(root)"
          >
            <span
              class="node-toggle"
              :class="{ open: isExpanded(root) }"
              @click="onToggle($event, root)"
            >▶</span>
            <span class="node-icon">{{ root.icon || '📁' }}</span>
            <span class="node-label">{{ root.name }}</span>
            <span v-if="countTotal(root) > 0" class="node-count">{{ countTotal(root) }}</span>
          </div>

          <!-- 二级目录 -->
          <div v-if="root.children.length > 0" class="children" :class="{ open: isExpanded(root) }">
            <div
              v-for="child in root.children"
              :key="child.id"
              class="node-row"
              :class="{ active: selectedId === child.id }"
              @click="onSelect(child)"
            >
              <span class="node-toggle leaf">▶</span>
              <span class="node-icon">{{ child.icon || '📄' }}</span>
              <span class="node-label">{{ child.name }}</span>
              <span v-if="child.items.length > 0" class="node-count">{{ child.items.length }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>
