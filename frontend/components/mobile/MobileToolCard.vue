<script setup lang="ts">
/**
 * MobileToolCard.vue - 移动端工具卡片组件
 *
 * 设计规范：
 * - 支持网格模式（2列，紧凑）和列表模式（竖排，详细）
 * - 显示工具图标（44px 圆形，渐变背景 #7c3aed -> #a78bfa）
 * - 显示工具名称、描述
 * - 显示使用次数、点赞数（可选）
 * - 点击跳转对应工具页
 *
 * 设计 Token：
 *   主色 #7c3aed，渐变 #7c3aed -> #a78bfa，背景 #ffffff，边框 #f3f4f6
 */

interface ToolData {
  slug: string
  name: string
  description: string
  useCount?: number
  likeCount?: number
  /** 工具图标 svg 内容（viewBox 内的 path 等子元素） */
  icon?: string
}

interface Props {
  tool: ToolData
  /** 展示模式：grid 网格模式（2列紧凑），list 列表模式（详细） */
  variant?: 'grid' | 'list'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'grid',
})

/** 格式化计数 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return String(count)
}

/** 构建工具页路径 */
const toolHref = computed(() => `/tools/${props.tool.slug}`)
</script>

<template>
  <NuxtLink
    :to="toolHref"
    class="mobile-tool-card"
    :class="[`mobile-tool-card--${variant}`]"
    :aria-label="`${tool.name}：${tool.description}`"
  >
    <!-- 工具图标（44px 圆形渐变背景） -->
    <div class="mobile-tool-card__icon" aria-hidden="true">
      <svg
        v-if="tool.icon"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        v-html="tool.icon"
      />
      <!-- 默认图标（扳手） -->
      <svg
        v-else
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
      </svg>
    </div>

    <!-- 网格模式：居中文字 -->
    <template v-if="variant === 'grid'">
      <span class="mobile-tool-card__name">{{ tool.name }}</span>
      <span class="mobile-tool-card__desc">{{ tool.description }}</span>
      <div class="mobile-tool-card__meta">
        <span v-if="tool.useCount" class="mobile-tool-card__stat">
          {{ formatCount(tool.useCount) }}次使用
        </span>
        <span v-if="tool.likeCount" class="mobile-tool-card__like">
          &#9829;{{ tool.likeCount }}
        </span>
      </div>
    </template>

    <!-- 列表模式：详细信息 -->
    <template v-else>
      <div class="mobile-tool-card__info">
        <div class="mobile-tool-card__header-row">
          <span class="mobile-tool-card__name">{{ tool.name }}</span>
        </div>
        <span class="mobile-tool-card__desc">{{ tool.description }}</span>
      </div>
      <div class="mobile-tool-card__meta-list">
        <span v-if="tool.useCount" class="mobile-tool-card__stat">
          {{ formatCount(tool.useCount) }}次使用
        </span>
        <span v-if="tool.likeCount" class="mobile-tool-card__like">
          &#9829;{{ tool.likeCount }}
        </span>
      </div>
    </template>
  </NuxtLink>
</template>

<style scoped>
.mobile-tool-card {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #a78bfa;
  --m-color-surface: #ffffff;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;

  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  background: var(--m-color-surface);
  border-radius: 12px;
  padding: 16px 12px;
  border: 1px solid var(--m-color-border-light);
  text-decoration: none;
  color: inherit;
  min-height: 120px;
  justify-content: center;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-tool-card:active {
  border-color: var(--m-color-primary-light);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);
}

/* 工具图标容器 */
.mobile-tool-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 工具名称 */
.mobile-tool-card__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
  line-height: 1.3;
}

/* 工具描述 */
.mobile-tool-card__desc {
  font-size: 12px;
  color: var(--m-color-text-secondary);
  line-height: 1.4;
}

/* --- 网格模式 --- */
.mobile-tool-card--grid {
  /* 默认样式即为网格模式 */
}

.mobile-tool-card--grid .mobile-tool-card__meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mobile-tool-card--grid .mobile-tool-card__stat {
  font-size: 11px;
  color: var(--m-color-text-tertiary);
}

.mobile-tool-card--grid .mobile-tool-card__like {
  font-size: 11px;
  color: #ef4444;
}

/* --- 列表模式 --- */
.mobile-tool-card--list {
  flex-direction: row;
  align-items: center;
  text-align: left;
  padding: 14px;
  gap: 12px;
  min-height: 72px;
  justify-content: flex-start;
}

.mobile-tool-card--list .mobile-tool-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-tool-card--list .mobile-tool-card__header-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mobile-tool-card--list .mobile-tool-card__name {
  font-size: 14px;
  font-weight: 500;
}

.mobile-tool-card--list .mobile-tool-card__desc {
  display: block;
  font-size: 12px;
  color: var(--m-color-text-secondary);
}

.mobile-tool-card--list .mobile-tool-card__meta-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mobile-tool-card--list .mobile-tool-card__stat {
  font-size: 11px;
  color: var(--m-color-text-tertiary);
}

.mobile-tool-card--list .mobile-tool-card__like {
  font-size: 11px;
  color: #ef4444;
}
</style>
