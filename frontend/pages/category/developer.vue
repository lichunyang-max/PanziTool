<script setup lang="ts">
/**
 * pages/category/developer.vue - 开发者工具分类页
 *
 * 严格参照 ui/pages/开发者工具.html 的布局
 * - 面包屑：首页 > 开发者工具
 * - 标题与描述
 * - 分类标签：全部 / 开发者工具 / 图片工具
 * - 排序下拉框：按热门 / 按最新
 * - 工具卡片网格（3 列，hover 上移效果）
 * - 广告位
 *
 * 数据来源：GET /api/v1/tools?category=developer&sort=popular
 */

interface ToolItem {
  slug: string
  name: string
  description: string
  category: string
  use_count: number
  like_count: number
  created_at: string
}

// SEO
useSeoMeta({
  title: '开发者工具',
  description:
    'JSON格式化、URL编码、Base64、时间戳转换、正则测试、JWT解析、哈希计算等开发者常用工具，免费在线使用。',
})

// 排序状态
const sortBy = ref<'popular' | 'latest'>('popular')

// SSR 获取工具数据
const { data: toolsData, refresh } = await useAsyncData<ToolItem[]>(
  'category-developer-tools',
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

// 切换排序
async function changeSort(value: string) {
  sortBy.value = value as 'popular' | 'latest'
  await refresh()
}

/**
 * 格式化次数显示
 */
function formatCount(count: number): string {
  if (count >= 10000) return (count / 1000).toFixed(1) + 'k'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}
</script>

<template>
  <!-- ============ 面包屑 ============ -->
  <nav aria-label="面包屑" class="py-4">
    <ol
      class="flex items-center gap-2 text-sm flex-nowrap"
      style="font-family: var(--pz-font-sans)"
    >
      <li class="whitespace-nowrap">
        <NuxtLink to="/" class="pz-crumb-link">首页</NuxtLink>
      </li>
      <li aria-hidden="true" class="whitespace-nowrap" style="color: var(--pz-color-text-tertiary)">&gt;</li>
      <li
        class="whitespace-nowrap"
        style="color: var(--pz-color-text-primary); font-weight: var(--pz-weight-medium)"
        aria-current="page"
      >
        开发者工具
      </li>
    </ol>
  </nav>

  <!-- ============ 页面标题 ============ -->
  <section class="py-4">
    <h1
      class="text-3xl font-bold"
      style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); letter-spacing: -0.02em; line-height: var(--pz-leading-tight); text-wrap: balance; word-break: keep-all; overflow-wrap: break-word"
    >
      开发者工具
    </h1>
    <p
      class="mt-2 text-base"
      style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: var(--pz-leading-relaxed)"
    >
      格式化、编码解码、正则测试、时间转换等常用开发工具
    </p>
  </section>

  <!-- ============ 工具栏：分类标签 + 排序 ============ -->
  <section
    class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4"
    aria-label="工具筛选与排序"
  >
    <!-- 分类标签 -->
    <div
      class="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar w-full sm:w-auto"
      role="tablist"
      aria-label="工具分类"
    >
      <NuxtLink
        to="/category/developer"
        class="pz-tab shrink-0"
        data-active="true"
        aria-selected="true"
        role="tab"
      >
        全部
      </NuxtLink>
      <NuxtLink
        to="/category/developer"
        class="pz-tab shrink-0"
        aria-selected="false"
        role="tab"
      >
        开发者工具
      </NuxtLink>
      <NuxtLink
        to="/category/image"
        class="pz-tab shrink-0"
        aria-selected="false"
        role="tab"
      >
        图片工具
      </NuxtLink>
    </div>

    <!-- 排序下拉 -->
    <div
      class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end"
    >
      <span
        class="text-sm whitespace-nowrap"
        style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans)"
      >
        排序
      </span>
      <div class="relative">
        <select
          v-model="sortBy"
          class="pz-input appearance-none pr-9"
          aria-label="排序方式"
          style="min-width: 7rem"
          @change="changeSort(sortBy)"
        >
          <option value="popular">按热门</option>
          <option value="latest">按最新</option>
        </select>
        <svg
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="color: var(--pz-color-text-tertiary)"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  </section>

  <!-- ============ 工具卡片网格（3 列） ============ -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="工具列表">
    <NuxtLink
      v-for="tool in toolsData"
      :key="tool.slug"
      :to="`/tools/${tool.slug}`"
      class="pz-tool-link block h-full"
      style="text-decoration: none"
    >
      <article class="pz-card pz-tool-card p-5 flex flex-col h-full">
        <div class="flex items-start gap-3">
          <div
            class="w-7 h-7 flex items-center justify-center shrink-0"
            style="background-color: var(--pz-color-primary-light); border-radius: var(--pz-radius-md)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="color: var(--pz-color-primary)"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <h3
            class="text-base font-semibold truncate min-w-0"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display)"
          >
            {{ tool.name }}
          </h3>
        </div>
        <span class="pz-badge pz-badge-neutral mt-3 self-start whitespace-nowrap">
          {{ tool.category === 'image' ? '图片工具' : '开发工具' }}
        </span>
        <p
          class="text-sm mt-2 line-clamp-2"
          style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.5"
        >
          {{ tool.description }}
        </p>
        <div
          class="mt-auto pt-4 flex items-center justify-between text-xs"
          style="color: var(--pz-color-text-tertiary); font-family: var(--pz-font-sans)"
        >
          <span class="whitespace-nowrap">使用 {{ formatCount(tool.use_count) }} 次</span>
          <span class="whitespace-nowrap inline-flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <span>{{ tool.like_count }}</span>
          </span>
        </div>
      </article>
    </NuxtLink>

    <!-- 无数据提示 -->
    <div
      v-if="!toolsData || toolsData.length === 0"
      class="col-span-full text-center py-12"
    >
      <p style="color: var(--pz-color-text-tertiary); font-size: var(--pz-text-sm)">
        暂无工具数据
      </p>
    </div>
  </section>

  <!-- ============ 广告位 ============ -->
  <aside
    class="mt-8 h-24 flex items-center justify-center"
    style="background-color: var(--pz-color-bg-tertiary); border: 1px dashed var(--pz-color-border-strong); border-radius: var(--pz-radius-lg)"
    aria-label="广告位"
  >
    <span
      class="text-sm"
      style="color: var(--pz-color-text-tertiary); font-family: var(--pz-font-sans)"
    >
      广告位
    </span>
  </aside>
</template>
