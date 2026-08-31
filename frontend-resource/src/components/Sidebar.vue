<script setup lang="ts">
/**
 * Sidebar.vue - 左侧目录树
 *
 * 展示一级目录（可展开）与其下二级目录；点击目录触发 select 事件，
 * 点击一级目录箭头触发 toggle 事件（仅展开/收起）。
 */
import type { ResourceCategoryNode } from '../types'

const props = defineProps<{
  tree: ResourceCategoryNode[]
  selectedId: number | null
  expandedIds: Set<number>
  loading: boolean
}>()

const emit = defineEmits<{
  select: [node: ResourceCategoryNode]
  toggle: [node: ResourceCategoryNode]
}>()

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
    <div class="sidebar-title">资源分类</div>

    <div v-if="loading" class="content-loading" style="padding: 40px 0">
      <div class="spinner" />
    </div>

    <template v-else>
      <div v-for="root in tree" :key="root.id" class="cat-group">
        <!-- 一级目录 -->
        <button
          class="cat-parent"
          :class="{ active: selectedId === root.id }"
          type="button"
          @click="onSelect(root)"
        >
          <span>{{ root.name }}</span>
          <svg
            v-if="root.children.length > 0"
            class="arrow"
            :class="{ expanded: isExpanded(root) }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            @click="onToggle($event, root)"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <!-- 二级目录 -->
        <div v-if="root.children.length > 0" class="cat-children" :class="{ expanded: isExpanded(root) }">
          <button
            v-for="child in root.children"
            :key="child.id"
            class="cat-child"
            :class="{ active: selectedId === child.id }"
            type="button"
            @click="onSelect(child)"
          >
            {{ child.name }}
          </button>
        </div>
      </div>
    </template>
  </aside>
</template>
