<script setup lang="ts">
/**
 * ToolLayout.vue - 工具详情页通用布局组件
 *
 * 严格参照 ui/pages/JSON格式化工具.html 的布局结构
 * 包含插槽：
 * - 面包屑导航（首页 > 分类 > 工具名）
 * - 工具头部（标题、描述、use_count/like_count 展示、点赞按钮）
 * - 工具交互区插槽（默认插槽，双栏输入输出区）
 * - 操作工具栏插槽（格式化/压缩/校验/清空）
 * - 错误展示区（红色背景卡片，可选）
 * - FAQ 区（可折叠 details/summary）
 * - 广告位插槽（底部广告占位）
 * - 下一工具链接
 */
import { Heart, Eye } from 'lucide-vue-next'

export interface ToolMeta {
  slug: string
  name: string
  description: string
  category: string
  useCount: number
  likeCount: number
  isLiked?: boolean
  nextTool?: {
    slug: string
    name: string
  }
  seoTitle?: string
  seoDescription?: string
}

interface AdItem {
  product_description: string
  product_url: string
  ad_url: string
}

const props = defineProps<{
  tool: ToolMeta
}>()

const emit = defineEmits<{
  like: [slug: string]
}>()

// SSR 获取工具页底部广告数据（tool_footer）
const { data: adData } = await useAsyncData<AdItem | null>(
  'tool-footer-ad',
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
        params: { locationSymbol: 'tool_footer' },
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

// 从 category 获取分类中文名和路由
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

function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return String(count)
}
</script>

<template>
  <div>
    <!-- ============ 面包屑导航 ============ -->
    <nav class="flex items-center gap-2 text-sm mb-6" aria-label="面包屑">
      <NuxtLink to="/" class="pz-footer-link">首页</NuxtLink>
      <span style="color: var(--pz-color-text-tertiary)">/</span>
      <NuxtLink :to="categoryRoute" class="pz-footer-link">{{ categoryLabel }}</NuxtLink>
      <span style="color: var(--pz-color-text-tertiary)">/</span>
      <span style="color: var(--pz-color-text-primary); font-weight: 500">{{ tool.name }}</span>
    </nav>

    <!-- ============ 工具头部 ============ -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div class="min-w-0">
        <h1
          class="text-2xl font-bold"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          {{ tool.name }}
        </h1>
        <p class="text-sm mt-1" style="color: var(--pz-color-text-secondary)">
          {{ tool.description }}
        </p>
      </div>
      <div class="flex items-center gap-4 shrink-0">
        <div
          class="flex items-center gap-3 text-sm"
          style="color: var(--pz-color-text-tertiary)"
        >
          <span class="flex items-center gap-1 tabular-nums whitespace-nowrap">
            <Eye class="w-4 h-4" aria-hidden="true" />
            {{ formatCount(tool.useCount) }} 次使用
          </span>
          <span class="flex items-center gap-1 tabular-nums whitespace-nowrap">
            <Heart class="w-4 h-4" aria-hidden="true" :style="{ color: tool.isLiked ? 'var(--pz-color-primary)' : undefined }" />
            {{ tool.likeCount }}
          </span>
        </div>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          :aria-label="tool.isLiked ? `已点赞 ${tool.name}` : `点赞 ${tool.name}`"
          :style="tool.isLiked ? { backgroundColor: 'var(--pz-color-primary-light)', borderColor: 'var(--pz-color-primary-border)', color: 'var(--pz-color-primary)' } : undefined"
          @click="emit('like', tool.slug)"
        >
          <Heart class="w-4 h-4" aria-hidden="true" :style="{ color: tool.isLiked ? 'var(--pz-color-primary)' : undefined }" />
          <span>{{ tool.isLiked ? '已点赞' : '点赞' }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 工具交互区 ============ -->
    <!-- 默认插槽：双栏输入输出区 -->
    <slot />

    <!-- ============ 操作工具栏插槽 ============ -->
    <div
      v-if="$slots.toolbar"
      class="flex flex-wrap items-center justify-center gap-3 py-4"
    >
      <slot name="toolbar" />
    </div>

    <!-- ============ 错误展示区 ============ -->
    <slot name="error" />

    <!-- ============ FAQ 区 ============ -->
    <slot name="faq" />

    <!-- ============ 广告位（动态数据源，无数据时静默隐藏） ============ -->
    <StaticAdCard
      v-if="adData && !['regex-tester', 'timestamp', 'url-encode', 'jwt-decoder', 'hash', 'cron', 'image-crop', 'image-convert', 'qr-code', 'id-photo'].includes(tool.slug)"
      id="toolFooter"
      :title="adData.product_description"
      :image-url="adData.product_url"
      :link-url="adData.ad_url"
    />

    <!-- ============ 下一工具链接 ============ -->
    <div v-if="tool.nextTool" class="flex justify-end py-4">
      <NuxtLink
        :to="`/tools/${tool.nextTool.slug}`"
        class="inline-flex items-center gap-1 text-sm font-medium hover:underline whitespace-nowrap"
        style="color: var(--pz-color-primary)"
      >
        下一个工具：{{ tool.nextTool.name }}
        <svg
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
          <line x1="5" x2="19" y1="12" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>
