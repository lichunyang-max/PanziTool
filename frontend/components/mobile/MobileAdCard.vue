<script setup lang="ts">
/**
 * MobileAdCard.vue - 移动端广告卡片组件
 *
 * 设计规范：
 * - 移动端卡片样式（12px 圆角，padding 14px）
 * - 显示广告标题、描述
 * - 可点击跳转广告链接
 * - 支持关闭功能（点击后 sessionStorage 记录关闭状态）
 * - 关闭按钮使用 x 图标
 *
 * 设计 Token：
 *   主色 #7c3aed，背景渐变 #f0e6ff -> #e8dff5，边框 #ede9fe
 */

interface Props {
  /** 广告标题 */
  title: string
  /** 广告描述 */
  description?: string
  /** 广告图片地址 */
  imageUrl?: string
  /** 广告跳转链接 */
  linkUrl: string
  /** 广告唯一 ID（用于 sessionStorage 关闭记录） */
  adId?: string
}

const props = defineProps<Props>()

const isHidden = ref(false)

/** 关闭状态存储 key */
const closeKey = computed(() => {
  return `mobile_ad_hidden_${props.adId || props.title}`
})

/** 组件挂载时检查 sessionStorage 中的关闭状态 */
onMounted(() => {
  if (typeof window !== 'undefined') {
    const hidden = sessionStorage.getItem(closeKey.value)
    isHidden.value = hidden === 'true'
  }
})

/** 关闭广告 */
function handleClose() {
  isHidden.value = true
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(closeKey.value, 'true')
  }
}
</script>

<template>
  <div v-if="!isHidden" class="mobile-ad-card">
    <!-- 广告链接区域 -->
    <a
      :href="linkUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mobile-ad-card__link"
      :aria-label="`广告：${title}`"
    >
      <!-- 广告图片 -->
      <div v-if="imageUrl" class="mobile-ad-card__image">
        <img :src="imageUrl" :alt="title" />
      </div>

      <!-- 广告文字内容 -->
      <div class="mobile-ad-card__content">
        <span class="mobile-ad-card__tag">广告</span>
        <h3 class="mobile-ad-card__title">{{ title }}</h3>
        <p v-if="description" class="mobile-ad-card__desc">{{ description }}</p>
      </div>

      <!-- 了解详情 -->
      <span class="mobile-ad-card__action">了解详情</span>
    </a>

    <!-- 关闭按钮 -->
    <button
      type="button"
      class="mobile-ad-card__close"
      aria-label="关闭广告"
      @click="handleClose"
    >
      <svg
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
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.mobile-ad-card {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #a78bfa;
  --m-color-primary-lighter: #ede9fe;
  --m-color-border: #e5e7eb;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;

  position: relative;
  background: linear-gradient(135deg, #f0e6ff, #e8dff5);
  border-radius: 12px;
  padding: 14px;
  overflow: hidden;
}

.mobile-ad-card__link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  min-height: 44px;
  -webkit-tap-highlight-color: transparent;
}

.mobile-ad-card__image {
  width: 72px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background-color: #f3f4f6;
}

.mobile-ad-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mobile-ad-card__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-ad-card__tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  font-size: 10px;
  font-weight: 500;
  color: var(--m-color-primary);
  background-color: var(--m-color-primary-lighter);
  padding: 1px 6px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.mobile-ad-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.mobile-ad-card__desc {
  font-size: 12px;
  color: var(--m-color-text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-ad-card__action {
  font-size: 12px;
  font-weight: 500;
  color: var(--m-color-primary);
  flex-shrink: 0;
  min-width: 60px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 4px;
}

/* 关闭按钮 */
.mobile-ad-card__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--m-color-text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s ease, background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-ad-card__close:active {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--m-color-text-secondary);
}
</style>
