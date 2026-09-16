<script setup lang="ts">
/**
 * pages/index.vue - 首页
 *
 * 布局与开发者工具分类页一致：
 * - 工具栏：分类标签（全部 / 开发者工具 / 图片工具）+ 排序下拉（按热门 / 按最新）
 * - 工具卡片网格（3 列），默认按热门，下拉切换按最新
 * - 广告位
 *
 * 数据来源：GET /api/v1/tools?sort=popular&limit=100（前端筛选与排序）
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

// SSR 并行获取热门/最新两份全量列表（后端排序，前端仅按分类筛选）
const { data: toolsBySort } = await useAsyncData<{
  popular: ToolItem[]
  latest: ToolItem[]
}>(
  'home-all-tools',
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    const fetchTools = (sort: string) =>
      $fetch<{ code: number; data: { items: ToolItem[] } }>('/api/v1/tools', {
        baseURL,
        params: { sort, limit: 100 },
      })
        .then((r) => (r.code === 0 ? r.data?.items || [] : []))
        .catch(() => [])

    const [popular, latest] = await Promise.all([
      fetchTools('popular'),
      fetchTools('latest'),
    ])
    return { popular, latest }
  },
  {
    default: () => ({ popular: [], latest: [] }),
    // payload 中已有数据（SSR 传输）时直接使用，避免客户端水合阶段
    // 强制重新请求导致卡片闪空
    getCachedData(key) {
      const nuxtApp = useNuxtApp()
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key] || undefined
    },
  },
)

// 顶部分类筛选标签
interface CategoryTab {
  key: string
  label: string
}

const categoryTabs: CategoryTab[] = [
  { key: 'all', label: '全部' },
  { key: 'developer', label: '开发者工具' },
  { key: 'image', label: '图片工具' },
]

const selectedTab = ref('all')
const sortBy = ref<'popular' | 'latest'>('popular')

function selectTab(key: string) {
  selectedTab.value = key
}

// 当前排序对应的列表，再按分类筛选
const displayTools = computed(() => {
  const source = toolsBySort.value?.[sortBy.value] || []
  if (selectedTab.value === 'all') return source
  return source.filter((t) => t.category === selectedTab.value)
})

// 各分类工具数量（以热门全量列表为准，按 slug 去重）
const tabCounts = computed<Record<string, number>>(() => {
  const all = toolsBySort.value?.popular || []
  const slugs = new Set<string>()
  let developer = 0
  let image = 0
  for (const t of all) {
    if (slugs.has(t.slug)) continue
    slugs.add(t.slug)
    if (t.category === 'developer') developer++
    else if (t.category === 'image') image++
  }
  return { all: slugs.size, developer, image }
})

function tabCount(key: string): number {
  return tabCounts.value[key] || 0
}

function formatCount(count: number): string {
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}
</script>

<template>
  <!-- ============ 工具栏：分类标签 + 排序下拉 ============ -->
  <section
    class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6"
    aria-label="工具筛选与排序"
  >
    <!-- 分类标签 -->
    <div class="pz-home-tabs" role="tablist" aria-label="工具分类筛选">
      <button
        v-for="tab in categoryTabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="pz-home-tab"
        :data-active="selectedTab === tab.key"
        :aria-selected="selectedTab === tab.key"
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
        <span class="pz-home-tab-count">{{ tabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 排序下拉 -->
    <div class="flex items-center gap-2 shrink-0">
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

  <!-- ============ 广告位（工具栏与工具列表之间） ============ -->
  <div v-if="adData" class="mb-6">
    <StaticAdCard
      id="homeMiddle"
      :title="adData.product_description"
      :image-url="adData.product_url"
      :link-url="adData.ad_url"
    />
  </div>

  <!-- ============ 工具卡片网格（3 列） ============ -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="工具列表">
    <NuxtLink
      v-for="(tool, index) in displayTools"
      :key="tool.slug"
      :to="`/tools/${tool.slug}`"
      class="pz-tool-link block h-full"
      style="text-decoration: none"
    >
      <article class="pz-card pz-tool-card p-5 flex flex-col h-full relative">
        <!-- 热门前三 HOT 徽标（右上角，仅按热门排序时） -->
        <span
          v-if="sortBy === 'popular' && index < 3"
          class="pz-badge pz-badge-primary pz-card-hot"
        >
          HOT
        </span>
        <!-- 图标 + 名称 -->
        <div class="flex items-start gap-3" :class="sortBy === 'popular' && index < 3 ? 'pr-12' : ''">
          <div
            class="w-7 h-7 flex items-center justify-center shrink-0"
            style="background-color: var(--pz-color-primary-light); border-radius: var(--pz-radius-md)"
          >
            <ToolIcon :slug="tool.slug" />
          </div>
          <h3
            class="text-base font-semibold truncate min-w-0"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display)"
          >
            {{ tool.name }}
          </h3>
        </div>

        <!-- 分类徽标 -->
        <span class="pz-badge pz-badge-neutral mt-3 self-start whitespace-nowrap">
          {{ tool.category === 'image' ? '图片工具' : '开发工具' }}
        </span>

        <!-- 描述 -->
        <p
          class="text-sm mt-2 line-clamp-2"
          style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.5"
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{{ tool.like_count }}</span>
          </span>
        </div>
      </article>
    </NuxtLink>

    <!-- 无数据提示 -->
    <div
      v-if="displayTools.length === 0"
      class="col-span-full text-center py-12"
    >
      <p style="color: var(--pz-color-text-tertiary); font-size: var(--pz-text-sm)">
        暂无工具数据
      </p>
    </div>
  </section>
</template>
