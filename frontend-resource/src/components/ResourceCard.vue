<script setup lang="ts">
/**
 * ResourceCard.vue - 资源卡片
 *
 * 布局：
 * - 图标（无图或加载失败回退默认文档图标）
 * - 名称 + 描述（单行省略，悬停 title 展示完整描述）
 * - 右上角：点赞按钮（大拇指 + 次数，点击点赞，同一匿名用户仅一次）
 * - 右下角：下载图标 + 下载次数
 * - 点击卡片进入详情页 /resource/:id（点赞按钮点击不冒泡）
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAnonId, isLikedLocal, likeResource, markLikedLocal } from '../api'
import type { ResourceItem } from '../types'

const props = defineProps<{
  item: ResourceItem
}>()

const router = useRouter()

/** 图片加载失败标记：回退默认图标 */
const imageFailed = ref(false)

/** 本地已点赞标记（localStorage 同步，避免刷新后提示重复点赞） */
const liked = ref(isLikedLocal(props.item.id))
const liking = ref(false)
/** 展示用点赞次数（点赞成功后本地 +1，无需重新拉树） */
const likeCount = ref(props.item.likeCount ?? 0)
/** 展示用下载次数（详情页跳转后重新进入列表会刷新） */
const downloadCount = ref(props.item.downloadCount ?? 0)

const showImage = computed(() => Boolean(props.item.image) && !imageFailed.value)

/** 卡片主标题：名称 + 换行 + 描述（悬停完整展示） */
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

/** 点赞（阻止冒泡，不进入详情） */
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
  <div class="resource-card" role="button" tabindex="0" :title="cardTitle" @click="openDetail" @keyup.enter="openDetail">
    <!-- 图标 -->
    <span class="resource-icon">
      <img
        v-if="showImage"
        :src="item.image!"
        :alt="item.name"
        loading="lazy"
        @error="onImageError"
      />
      <svg
        v-else
        width="22"
        height="22"
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
    </span>

    <!-- 名称 + 描述（单行省略） -->
    <span class="resource-body">
      <span class="resource-name">{{ item.name }}</span>
      <span v-if="item.description" class="resource-desc">{{ item.description }}</span>
    </span>

    <!-- 右上角点赞 -->
    <button
      class="card-like"
      :class="{ liked }"
      type="button"
      :aria-label="liked ? '已点赞' : '点赞'"
      :disabled="liked || liking"
      @click="handleLike"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
      <span>{{ likeCount }}</span>
    </button>

    <!-- 右下角下载次数 -->
    <span class="card-download" title="下载次数">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{{ downloadCount }}</span>
    </span>
  </div>
</template>
