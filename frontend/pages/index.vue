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

// SEO 基础配置
useSeoMeta({
  title: '首页',
  description:
    'PanziPool 在线工具聚合站 - JSON格式化、URL编码、Base64、时间戳、正则测试、JWT解析、哈希计算及图片压缩裁剪等开发者与图片工具，无需安装，隐私优先。',
})

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

// 热门工具（前 8 个，按 use_count 排序）
const popularTools = computed(() => {
  const all = (toolsData.value || [])
  return [...all].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 8)
})

// 最新上架工具（后 3 个，按 created_at 倒序，且不在热门前 4 中）
const latestTools = computed(() => {
  const all = [...(toolsData.value || [])]
  const popularSlugs = new Set(popularTools.value.slice(0, 4).map((t) => t.slug))
  return all
    .filter((t) => !popularSlugs.has(t.slug))
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 3)
})

/**
 * 格式化次数显示
 */
function formatCount(count: number): string {
  if (count >= 10000) return (count / 1000).toFixed(1) + 'k'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}

/**
 * 获取工具图标 SVG（简化版，使用通用图标）
 */
const toolIconMap: Record<string, string> = {
  'json-formatter': 'json',
  'regex-tester': 'search',
  timestamp: 'clock',
  'url-encode': 'link',
  'jwt-decoder': 'key',
  base64: 'code',
  hash: 'hash',
  'image-compress': 'image',
  'image-crop': 'crop',
  'image-convert': 'convert',
}
</script>

<template>
  <!-- ============ 首页顶部广告位 ============ -->
  <AdSlot slot-key="homeTop" />

  <!-- ============ 热门工具区块（4 列网格） ============ -->
  <section class="pb-12" aria-label="热门工具">
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
            <svg
              v-if="toolIconMap[tool.slug] === 'json'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/>
              <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'search'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'clock'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'link'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'key'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <circle cx="7.5" cy="15.5" r="5.5"/>
              <path d="m21 2-9.6 9.6"/>
              <path d="m15.5 7.5 3 3L22 7l-3-3"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'code'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'hash'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <line x1="4" x2="20" y1="9" y2="9"/>
              <line x1="4" x2="20" y1="15" y2="15"/>
              <line x1="10" x2="8" y1="3" y2="21"/>
              <line x1="16" x2="14" y1="3" y2="21"/>
            </svg>
            <svg
              v-else-if="toolIconMap[tool.slug] === 'image'"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <svg
              v-else
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="color: var(--pz-color-primary)" aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" x2="22" y1="12" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
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
            class="mt-auto pt-3 flex items-center gap-1"
            style="font-family: var(--pz-font-sans); font-size: var(--pz-text-xs); color: var(--pz-color-text-tertiary)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="whitespace-nowrap">{{ formatCount(tool.use_count) }} 次使用</span>
          </div>
        </article>
      </NuxtLink>
    </div>
  </section>

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
            class="mt-auto pt-3 flex items-center gap-1"
            style="font-family: var(--pz-font-sans); font-size: var(--pz-text-xs); color: var(--pz-color-text-tertiary)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="whitespace-nowrap">{{ formatCount(tool.use_count) }} 次使用</span>
          </div>
        </article>
      </NuxtLink>
    </div>
  </section>

</template>
