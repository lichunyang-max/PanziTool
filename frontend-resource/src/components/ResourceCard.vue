<script setup lang="ts">
/**
 * ResourceCard.vue - 资源卡片
 *
 * 展示资源图标（无图或加载失败时回退默认文档图标）与名称，
 * 点击在新标签页打开资源链接。
 */
import { ref } from 'vue'
import type { ResourceItem } from '../types'

const props = defineProps<{
  item: ResourceItem
}>()

/** 图片加载失败标记：回退默认图标 */
const imageFailed = ref(false)

const showImage = (): boolean => Boolean(props.item.image) && !imageFailed.value

/**
 * 补全链接协议：后台配置可能填 "www.baidu.com" 这类无协议地址，
 * 直接放进 href 会被当作站内相对路径，需自动补 https://
 */
function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  return `https://${url}`
}

function onImageError() {
  imageFailed.value = true
}
</script>

<template>
  <a
    class="resource-card"
    :href="normalizeUrl(item.url)"
    target="_blank"
    rel="noopener noreferrer"
    :title="item.name"
  >
    <span class="resource-icon">
      <img
        v-if="showImage()"
        :src="item.image!"
        :alt="item.name"
        loading="lazy"
        @error="onImageError"
      />
      <!-- 默认图标（后端未配置图片或图片加载失败时展示） -->
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
    <span class="resource-name">{{ item.name }}</span>
  </a>
</template>
