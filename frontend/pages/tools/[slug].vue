<script setup lang="ts">
/**
 * pages/tools/[slug].vue - 工具详情页动态路由
 *
 * - 从路由 params.slug 获取工具 slug
 * - SSR 阶段获取工具详情（GET /api/v1/tools/{slug}）
 * - 降级策略：后端不可用时计数显示 "-"
 * - 使用 ToolLayout 渲染
 * - 通过 toolRegistry 懒加载对应工具交互组件
 */
import { hasTool, toolRegistry } from '~/utils/toolRegistry'
import type { ToolMeta } from '~/components/tool/ToolLayout.vue'

interface ToolData {
  slug: string
  name: string
  description: string
  category: string
  keywords: string
  useCount: number
  likeCount: number
}

interface ApiToolResponse {
  slug: string
  name: string
  description: string
  category: string
  keywords?: string
  use_count?: number
  like_count?: number
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

// SSR 数据获取
const { data: toolData } = await useAsyncData<ToolData | null>(
  `tool-${slug.value}`,
  async () => {
    const config = useRuntimeConfig()
    const baseURL = import.meta.server
      ? (config.apiBase as string)
      : (config.public.apiBase as string)

    try {
      const response = await $fetch<{ code: number; data: ApiToolResponse }>(
        `/api/v1/tools/${slug.value}`,
        { baseURL },
      )
      if (response.code === 0 && response.data) {
        const d = response.data
        return {
          slug: d.slug,
          name: d.name,
          description: d.description,
          category: d.category,
          keywords: d.keywords || '',
          useCount: d.use_count || 0,
          likeCount: d.like_count || 0,
        }
      }
      return null
    } catch {
      // SSR 降级：返回 null，组件层用默认值
      return null
    }
  },
  {
    // SWR 缓存 60s
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

// 基础 ToolMeta（来自 API 数据）
const baseToolMeta = computed<ToolMeta>(() => {
  if (toolData.value) {
    return {
      slug: toolData.value.slug,
      name: toolData.value.name,
      description: toolData.value.description,
      category: toolData.value.category,
      useCount: toolData.value.useCount,
      likeCount: toolData.value.likeCount,
    }
  }
  // 降级数据
  return {
    slug: slug.value,
    name: slug.value,
    description: '',
    category: 'developer',
    useCount: 0,
    likeCount: 0,
  }
})

// 点赞处理
const { anonId, isLiked, addLiked } = useAnonId()
const localLiked = ref(false)
const localLikeCount = ref(baseToolMeta.value.likeCount)

onMounted(() => {
  localLiked.value = isLiked(slug.value)
})

// 最终 ToolMeta（合并本地点赞状态）
const toolMeta = computed<ToolMeta>(() => ({
  ...baseToolMeta.value,
  likeCount: localLikeCount.value,
  isLiked: localLiked.value,
}))

// SEO 元数据
const seoTitle = computed(() => toolMeta.value.name || slug.value)
const seoDescription = computed(() => toolMeta.value.description || `${seoTitle.value} - 盘子 在线工具`)

useSeoMeta({
  title: seoTitle.value,
  ogTitle: seoTitle.value,
  description: seoDescription.value,
  ogDescription: seoDescription.value,
  ogType: 'website',
  ogUrl: () => `https://www.panzipool.com/tools/${slug.value}`,
})

// canonical URL
useHead({
  link: () => [
    {
      rel: 'canonical',
      href: `https://www.panzipool.com/tools/${slug.value}`,
    },
  ],
})

// JSON-LD 结构化数据
useHead({
  script: () => [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: toolMeta.value.name,
        description: toolMeta.value.description,
        applicationCategory: 'DeveloperApplication',
        url: `https://www.panzipool.com/tools/${slug.value}`,
      }),
    },
  ],
})

// 工具组件懒加载
const hasToolComponent = computed(() => hasTool(slug.value))
const toolComponent = computed(() => {
  if (hasToolComponent.value && toolRegistry[slug.value]) {
    return defineAsyncComponent(toolRegistry[slug.value])
  }
  return null
})

async function handleLike() {
    if (localLiked.value) return

    try {
      const config = useRuntimeConfig()
      const baseURL = config.public.apiBase as string
      const response = await $fetch<{ code: number; data?: { like_count?: number; liked?: boolean }; message?: string }>(
        `/api/v1/tools/${slug.value}/like`,
        {
          baseURL,
          method: 'POST',
          body: { anon_id: anonId.value },
          onResponseError() {
            throw new Error('点赞失败')
          },
        },
      )

      if (response.code === 0) {
        localLiked.value = true
        addLiked(slug.value)
        if (response.data?.like_count) {
          localLikeCount.value = response.data.like_count
        } else {
          localLikeCount.value++
        }
      } else if (response.code === 409) {
        // 重复点赞，同步修正 localStorage
        localLiked.value = true
        addLiked(slug.value)
        if (response.data?.like_count) {
          localLikeCount.value = response.data.like_count
        }
      }
    } catch {
      // 网络错误静默忽略
    }
  }
</script>

<template>
  <div>
    <!-- 工具已注册组件时使用 ToolLayout 渲染 -->
    <template v-if="hasToolComponent && toolComponent">
      <ToolLayout :tool="toolMeta" @like="handleLike">
        <component :is="toolComponent" :slug="slug" />

        <template #error>
          <!-- 工具内部错误由 ErrorBoundary 捕获 -->
        </template>

        <template #faq>
          <!-- 各工具的 FAQ 由各自组件提供 -->
        </template>
      </ToolLayout>
    </template>

    <!-- 工具未注册组件时的占位页面 -->
    <template v-else>
      <div class="py-12 text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mx-auto mb-4"
          style="color: var(--pz-color-text-tertiary)"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <h2
          class="text-lg font-semibold mb-2"
          style="color: var(--pz-color-text-primary)"
        >
          工具组件尚未加载
        </h2>
        <p style="color: var(--pz-color-text-secondary); font-size: var(--pz-text-sm)">
          {{ seoTitle }} 的交互组件将在后续版本中实现。
        </p>
        <NuxtLink
          to="/"
          class="inline-block mt-4"
          style="color: var(--pz-color-primary); font-size: var(--pz-text-sm)"
        >
          返回首页
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
