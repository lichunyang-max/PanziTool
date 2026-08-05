<script setup lang="ts">
/**
 * AppHeader - 固定头部（全宽，高度 64px）
 * 严格参照 UI 参考文件 ui/pages/首页.html 的 header 结构
 * - 左侧：Logo（PanziPool，Indigo 色，扳手 SVG 图标）+ 主导航
 * - 右侧：搜索框（max-width 240px，带搜索图标）
 */
const route = useRoute()

interface NavItem {
  label: string
  to: string
  key: string
  isNew?: boolean
}

const navItems: NavItem[] = [
  { label: '首页', to: '/', key: 'home' },
  { label: '开发者工具', to: '/category/developer', key: 'dev-tools' },
  { label: '关于我们', to: '/about', key: 'about' },
  { label: '意见反馈', to: '/feedback', key: 'feedback', isNew: true },
  { label: '隐私政策', to: '/privacy', key: 'privacy' },
]

// 导航激活状态：首页精确匹配，其余前缀匹配（工具页也高亮"开发者工具"）
function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/') || route.path.startsWith(to)
}

const searchKeyword = ref('')

// 搜索功能：Enter 时获取工具列表，本地匹配工具名/关键词，跳转第一个匹配项
async function onSearchEnter() {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return

  try {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBase
    const res = await $fetch<{
      code: number
      data: { items: Array<{ slug: string; name: string; keywords?: string }>; total: number }
    }>('/api/v1/tools', { baseURL, params: { limit: 100 } })
    if (res.code !== 0 || !res.data?.items) return

    const matched = res.data.items.find((tool) => {
      const name = (tool.name || '').toLowerCase()
      const keywords = (tool.keywords || '').toLowerCase()
      return name.includes(keyword) || keywords.includes(keyword)
    })

    if (matched) {
      await navigateTo(`/tools/${matched.slug}`)
    }
  } catch {
    // 静默忽略搜索失败
  }
}
</script>

<template>
  <header
    class="flex-shrink-0"
    style="
      background-color: var(--pz-color-bg);
      border-bottom: 1px solid var(--pz-color-border);
      height: 64px;
      position: relative;
      z-index: 50;
    "
  >
    <div
      class="h-16 flex items-center justify-between gap-8"
      style="padding-left: 2rem; padding-right: 2rem"
    >
      <div class="flex items-center gap-8 min-w-0">
        <!-- Logo -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2 shrink-0"
          style="
            color: var(--pz-color-primary);
            font-family: var(--pz-font-display);
            font-weight: 700;
            font-size: var(--pz-text-xl);
            letter-spacing: -0.02em;
            text-decoration: none;
          "
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            />
          </svg>
          <span>盘子工具站</span>
        </NuxtLink>

        <!-- 主导航 -->
        <nav class="flex items-center gap-1" role="navigation" aria-label="主导航">
          <NuxtLink
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="pz-nav-link"
            :data-active="isActive(item.to)"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            <span
              v-if="item.isNew"
              class="inline-block align-middle mr-1 px-1 leading-none"
              style="
                font-size: 10px;
                font-weight: 700;
                color: #fff;
                background-color: var(--pz-color-primary);
                border-radius: 4px;
                padding-top: 2px;
                padding-bottom: 2px;
              "
              aria-label="新上架"
            >NEW</span>
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <!-- 搜索框 -->
      <div class="relative shrink-0" style="max-width: 240px">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="color: var(--pz-color-text-tertiary)"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索工具..."
          class="pz-input w-full"
          style="max-width: 240px; padding-left: 2.25rem"
          aria-label="搜索工具"
          @keydown.enter="onSearchEnter"
        >
      </div>
    </div>
  </header>
</template>
