<script setup lang="ts">
/**
 * ResourceDetail.vue - 资源详情页
 *
 * 展示资源全部信息（图标、名称、目录面包屑、描述、下载/点赞次数），
 * "去下载"按钮新窗口打开资源链接并记录一次下载。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchResourceDetail,
  getAnonId,
  isLikedLocal,
  likeResource,
  markLikedLocal,
  recordDownload,
} from '../api'
import type { ResourceItemDetail } from '../types'

const props = defineProps<{
  id: string
}>()

const router = useRouter()

const detail = ref<ResourceItemDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const imageFailed = ref(false)

/** 本地已点赞（刷新后保持状态） */
const liked = ref(false)
const liking = ref(false)
const likeCount = ref(0)
const downloadCount = ref(0)

/** 已点击去下载（当前会话内避免重复计数） */
const downloaded = ref(false)

const showImage = computed(() => Boolean(detail.value?.image) && !imageFailed.value)

const breadcrumb = computed(() => {
  const d = detail.value
  if (!d) return []
  const parts: string[] = []
  if (d.rootCategoryName) parts.push(d.rootCategoryName)
  if (d.categoryName) parts.push(d.categoryName)
  return parts
})

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

/** 去下载：新窗口打开 + 记录下载次数 */
function handleDownload() {
  const d = detail.value
  if (!d) return
  if (!downloaded.value) {
    downloaded.value = true
    downloadCount.value += 1
    void recordDownload(d.id)
  }
  window.open(normalizeUrl(d.url), '_blank', 'noopener,noreferrer')
}

/** 点赞 */
async function handleLike() {
  const d = detail.value
  if (!d || liked.value || liking.value) return
  liking.value = true
  try {
    const anonId = getAnonId()
    const result = await likeResource(d.id, anonId)
    liked.value = true
    markLikedLocal(d.id)
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

function goBack() {
  // 优先返回上一页（列表页），无历史则回首页
  if (window.history.length > 1) {
    router.back()
  } else {
    void router.push('/')
  }
}

onMounted(async () => {
  try {
    const id = Number(props.id)
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('资源不存在或已下线')
    }
    detail.value = await fetchResourceDetail(id)
    liked.value = isLikedLocal(id)
    likeCount.value = detail.value.likeCount ?? 0
    downloadCount.value = detail.value.downloadCount ?? 0
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '加载失败，请刷新重试'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="detail-page">
    <!-- 加载中 -->
    <div v-if="loading" class="content-loading">
      <div class="spinner" />
      <span>资源加载中...</span>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="errorMessage" class="content-loading">
      <span class="content-error">{{ errorMessage }}</span>
      <button class="btn-primary" type="button" @click="goBack">返回列表</button>
    </div>

    <!-- 详情 -->
    <article v-else-if="detail" class="detail-card">
      <!-- 面包屑 + 返回 -->
      <div class="detail-topbar">
        <button class="back-btn" type="button" @click="goBack">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回列表
        </button>
        <nav v-if="breadcrumb.length" class="breadcrumb">
          <template v-for="(item, i) in breadcrumb" :key="i">
            <span v-if="i > 0">/</span>
            <span>{{ item }}</span>
          </template>
        </nav>
      </div>

      <!-- 头部：图标 + 名称 + 统计 -->
      <header class="detail-head">
        <span class="detail-icon">
          <img v-if="showImage" :src="detail.image!" :alt="detail.name" @error="imageFailed = true" />
          <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </span>

        <div class="detail-head-info">
          <h1 class="detail-title">{{ detail.name }}</h1>
          <div class="detail-stats">
            <span class="stat" title="下载次数">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {{ downloadCount }} 次下载
            </span>
            <span class="stat like-stat" :class="{ liked }" title="点赞次数">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              {{ likeCount }} 人点赞
            </span>
          </div>
        </div>
      </header>

      <!-- 描述 -->
      <section v-if="detail.description" class="detail-section">
        <h2 class="detail-section-title">资源描述</h2>
        <p class="detail-desc">{{ detail.description }}</p>
      </section>

      <!-- 链接信息 -->
      <section class="detail-section">
        <h2 class="detail-section-title">资源链接</h2>
        <p class="detail-url">{{ detail.url }}</p>
      </section>

      <!-- 操作区 -->
      <footer class="detail-actions">
        <button
          class="like-btn"
          :class="{ liked }"
          type="button"
          :disabled="liked || liking"
          @click="handleLike"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          {{ liked ? '已点赞' : '点赞' }}
        </button>
        <button class="btn-primary download-btn" type="button" @click="handleDownload">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          去下载
        </button>
      </footer>
    </article>
  </main>
</template>
