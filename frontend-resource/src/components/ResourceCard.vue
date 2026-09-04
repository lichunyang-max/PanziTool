<script setup lang="ts">
/**
 * ResourceCard.vue - 资源卡片（设计稿样式）
 *
 * 图标优先级：emoji icon > MinIO 图片 > 默认文档图标
 * emoji 图标背景色按资源 ID 从预设色板轮换（贴合设计稿多彩风格）
 * 标签：第一个橙色（hot）、第二个蓝色（new）
 * 右上角点赞，底部下载次数 + "查看详情"
 * 点击卡片进入详情页 /resource/:id
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAnonId, isLikedLocal, likeResource, markLikedLocal } from '../api'
import type { ResourceItem } from '../types'

/** 预设图标底色（按资源 ID 轮换，贴合设计稿多彩风格） */
const ICON_COLORS = ['#4f7cff', '#ff7a59', '#6c5ce7', '#10b981', '#f59e0b', '#ef4444']

const props = defineProps<{
  item: ResourceItem
}>()

const router = useRouter()

/** 图片加载失败标记：回退默认图标 */
const imageFailed = ref(false)

/** 本地已点赞标记 */
const liked = ref(isLikedLocal(props.item.id))
const liking = ref(false)
const likeCount = ref(props.item.likeCount ?? 0)
const downloadCount = ref(props.item.downloadCount ?? 0)

/** 图标底色（仅 emoji 图标与默认图标使用） */
const iconColor = computed(
  () => ICON_COLORS[Math.abs(props.item.id) % ICON_COLORS.length],
)

/** 图标展示模式：emoji > 图片 > 默认 */
const iconMode = computed(() => {
  if (props.item.icon) return 'emoji'
  if (props.item.image && !imageFailed.value) return 'image'
  return 'default'
})

const iconStyle = computed(() =>
  iconMode.value !== 'image'
    ? { background: `${iconColor.value}15`, color: iconColor.value }
    : undefined,
)

/** 卡片 title：名称 + 描述（悬停完整展示） */
const cardTitle = computed(() =>
  props.item.description ? `${props.item.name}\n${props.item.description}` : props.item.name,
)

function onImageError() {
  imageFailed.value = true
}

/** 点击卡片 → 详情页 */
function openDetail() {
  void router.push(`/resource/${props.item.id}`)
}

/** 点赞（阻止冒泡） */
async function handleLike(event: MouseEvent) {
  event.stopPropagation()
  if (liked.value || liking.value) return
  liking.value = true
  try {
    const anonId = getAnonId()
    const result = await likeResource(props.item.id, anonId)
    liked.value = true
    markLikedLocal(props.item.id)
    if (result) {
      likeCount.value = result.likeCount
    } else {
      likeCount.value += 1
    }
  } catch {
    // 点赞失败静默忽略
  } finally {
    liking.value = false
  }
}
</script>

<template>
  <div
    class="res-card"
    role="button"
    tabindex="0"
    :title="cardTitle"
    @click="openDetail"
    @keyup.enter="openDetail"
  >
    <!-- 头部：图标 + 名称 + 描述 -->
    <div class="rc-head">
      <div class="rc-icon" :style="iconStyle">
        <!-- emoji 图标 -->
        <span v-if="iconMode === 'emoji'">{{ item.icon }}</span>
        <!-- MinIO 图片 -->
        <img
          v-else-if="iconMode === 'image'"
          :src="item.image!"
          :alt="item.name"
          loading="lazy"
          @error="onImageError"
        />
        <!-- 默认文档图标 -->
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      <div style="min-width: 0">
        <div class="rc-title">{{ item.name }}</div>
        <div v-if="item.description" class="rc-desc">{{ item.description }}</div>
      </div>
    </div>

    <!-- 右上角点赞 -->
    <button
      class="card-like"
      :class="{ liked }"
      type="button"
      :aria-label="liked ? '已点赞' : '点赞'"
      :disabled="liked || liking"
      @click="handleLike"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
      <span>{{ likeCount }}</span>
    </button>

    <!-- 标签（最多 2 个：第一个 hot 橙、第二个 new 蓝） -->
    <div class="rc-tags">
      <span
        v-for="(tag, i) in item.tags"
        :key="tag"
        class="rc-tag"
        :class="{ hot: i === 0, new: i === 1 }"
      >{{ tag }}</span>
    </div>

    <!-- 底部：下载次数 + 查看详情 -->
    <div class="rc-foot">
      <span class="rc-downloads" title="下载次数">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ downloadCount }} 次下载
      </span>
      <span class="rc-action">查看详情 →</span>
    </div>
  </div>
</template>
