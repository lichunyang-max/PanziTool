<script setup lang="ts">
/**
 * pages/mobile/tools/[slug].vue - 移动端开发者工具详情页
 *
 * 参考 panzi-tools-mobile/pages/json-format.html 设计：
 * - 使用 MobileToolLayout 组件包裹
 * - 动态加载移动端专用工具组件（mobileToolRegistry）
 * - 中间广告位使用 MobileAdCard（ad_location_symbol='dev_tool_middle'）
 * - 底部使用说明区
 *
 * 数据来源：GET /api/v1/tools/{slug}
 */
definePageMeta({
  layout: 'mobile',
})

import { hasMobileTool, mobileToolRegistry } from '~/utils/mobileToolRegistry'
import { getToolStaticMeta, type ToolFaqItem } from '~/utils/toolMeta'
import type { MobileToolMeta } from '~/components/mobile/MobileToolLayout.vue'

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

interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

// ============ SSR 数据获取 ============

// 获取工具详情
const { data: toolData } = await useAsyncData<ToolData | null>(
  `mobile-tool-${slug.value}`,
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
      return null
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

// 获取中间广告数据
const { data: adData } = await useAsyncData<AdItem | null>(
  `mobile-tool-ad-${slug.value}`,
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
        params: { locationSymbol: 'dev_tool_middle' },
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

// ============ 计算属性 ============

// 静态元数据（降级用）
const staticMeta = computed(() => getToolStaticMeta(slug.value))

// 基础工具元数据（API 数据 + 静态降级）
const baseToolMeta = computed<MobileToolMeta>(() => {
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
  const meta = staticMeta.value
  return {
    slug: slug.value,
    name: meta?.name || slug.value,
    description: meta?.description || '',
    category: meta?.category || 'developer',
    useCount: 0,
    likeCount: 0,
  }
})

// 点赞状态
const { anonId, isLiked, addLiked } = useAnonId()
const localLiked = ref(false)
const localLikeCount = ref(baseToolMeta.value.likeCount)

onMounted(() => {
  localLiked.value = isLiked(slug.value)
})

// 最终 ToolMeta（合并本地点赞状态）
const toolMeta = computed<MobileToolMeta>(() => ({
  ...baseToolMeta.value,
  likeCount: localLikeCount.value,
  isLiked: localLiked.value,
}))

// 分类路由
const categoryRoute = computed(() => {
  if (toolMeta.value.category === 'image') {
    return '/mobile/image-tools'
  }
  return '/mobile/tools'
})

// 工具交互组件懒加载（使用移动端专用注册表）
const hasToolComponent = computed(() => hasMobileTool(slug.value))
const toolComponent = computed(() => {
  if (hasToolComponent.value && mobileToolRegistry[slug.value]) {
    return defineAsyncComponent(mobileToolRegistry[slug.value])
  }
  return null
})

// FAQ 数据
const faqItems = computed<ToolFaqItem[]>(() => {
  return staticMeta.value?.faq || []
})

// SEO 元数据
const seoTitle = computed(() => toolMeta.value.name || staticMeta.value?.name || slug.value)
const seoDescription = computed(() => toolMeta.value.description || staticMeta.value?.description || `${seoTitle.value} - 盘子工具站在线工具`)

useSeoMeta({
  title: seoTitle.value,
  ogTitle: seoTitle.value,
  description: seoDescription.value,
  ogDescription: seoDescription.value,
  ogType: 'website',
})

// 点赞处理
async function handleLike(slugParam: string) {
  if (localLiked.value) return

  try {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBase as string
    const response = await $fetch<{ code: number; data?: { like_count?: number; liked?: boolean }; message?: string }>(
      `/api/v1/tools/${slugParam}/like`,
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
      addLiked(slugParam)
      if (response.data?.like_count) {
        localLikeCount.value = response.data.like_count
      } else {
        localLikeCount.value++
      }
    } else if (response.code === 409) {
      localLiked.value = true
      addLiked(slugParam)
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
  <div class="mobile-tool-page">
    <!-- 已注册工具组件时正常渲染 -->
    <template v-if="hasToolComponent && toolComponent">
      <MobileToolLayout :tool="toolMeta" @like="handleLike">
        <!-- 中间广告位 -->
        <template #ad>
          <MobileAdCard
            v-if="adData"
            :title="adData.product_description"
            :link-url="adData.ad_url"
            :image-url="adData.product_url"
            :ad-id="`dev_tool_middle_${slug}`"
          />
        </template>

        <!-- 工具交互区 -->
        <component
          :is="toolComponent"
          :slug="slug"
          @tool-use="() => {}"
          @copy="() => {}"
        />

        <!-- 使用说明区 -->
        <template #instruction>
          <section v-if="faqItems.length > 0" class="mobile-faq" aria-label="使用说明">
            <h2 class="mobile-faq__title">使用说明</h2>
            <div class="mobile-faq__list">
              <details
                v-for="(item, index) in faqItems"
                :key="index"
                class="mobile-faq__item"
                :open="index === 0"
              >
                <summary class="mobile-faq__question">
                  {{ item.question }}
                  <svg
                    class="mobile-faq__chevron"
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p class="mobile-faq__answer">{{ item.answer }}</p>
              </details>
            </div>
          </section>
        </template>
      </MobileToolLayout>
    </template>

    <!-- 工具未注册组件时的占位页面 -->
    <template v-else>
      <div class="mobile-placeholder">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mobile-placeholder__icon"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <h2 class="mobile-placeholder__title">工具组件尚未加载</h2>
        <p class="mobile-placeholder__desc">
          {{ seoTitle }} 的交互组件将在后续版本中实现。
        </p>
        <NuxtLink to="/mobile/tools" class="mobile-placeholder__back">
          返回工具列表
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mobile-tool-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* --- FAQ --- */
.mobile-faq {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-faq__title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.mobile-faq__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-faq__item {
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 10px;
  padding: 12px 14px;
}

.mobile-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
  list-style: none;
}

.mobile-faq__question::-webkit-details-marker {
  display: none;
}

.mobile-faq__chevron {
  color: #9ca3af;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.mobile-faq__item[open] .mobile-faq__chevron {
  transform: rotate(180deg);
}

.mobile-faq__answer {
  font-size: 13px;
  color: #6b7280;
  margin: 8px 0 0;
  line-height: 1.6;
}

/* --- 占位页 --- */
.mobile-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 12px;
}

.mobile-placeholder__icon {
  color: #9ca3af;
}

.mobile-placeholder__title {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.mobile-placeholder__desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.mobile-placeholder__back {
  font-size: 14px;
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
}
</style>
