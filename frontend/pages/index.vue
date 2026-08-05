<script setup lang="ts">
/**
 * pages/index.vue - 首页
 *
 * 严格参照 ui/pages/首页.html 的布局和样式
 * - 分类入口：开发者工具 / 图片工具
 * - 热门工具区块（4 列网格）
 * - 最新上架区块（3 列网格，带 NEW 标签）
 * - 广告位
 *
 * 数据来源：GET /api/v1/tools?sort=popular&limit=8
 */

useHead({
  titleTemplate: null,
  title: '盘子工具站 - 免费在线开发者工具 图片处理工具集合',
  meta: [
    {
      name: 'description',
      content: '面向中文开发者的免费在线工具站，提供JSON格式化、正则测试、图片压缩等实用工具，免登录无广告，本地处理保护隐私，打开即用。'
    },
    {
      name: 'keywords',
      content: '在线工具,开发者工具,JSON格式化,图片压缩,正则测试'
    },
    {
      property: 'og:title',
      content: '盘子工具站 - 免费在线开发者工具 图片处理工具集合'
    },
    {
      property: 'og:description',
      content: '面向中文开发者的免费在线工具站，提供JSON格式化、正则测试、图片压缩等实用工具，免登录无广告，本地处理保护隐私，打开即用。'
    }
  ]
})

interface ToolItem {
  slug: string
  name: string
  description: string
  category: string
  icon: string
  use_count: number
  like_count: number
  created_at: string
}

interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

// SSR 获取首页广告数据（home_middle）
const { data: adData } = await useAsyncData<AdItem | null>(
  'home-ad',
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    try {
      const response = await $fetch<{
        code: number
        data: AdItem[]
      }>('/api/v1/ads', {
        baseURL,
        params: { locationSymbol: 'home_middle' },
      })
      if (response.code === 0 && response.data && response.data.length > 0) {
        return response.data[0]
      }
      return null
    } catch {
      return null
    }
  },
  {
    default: () => null,
  },
)

// SSR 获取热门工具数据
const { data: toolsData } = await useAsyncData<ToolItem[]>(
  'home-tools',
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
        params: { sort: 'popular', limit: 8 },
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

// SSR 获取最新上架工具数据（按创建时间倒序，独立请求）
const { data: latestToolsData } = await useAsyncData<ToolItem[]>(
  'home-latest-tools',
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
        params: { sort: 'latest', limit: 3 },
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

// 热门工具（前 8 个，按 use_count 排序）
const popularTools = computed(() => {
  const all = (toolsData.value || [])
  return [...all].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 8)
})

// 最新上架工具（直接使用 sort=latest 独立请求的数据，按创建时间倒序取前 3 个）
const latestTools = computed(() => {
  return [...(latestToolsData.value || [])]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 3)
})

function formatCount(count: number): string {
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}
</script>

<template>
  <!-- ============ 热门工具区块（4 列网格） ============ -->
  <section aria-label="热门工具">
    <div class="flex items-center justify-between mb-6">
      <h2
        style="
          font-family: var(--pz-font-display);
          font-size: var(--pz-text-2xl);
          font-weight: var(--pz-weight-semibold);
          line-height: var(--pz-leading-tight);
          letter-spacing: -0.01em;
          color: var(--pz-color-text-primary);
          text-wrap: balance;
          word-break: keep-all;
        "
      >
        热门工具
      </h2>
      <NuxtLink to="/category/developer" class="pz-section-link">查看全部</NuxtLink>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink
        v-for="tool in popularTools"
        :key="tool.slug"
        :to="`/tools/${tool.slug}`"
        class="block h-full"
        style="text-decoration: none"
      >
        <article class="pz-card pz-tool-card p-4 flex flex-col h-full">
          <!-- 图标 -->
          <div
            class="w-8 h-8 flex items-center justify-center shrink-0"
            style="background-color: var(--pz-color-primary-light); border-radius: var(--pz-radius-md)"
          >
            <ToolIcon :slug="tool.slug" />
          </div>

          <!-- 名称 -->
          <h3
            class="mt-3 truncate"
            style="font-family: var(--pz-font-display); font-size: var(--pz-text-base); font-weight: var(--pz-weight-medium); line-height: var(--pz-leading-tight); color: var(--pz-color-text-primary)"
          >
            {{ tool.name }}
          </h3>

          <!-- 描述 -->
          <p
            class="mt-1 line-clamp-2"
            style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); line-height: 1.5; color: var(--pz-color-text-secondary)"
          >
            {{ tool.description }}
          </p>

          <!-- 统计 -->
          <div
            class="mt-auto pt-4 flex items-center justify-between text-xs"
            style="color: var(--pz-color-text-tertiary); font-family: var(--pz-font-sans)"
          >
            <span class="whitespace-nowrap flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {{ formatCount(tool.use_count) }} 次使用
            </span>
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
    </div>
  </section>

  <!-- ============ 首页中间广告位（热门工具和最新上架之间） ============ -->
  <div v-if="adData" class="my-12">
    <StaticAdCard
      id="homeMiddle"
      :title="adData.product_description"
      :image-url="adData.product_url"
      :link-url="adData.ad_url"
    />
  </div>

  <!-- ============ 最新上架区块（3 列网格 + NEW 标签） ============ -->
  <section v-if="latestTools.length > 0" class="pb-12" aria-label="最新上架">
    <div class="flex items-center justify-between mb-6">
      <h2
        style="font-family: var(--pz-font-display); font-size: var(--pz-text-2xl); font-weight: var(--pz-weight-semibold); line-height: var(--pz-leading-tight); letter-spacing: -0.01em; color: var(--pz-color-text-primary); text-wrap: balance; word-break: keep-all;"
      >
        最新上架
      </h2>
      <NuxtLink to="/category/developer" class="pz-section-link">查看全部</NuxtLink>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="tool in latestTools"
        :key="tool.slug"
        :to="`/tools/${tool.slug}`"
        class="block h-full"
        style="text-decoration: none"
      >
        <article class="pz-card pz-tool-card p-4 flex flex-col h-full">
          <div class="flex items-start justify-between">
            <div
              class="w-8 h-8 flex items-center justify-center shrink-0"
              style="background-color: var(--pz-color-primary-light); border-radius: var(--pz-radius-md)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--pz-color-primary)" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <span class="pz-badge pz-badge-primary whitespace-nowrap">NEW</span>
          </div>
          <h3
            class="mt-3 truncate"
            style="font-family: var(--pz-font-display); font-size: var(--pz-text-base); font-weight: var(--pz-weight-medium); line-height: var(--pz-leading-tight); color: var(--pz-color-text-primary)"
          >
            {{ tool.name }}
          </h3>
          <p
            class="mt-1 line-clamp-2"
            style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); line-height: 1.5; color: var(--pz-color-text-secondary)"
          >
            {{ tool.description }}
          </p>
          <div
            class="mt-auto pt-4 flex items-center justify-between text-xs"
            style="color: var(--pz-color-text-tertiary); font-family: var(--pz-font-sans)"
          >
            <span class="whitespace-nowrap flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {{ formatCount(tool.use_count) }} 次使用
            </span>
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
    </div>
  </section>

</template>
