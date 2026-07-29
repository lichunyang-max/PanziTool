<script setup lang="ts">
/**
 * pages/mobile/tools.vue - 移动端开发者工具列表
 *
 * 参考 panzi-tools-mobile/pages/developer.html 设计：
 * - 面包屑：首页 > 开发者工具
 * - 分类标题 + 描述
 * - 工具卡片网格（使用 MobileToolCard grid 模式）
 * - 分类筛选（Tab：开发者工具 / 图片工具）
 * - 排序筛选（按热门 / 按最新）
 *
 * 数据来源：GET /api/v1/tools?category=developer&sort={sort}
 */

definePageMeta({
  layout: 'mobile',
})

useHead({
  titleTemplate: null,
  title: '开发者工具 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线开发者工具合集，涵盖JSON格式化、正则测试、编码解码、时间戳转换等常用编程工具，免登录即用，本地处理保障数据安全。',
    },
    {
      name: 'keywords',
      content: '开发者工具,在线开发工具,编程工具,前端开发工具',
    },
    {
      property: 'og:title',
      content: '开发者工具 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线开发者工具合集，涵盖JSON格式化、正则测试、编码解码、时间戳转换等常用编程工具，免登录即用，本地处理保障数据安全。',
    },
  ],
})

interface ToolItem {
  slug: string
  name: string
  description: string
  category: string
  use_count: number
  like_count: number
  created_at: string
}

// 分类筛选（当前分类：developer）
const activeCategory = ref<'developer' | 'image'>('developer')

// 排序状态
const sortBy = ref<'popular' | 'latest'>('popular')

// SSR 获取工具数据
const { data: toolsData, refresh } = await useAsyncData<ToolItem[]>(
  'mobile-category-developer-tools',
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    try {
      const response = await $fetch<{
        code: number
        data: { items: ToolItem[]; total: number }
      }>('/api/v1/tools', {
        baseURL,
        params: { category: 'developer', sort: sortBy.value },
      })
      if (response.code === 0) return response.data?.items || []
      return []
    } catch {
      return []
    }
  },
  {
    getCachedData(key) {
      const nuxtApp = useNuxtApp()
      const cached = nuxtApp.payload.data[key] || nuxtApp.static.data[key]
      if (cached) {
        const age = Date.now() - (cached._fetchedAt || 0)
        if (age < 60000) return cached
      }
      return undefined
    },
  },
)

// 切换排序（CSR）
async function changeSort(value: string) {
  sortBy.value = value as 'popular' | 'latest'
  await refresh()
}

// 切换分类（跳转对应页面）
function switchCategory(cat: 'developer' | 'image') {
  if (cat === 'developer') {
    activeCategory.value = 'developer'
    return
  }
  // 跳转图片工具页
  if (import.meta.client) {
    navigateTo('/mobile/image-tools')
  }
}
</script>

<template>
  <div class="mobile-page">
    <!-- ============ 面包屑 ============ -->
    <nav class="mobile-breadcrumb" aria-label="面包屑">
      <NuxtLink to="/mobile" class="mobile-breadcrumb__link">首页</NuxtLink>
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
      <span class="mobile-breadcrumb__current">开发者工具</span>
    </nav>

    <!-- ============ 页面标题 ============ -->
    <section class="mobile-header-section">
      <h1 class="mobile-header-section__title">开发者工具</h1>
      <p class="mobile-header-section__desc">
        格式化、编码解码、正则测试、时间转换等常用开发工具
      </p>
    </section>

    <!-- ============ 分类 Tab + 排序 ============ -->
    <section class="mobile-filter-bar">
      <!-- 分类 Tab -->
      <div class="mobile-tabs" role="tablist" aria-label="工具分类">
        <button
          type="button"
          class="mobile-tab"
          :data-active="activeCategory === 'developer'"
          role="tab"
          aria-selected="activeCategory === 'developer'"
          @click="switchCategory('developer')"
        >
          开发者工具
        </button>
        <button
          type="button"
          class="mobile-tab"
          :data-active="activeCategory === 'image'"
          role="tab"
          aria-selected="activeCategory === 'image'"
          @click="switchCategory('image')"
        >
          图片工具
        </button>
      </div>

      <!-- 排序 -->
      <div class="mobile-sort">
        <span class="mobile-sort__label">排序</span>
        <select
          v-model="sortBy"
          class="mobile-sort__select"
          aria-label="排序方式"
          @change="changeSort(sortBy)"
        >
          <option value="popular">按热门</option>
          <option value="latest">按最新</option>
        </select>
      </div>
    </section>

    <!-- ============ 工具卡片网格 ============ -->
    <section class="mobile-tool-grid" aria-label="工具列表">
      <MobileToolCard
        v-for="tool in toolsData"
        :key="tool.slug"
        :tool="{
          slug: tool.slug,
          name: tool.name,
          description: tool.description,
          useCount: tool.use_count,
          likeCount: tool.like_count,
        }"
        variant="grid"
      />

      <div
        v-if="!toolsData || toolsData.length === 0"
        class="mobile-empty"
      >
        <p>暂无工具数据</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mobile-page {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #a78bfa;
  --m-color-primary-lighter: #ede9fe;
  --m-color-surface: #ffffff;
  --m-color-border-light: #f3f4f6;
  --m-color-border: #e5e7eb;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0 16px;
}

/* --- 面包屑 --- */
.mobile-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 0;
}

.mobile-breadcrumb__link {
  color: var(--m-color-text-secondary);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.mobile-breadcrumb__link:active {
  color: var(--m-color-primary);
}

.mobile-breadcrumb svg {
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

.mobile-breadcrumb__current {
  color: var(--m-color-text-primary);
  font-weight: 500;
}

/* --- 标题区 --- */
.mobile-header-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-header-section__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.mobile-header-section__desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* --- 筛选栏 --- */
.mobile-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Tab */
.mobile-tabs {
  display: flex;
  gap: 4px;
  background: var(--m-color-surface);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid var(--m-color-border-light);
}

.mobile-tab {
  flex: 1;
  min-height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--m-color-text-secondary);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.mobile-tab[data-active='true'] {
  background: var(--m-color-primary);
  color: #fff;
  font-weight: 600;
}

/* 排序 */
.mobile-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.mobile-sort__label {
  font-size: 13px;
  color: var(--m-color-text-secondary);
}

.mobile-sort__select {
  appearance: none;
  -webkit-appearance: none;
  min-height: 36px;
  padding: 0 28px 0 10px;
  font-size: 13px;
  color: var(--m-color-text-primary);
  background-color: var(--m-color-surface);
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 12px;
  border: 1px solid var(--m-color-border-light);
  border-radius: 8px;
  cursor: pointer;
}

/* --- 工具网格 --- */
.mobile-tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* --- 空状态 --- */
.mobile-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px 0;
  color: var(--m-color-text-tertiary);
  font-size: 13px;
}
</style>
