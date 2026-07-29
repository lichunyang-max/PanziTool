<script setup lang="ts">
/**
 * pages/mobile/index.vue - 移动端首页
 *
 * 参考 panzi-tools-mobile/pages/index.html 设计：
 * - 顶部品牌区：Logo + Slogan + 简短描述
 * - 分类入口区：开发者工具 + 图片工具（2列卡片）
 * - 热门推荐区：使用 MobileToolCard 组件（grid 模式）
 * - 底部广告位：MobileAdCard 组件
 *
 * 数据来源：
 * - GET /api/v1/tools?sort=popular&limit=8 热门工具
 * - GET /api/v1/ads?locationSymbol=home_middle 首页广告
 */

definePageMeta({
  layout: 'mobile',
})

useHead({
  titleTemplate: null,
  title: '盘子工具站 - 免费在线开发者工具 图片处理工具集合',
  meta: [
    {
      name: 'description',
      content: '面向中文开发者的免费在线工具站，提供JSON格式化、正则测试、图片压缩等实用工具，免登录无广告，本地处理保护隐私，打开即用。',
    },
    {
      name: 'keywords',
      content: '在线工具,开发者工具,JSON格式化,图片压缩,正则测试',
    },
    {
      property: 'og:title',
      content: '盘子工具站 - 免费在线开发者工具 图片处理工具集合',
    },
    {
      property: 'og:description',
      content: '面向中文开发者的免费在线工具站，提供JSON格式化、正则测试、图片压缩等实用工具，免登录无广告，本地处理保护隐私，打开即用。',
    },
  ],
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

// ============ SSR 数据获取 ============

// 获取首页中间广告数据
const { data: adData } = await useAsyncData<AdItem | null>(
  'mobile-home-ad',
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

// 获取热门工具数据
const { data: toolsData } = await useAsyncData<ToolItem[]>(
  'mobile-home-tools',
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

// ============ 计算属性 ============

// 热门工具（按 use_count 排序取前 8 个）
const popularTools = computed(() => {
  const all = (toolsData.value || [])
  return [...all].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 8)
})

// 格式化计数
function formatCount(count: number): string {
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}
</script>

<template>
  <div class="mobile-page">
    <!-- ============ 顶部品牌区 ============ -->
    <section class="mobile-hero">
      <div class="mobile-hero__brand">
        <div class="mobile-hero__logo" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2.5"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span class="mobile-hero__site-name">盘子工具站</span>
      </div>
      <h1 class="mobile-hero__slogan">高效开发，随手即达</h1>
      <p class="mobile-hero__desc">
        免费在线开发者工具与图片处理工具集合，免登录打开即用，本地处理保护隐私
      </p>
    </section>

    <!-- ============ 分类入口区 ============ -->
    <section class="mobile-categories" aria-label="工具分类入口">
      <NuxtLink
        to="/mobile/tools"
        class="mobile-cat-card mobile-cat-card--developer"
      >
        <div class="mobile-cat-card__icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <div class="mobile-cat-card__info">
          <span class="mobile-cat-card__title">开发者工具</span>
          <span class="mobile-cat-card__subtitle">JSON / 正则 / 编码</span>
        </div>
        <svg
          class="mobile-cat-card__arrow"
          width="16"
          height="16"
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
      </NuxtLink>

      <NuxtLink
        to="/mobile/image-tools"
        class="mobile-cat-card mobile-cat-card--image"
      >
        <div class="mobile-cat-card__icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <div class="mobile-cat-card__info">
          <span class="mobile-cat-card__title">图片工具</span>
          <span class="mobile-cat-card__subtitle">压缩 / 裁剪 / 转换</span>
        </div>
        <svg
          class="mobile-cat-card__arrow"
          width="16"
          height="16"
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
      </NuxtLink>
    </section>

    <!-- ============ 热门推荐区 ============ -->
    <section class="mobile-section" aria-label="热门推荐">
      <div class="mobile-section__header">
        <h2 class="mobile-section__title">热门工具</h2>
        <NuxtLink to="/mobile/tools" class="mobile-section__more">查看全部</NuxtLink>
      </div>

      <div class="mobile-tool-grid">
        <MobileToolCard
          v-for="tool in popularTools"
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
      </div>

      <div
        v-if="!popularTools || popularTools.length === 0"
        class="mobile-empty"
      >
        <p>暂无工具数据</p>
      </div>
    </section>

    <!-- ============ 底部广告位 ============ -->
    <div v-if="adData" class="mobile-ad-wrap">
      <MobileAdCard
        :title="adData.product_description"
        :link-url="adData.ad_url"
        :image-url="adData.product_url"
        ad-id="home_mobile_bottom"
      />
    </div>
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
  gap: 20px;
  padding: 16px 0;
}

/* --- 顶部品牌区 --- */
.mobile-hero {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 4px;
}

.mobile-hero__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-hero__logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--m-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-hero__site-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--m-color-text-primary);
}

.mobile-hero__slogan {
  font-size: 22px;
  font-weight: 700;
  color: var(--m-color-text-primary);
  margin: 8px 0 0;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.mobile-hero__desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* --- 分类入口区 --- */
.mobile-categories {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mobile-cat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: var(--m-color-surface);
  border-radius: 12px;
  border: 1px solid var(--m-color-border-light);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  min-height: 72px;
}

.mobile-cat-card:active {
  border-color: var(--m-color-primary-light);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);
}

.mobile-cat-card--developer {
  background: linear-gradient(135deg, #f0e6ff, #faf5ff);
}

.mobile-cat-card--image {
  background: linear-gradient(135deg, #fef3c7, #fffbeb);
}

.mobile-cat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-cat-card--developer .mobile-cat-card__icon {
  background: var(--m-color-primary);
  color: #fff;
}

.mobile-cat-card--image .mobile-cat-card__icon {
  background: #f59e0b;
  color: #fff;
}

.mobile-cat-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-cat-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--m-color-text-primary);
}

.mobile-cat-card__subtitle {
  font-size: 11px;
  color: var(--m-color-text-secondary);
}

.mobile-cat-card__arrow {
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

/* --- 区块通用 --- */
.mobile-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-section__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--m-color-text-primary);
  margin: 0;
}

.mobile-section__more {
  font-size: 13px;
  color: var(--m-color-primary);
  text-decoration: none;
}

.mobile-section__more:active {
  opacity: 0.7;
}

/* --- 工具网格 --- */
.mobile-tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* --- 广告位 --- */
.mobile-ad-wrap {
  margin-top: 4px;
}

/* --- 空状态 --- */
.mobile-empty {
  text-align: center;
  padding: 32px 0;
  color: var(--m-color-text-tertiary);
  font-size: 13px;
}
</style>
