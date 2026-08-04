<script setup lang="ts">
/**
 * pages/mobile/feedback.vue - 移动端意见反馈页
 *
 * 内容：
 * - 页面标题区
 * - 提交留言表单（昵称、联系方式、留言内容）
 * - 公开留言列表（含站长回复）
 * - 分页
 *
 * API：
 * - GET /api/v1/feedback?page=N&size=10 - Spring Page 对象
 * - POST /api/v1/feedback - 提交留言
 */

definePageMeta({
  layout: 'mobile',
})

useHead({
  titleTemplate: null,
  title: '意见反馈 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content:
        '盘子工具站意见反馈页面，提交你的建议或问题，公开留言板会展示留言与站长回复，欢迎反馈使用体验与功能建议。',
    },
    {
      name: 'keywords',
      content: '盘子工具站,意见反馈,留言板,问题反馈,功能建议',
    },
  ],
})

// ============ 类型定义 ============
interface FeedbackItem {
  id: number | string
  nickname?: string | null
  contact?: string | null
  content: string
  createdAt: string
  adminReply: string | null
  replyAt: string | null
}

interface FeedbackPage {
  content: FeedbackItem[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

// ============ 状态 ============
const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

const currentPage = ref(0)
const pageSize = 10

// 表单状态
const nickname = ref('')
const contact = ref('')
const message = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

// ============ SSR 获取留言列表 ============
const { data: pageData, refresh: refreshList } = await useAsyncData<FeedbackPage>(
  'mobile-feedback-list',
  async () => {
    try {
      const res = await $fetch<ApiResponse<FeedbackPage>>('/api/v1/feedback', {
        baseURL,
        params: { page: currentPage.value, size: pageSize },
      })
      if (res.code === 0) {
        return res.data
      }
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: pageSize,
      }
    } catch {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: pageSize,
      }
    }
  },
  {
    default: () => ({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: pageSize,
    }),
    watch: [currentPage],
  },
)

// ============ 工具函数 ============
function getAvatarText(nickname?: string | null): string {
  if (!nickname || !nickname.trim()) return '匿'
  return nickname.trim().charAt(0).toUpperCase()
}

function getDisplayName(nickname?: string | null): string {
  if (!nickname || !nickname.trim()) return '匿名用户'
  return nickname.trim()
}

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    if (Number.isNaN(date.getTime())) return timeStr
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  } catch {
    return timeStr
  }
}

function goToPage(page: number) {
  const total = pageData.value?.totalPages ?? 0
  if (page < 0 || page >= total) return
  currentPage.value = page
  if (import.meta.client) {
    const el = document.getElementById('m-feedback-list')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

const pageNumbers = computed<(number | string)[]>(() => {
  const total = pageData.value?.totalPages ?? 0
  const current = (pageData.value?.number ?? 0) + 1
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | string)[] = [1]
  if (current > 4) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  if (current < total - 3) pages.push('...')
  pages.push(total)
  return pages
})

// ============ 表单提交 ============
async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  const content = message.value.trim()
  if (content.length < 5) {
    errorMessage.value = '留言内容至少需要 5 个字符。'
    return
  }

  submitting.value = true
  try {
    const body: Record<string, unknown> = { content }
    const trimmedNickname = nickname.value.trim()
    const trimmedContact = contact.value.trim()
    if (trimmedNickname) body.nickname = trimmedNickname
    if (trimmedContact) body.contact = trimmedContact

    const res = await $fetch<ApiResponse<unknown>>('/api/v1/feedback', {
      baseURL,
      method: 'POST',
      body,
    })

    if (res.code === 0) {
      successMessage.value = '提交成功，刷新后即可看到新留言。'
      message.value = ''
      nickname.value = ''
      contact.value = ''
      if (currentPage.value !== 0) {
        currentPage.value = 0
      } else {
        await refreshList()
      }
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      errorMessage.value = res.message || '提交失败，请稍后再试。'
    }
  } catch (err) {
    const msg =
      (err as { data?: { message?: string }; message?: string })?.data?.message ||
      (err as { message?: string })?.message ||
      '网络错误，请稍后再试。'
    errorMessage.value = msg
  } finally {
    submitting.value = false
  }
}

function onMessageInput() {
  if (errorMessage.value && message.value.trim().length >= 5) {
    errorMessage.value = ''
  }
}
</script>

<template>
  <div class="m-feedback">
    <!-- 页面标题区 -->
    <section class="m-feedback__header">
      <h1 class="m-feedback__title">意见反馈</h1>
      <p class="m-feedback__desc">
        提交你的建议或问题，公开留言板会展示留言与站长回复。
      </p>
    </section>

    <!-- 提交留言表单 -->
    <section class="m-feedback__card">
      <h2 class="m-feedback__card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        提交留言
      </h2>

      <form class="m-feedback__form" novalidate @submit.prevent="handleSubmit">
        <!-- 昵称 -->
        <div class="m-feedback__field">
          <label for="m-nickname" class="m-feedback__label">
            昵称
            <span class="m-feedback__optional">（可选）</span>
          </label>
          <input
            id="m-nickname"
            v-model="nickname"
            type="text"
            placeholder="怎么称呼你"
            class="m-feedback__input"
            maxlength="30"
            autocomplete="nickname"
          >
        </div>

        <!-- 联系方式 -->
        <div class="m-feedback__field">
          <label for="m-contact" class="m-feedback__label">
            联系方式
            <span class="m-feedback__optional">（可选）</span>
          </label>
          <input
            id="m-contact"
            v-model="contact"
            type="text"
            placeholder="邮箱或手机号"
            class="m-feedback__input"
            maxlength="100"
            autocomplete="email"
          >
        </div>

        <!-- 留言内容 -->
        <div class="m-feedback__field">
          <label for="m-message" class="m-feedback__label">
            留言内容
            <span class="m-feedback__required">*</span>
          </label>
          <textarea
            id="m-message"
            v-model="message"
            rows="5"
            minlength="5"
            required
            placeholder="请输入至少 5 个字符..."
            class="m-feedback__textarea"
            :class="{ 'm-feedback__textarea--error': errorMessage }"
            @input="onMessageInput"
          />
          <p v-if="errorMessage" class="m-feedback__error">
            {{ errorMessage }}
          </p>
          <p class="m-feedback__hint">公开显示，请勿填写密码等敏感信息。</p>
        </div>

        <!-- 提交按钮 -->
        <button
          type="submit"
          class="m-feedback__submit"
          :disabled="submitting"
        >
          <svg
            v-if="!submitting"
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
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          <svg
            v-else
            class="m-feedback__spin"
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
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>{{ submitting ? '提交中...' : '提交留言' }}</span>
        </button>
      </form>

      <!-- 成功提示 -->
      <div v-if="successMessage" class="m-feedback__success">
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </section>

    <!-- 公开留言列表 -->
    <section id="m-feedback-list" class="m-feedback__card">
      <h2 class="m-feedback__card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        公开留言
      </h2>

      <!-- 留言列表 -->
      <div v-if="pageData?.content?.length" class="m-feedback__list">
        <article
          v-for="(item, idx) in pageData.content"
          :key="item.id ?? idx"
          class="m-feedback__item"
          :class="{ 'm-feedback__item--last': idx === pageData.content.length - 1 }"
        >
          <!-- 头部：头像 + 昵称 + 时间 -->
          <div class="m-feedback__item-header">
            <div class="m-feedback__user">
              <span class="m-feedback__avatar">{{ getAvatarText(item.nickname) }}</span>
              <span class="m-feedback__name">{{ getDisplayName(item.nickname) }}</span>
            </div>
            <time class="m-feedback__time">{{ formatTime(item.createdAt) }}</time>
          </div>

          <!-- 留言内容 -->
          <p class="m-feedback__content">{{ item.content }}</p>

          <!-- 站长回复 -->
          <div v-if="item.adminReply" class="m-feedback__reply">
            <div class="m-feedback__reply-header">
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span class="m-feedback__reply-label">站长回复</span>
              <time class="m-feedback__reply-time">{{ formatTime(item.replyAt) }}</time>
            </div>
            <p class="m-feedback__reply-content">{{ item.adminReply }}</p>
          </div>
        </article>
      </div>

      <!-- 空状态 -->
      <div v-else class="m-feedback__empty">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p>暂无留言，快来抢沙发吧</p>
      </div>

      <!-- 分页 -->
      <div
        v-if="pageData && pageData.totalPages > 1"
        class="m-feedback__pagination"
      >
        <span class="m-feedback__total">
          共 {{ pageData.totalElements }} 条留言
        </span>
        <div class="m-feedback__pages">
          <button
            type="button"
            class="m-feedback__page-btn"
            :disabled="(pageData.number ?? 0) === 0"
            @click="goToPage((pageData.number ?? 0) - 1)"
          >
            上一页
          </button>

          <template v-for="(p, idx) in pageNumbers" :key="idx">
            <span v-if="p === '...'" class="m-feedback__ellipsis">...</span>
            <button
              v-else
              type="button"
              class="m-feedback__page-num"
              :class="{ 'm-feedback__page-num--active': (p as number) - 1 === (pageData.number ?? 0) }"
              @click="goToPage((p as number) - 1)"
            >
              {{ p }}
            </button>
          </template>

          <button
            type="button"
            class="m-feedback__page-btn"
            :disabled="(pageData.number ?? 0) >= (pageData.totalPages - 1)"
            @click="goToPage((pageData.number ?? 0) + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.m-feedback {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #ede9fe;
  --m-color-primary-lighter: #ddd6fe;
  --m-color-primary-lightest: #f5f3ff;
  --m-color-surface: #ffffff;
  --m-color-bg: #f9fafb;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-success: #10b981;
  --m-color-success-bg: #ecfdf5;
  --m-color-error: #ef4444;
  --m-color-error-bg: #fef2f2;

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

/* 头部标题 */
.m-feedback__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.m-feedback__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.m-feedback__desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* 卡片 */
.m-feedback__card {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
  padding: 16px;
}

.m-feedback__card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--m-color-text-primary);
  margin: 0 0 12px;
  line-height: 1.2;
}

.m-feedback__card-title svg {
  color: var(--m-color-primary);
  flex-shrink: 0;
}

/* 表单 */
.m-feedback__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.m-feedback__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-feedback__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
}

.m-feedback__optional {
  color: var(--m-color-text-tertiary);
  font-weight: 400;
}

.m-feedback__required {
  color: var(--m-color-error);
}

.m-feedback__input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  -webkit-appearance: none;
}

.m-feedback__input:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-feedback__input::placeholder {
  color: var(--m-color-text-tertiary);
}

.m-feedback__textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  -webkit-appearance: none;
}

.m-feedback__textarea:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-feedback__textarea::placeholder {
  color: var(--m-color-text-tertiary);
}

.m-feedback__textarea--error {
  border-color: var(--m-color-error);
}

.m-feedback__error {
  font-size: 12px;
  color: var(--m-color-error);
  margin: 0;
  line-height: 1.4;
}

.m-feedback__hint {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  margin: 0;
  line-height: 1.4;
}

/* 提交按钮 */
.m-feedback__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--m-color-primary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-feedback__submit:active {
  transform: scale(0.98);
}

.m-feedback__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.m-feedback__spin {
  animation: m-feedback-spin 0.8s linear infinite;
}

@keyframes m-feedback-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 成功提示 */
.m-feedback__success {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--m-color-success-bg);
  border-radius: 10px;
  font-size: 13px;
  color: var(--m-color-success);
}

.m-feedback__success svg {
  flex-shrink: 0;
}

/* 留言列表 */
.m-feedback__list {
  display: flex;
  flex-direction: column;
}

.m-feedback__item {
  padding: 14px 0;
  border-bottom: 1px solid var(--m-color-border-light);
}

.m-feedback__item:first-child {
  padding-top: 0;
}

.m-feedback__item--last {
  border-bottom: none;
  padding-bottom: 0;
}

.m-feedback__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.m-feedback__user {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.m-feedback__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--m-color-border-light);
  color: var(--m-color-text-primary);
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.m-feedback__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-feedback__time {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

.m-feedback__content {
  font-size: 14px;
  color: var(--m-color-text-primary);
  line-height: 1.6;
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* 站长回复 */
.m-feedback__reply {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--m-color-primary-lightest);
  border-left: 3px solid var(--m-color-primary);
  border-radius: 8px;
}

.m-feedback__reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.m-feedback__reply-header svg {
  color: var(--m-color-primary);
  flex-shrink: 0;
}

.m-feedback__reply-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--m-color-primary);
}

.m-feedback__reply-time {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
}

.m-feedback__reply-content {
  font-size: 13px;
  color: var(--m-color-text-primary);
  line-height: 1.6;
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* 空状态 */
.m-feedback__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
}

.m-feedback__empty svg {
  color: var(--m-color-text-tertiary);
}

.m-feedback__empty p {
  font-size: 13px;
  color: var(--m-color-text-tertiary);
  margin: 0;
}

/* 分页 */
.m-feedback__pagination {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--m-color-border);
  align-items: center;
}

.m-feedback__total {
  font-size: 13px;
  color: var(--m-color-text-secondary);
}

.m-feedback__pages {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.m-feedback__page-btn {
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--m-color-text-secondary);
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-feedback__page-btn:active:not(:disabled) {
  background: var(--m-color-border-light);
}

.m-feedback__page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.m-feedback__page-num {
  min-width: 36px;
  height: 36px;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--m-color-text-secondary);
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-feedback__page-num--active {
  color: #fff;
  background: var(--m-color-primary);
  border-color: var(--m-color-primary);
}

.m-feedback__ellipsis {
  font-size: 13px;
  color: var(--m-color-text-tertiary);
  padding: 0 4px;
}
</style>
