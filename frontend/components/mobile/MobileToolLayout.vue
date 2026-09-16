<script setup lang="ts">
/**
 * MobileToolLayout.vue - 移动端工具页通用布局组件
 *
 * 设计规范：
 * - 面包屑导航（首页 > 分类 > 工具名）
 * - 页面标题 + 描述
 * - 使用次数 + 点赞按钮
 * - 工具交互区（默认 slot）
 * - 中间广告位（slot name="ad"）
 * - 底部使用说明区（slot name="instruction"）
 *
 * 参考：panzi-tools-mobile/pages/json-format.html
 *
 * 设计 Token：
 *   主色 #7c3aed，背景 #ffffff，边框 #e5e7eb
 */

export interface MobileToolMeta {
  slug: string
  name: string
  description: string
  category: string
  useCount: number
  likeCount: number
  isLiked?: boolean
}

interface Props {
  tool: MobileToolMeta
}

const props = defineProps<Props>()

const emit = defineEmits<{
  like: [slug: string]
}>()

/** 分类中文名映射 */
const categoryLabel = computed(() => {
  switch (props.tool.category) {
    case 'developer':
      return '开发者工具'
    case 'image':
      return '图片工具'
    default:
      return props.tool.category
  }
})

/** 分类路由映射（回到首页并选中对应分类 tab） */
const categoryRoute = computed(() => {
  switch (props.tool.category) {
    case 'developer':
      return '/?cat=developer'
    case 'image':
      return '/?cat=image'
    default:
      return '/'
  }
})

/** 格式化计数（1000+ 显示 1k） */
function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return String(count)
}
</script>

<template>
  <div class="mobile-tool-layout">
    <!-- ============ 面包屑导航 ============ -->
    <nav class="mobile-tool-layout__breadcrumb" aria-label="面包屑">
      <NuxtLink to="/" class="mobile-tool-layout__crumb-link">首页</NuxtLink>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <NuxtLink :to="categoryRoute" class="mobile-tool-layout__crumb-link">
        {{ categoryLabel }}
      </NuxtLink>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <span class="mobile-tool-layout__crumb-current">{{ tool.name }}</span>
    </nav>

    <!-- ============ 工具头部 ============ -->
    <div class="mobile-tool-layout__header">
      <div class="mobile-tool-layout__title-row">
        <h1 class="mobile-tool-layout__title">{{ tool.name }}</h1>
      </div>
      <p class="mobile-tool-layout__desc">{{ tool.description }}</p>
      <div class="mobile-tool-layout__stats">
        <span class="mobile-tool-layout__stat">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {{ formatCount(tool.useCount) }}次使用
        </span>
        <button
          type="button"
          class="mobile-tool-layout__like-btn"
          :class="{ 'is-liked': tool.isLiked }"
          :aria-label="tool.isLiked ? `已点赞 ${tool.name}` : `点赞 ${tool.name}`"
          @click="emit('like', tool.slug)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
          <span>{{ tool.isLiked ? '已点赞' : '点赞' }}</span>
          <span v-if="tool.likeCount > 0" class="mobile-tool-layout__like-count">
            {{ tool.likeCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- ============ 中间广告位 ============ -->
    <div v-if="$slots.ad" class="mobile-tool-layout__ad">
      <slot name="ad" />
    </div>

    <!-- ============ 工具交互区 ============ -->
    <div class="mobile-tool-layout__content">
      <slot />
    </div>

    <!-- ============ 使用说明区 ============ -->
    <div v-if="$slots.instruction" class="mobile-tool-layout__instruction">
      <slot name="instruction" />
    </div>
  </div>
</template>

<style scoped>
.mobile-tool-layout {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #ede9fe;
  --m-color-primary-lighter: #ddd6fe;
  --m-color-surface: #ffffff;
  --m-color-bg: #f9fafb;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-state-error: #ef4444;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* --- 面包屑 --- */
.mobile-tool-layout__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 12px 0;
}

.mobile-tool-layout__crumb-link {
  color: var(--m-color-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-tool-layout__crumb-link:active {
  color: var(--m-color-primary);
}

.mobile-tool-layout__crumb-link svg {
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

.mobile-tool-layout__crumb-current {
  color: var(--m-color-text-primary);
  font-weight: 500;
}

/* --- 工具头部 --- */
.mobile-tool-layout__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-tool-layout__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-tool-layout__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.mobile-tool-layout__desc {
  font-size: 14px;
  color: var(--m-color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.mobile-tool-layout__stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.mobile-tool-layout__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--m-color-text-tertiary);
}

/* 点赞按钮 */
.mobile-tool-layout__like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--m-color-text-secondary);
  background: none;
  border: 1px solid var(--m-color-border);
  border-radius: 16px;
  padding: 4px 12px;
  cursor: pointer;
  min-height: 32px;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-tool-layout__like-btn:active {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: var(--m-color-state-error);
}

.mobile-tool-layout__like-btn.is-liked {
  background-color: var(--m-color-primary-light);
  border-color: var(--m-color-primary-lighter);
  color: var(--m-color-primary);
}

.mobile-tool-layout__like-btn.is-liked svg {
  fill: var(--m-color-primary);
}

.mobile-tool-layout__like-count {
  font-size: 12px;
  color: inherit;
}

/* --- 广告位 --- */
.mobile-tool-layout__ad {
  margin-top: 4px;
}

/* --- 交互区 --- */
.mobile-tool-layout__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* --- 使用说明区 --- */
.mobile-tool-layout__instruction {
  margin-top: 8px;
  padding: 16px;
  background-color: var(--m-color-surface);
  border-radius: 12px;
  border: 1px solid var(--m-color-border-light);
}
</style>
