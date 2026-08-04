<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useHead({
  titleTemplate: null,
  title: '留言详情 | 盘子工具站',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

interface FeedbackDetail {
  id: number | string
  nickname?: string | null
  contact?: string | null
  content: string
  ip?: string | null
  status: 'visible' | 'hidden' | 'deleted'
  createdAt: string
  updatedAt: string
  adminReply: string | null
  replyAt: string | null
  replyBy: string | null
}

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

const route = useRoute()
const replyContent = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const saveReplyLoading = ref(false)
const statusLoading = ref(false)
const clearReplyLoading = ref(false)

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

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

function getStatusBadge(item?: FeedbackDetail | null) {
  if (!item) return { text: '未知', class: 'bg-muted text-muted-foreground' }
  if (item.status === 'hidden') {
    return { text: '已隐藏', class: 'bg-muted text-muted-foreground' }
  }
  if (item.status === 'deleted') {
    return { text: '已删除', class: 'bg-muted text-muted-foreground' }
  }
  if (item.adminReply) {
    return { text: '已回复', class: 'bg-success/10 text-success' }
  }
  return { text: '待回复', class: 'bg-warning/10 text-warning' }
}

const { data: detail, refresh, pending } = await useAsyncData<FeedbackDetail>(
  `admin-feedback-detail-${route.params.id}`,
  async () => {
    // SSR 环境下手动转发 Cookie，使后端认证拦截器能识别登录状态
    const headers: Record<string, string> = {}
    if (import.meta.server) {
      const event = useRequestEvent()
      const cookie = event?.node?.req?.headers?.cookie
      if (cookie) {
        headers.cookie = cookie
      }
    }

    try {
      const res = await $fetch<ApiResponse<FeedbackDetail>>(`/api/v1/admin/feedback/${route.params.id}`, {
        baseURL,
        method: 'GET',
        credentials: 'include',
        headers,
      })
      if (res.code !== 0) throw new Error(res.message || '获取详情失败')
      return res.data
    } catch (err) {
      const error = err as { statusCode?: number; data?: { message?: string }; message?: string }
      if (error?.statusCode === 401) {
        if (import.meta.server) {
          // SSR 环境下抛出错误，让 Nuxt 正确处理重定向
          throw new Error('UNAUTHORIZED')
        }
        if (import.meta.client) {
          localStorage.removeItem('admin_logged_in')
          await navigateTo('/admin/login')
        }
      }
      return null as unknown as FeedbackDetail
    }
  },
  {
    default: () => null as unknown as FeedbackDetail,
  },
)

watch(detail, (d) => {
  if (d?.adminReply) replyContent.value = d.adminReply
  else replyContent.value = ''
}, { immediate: true })

async function handleStatusChange(newStatus: string) {
  if (statusLoading.value) return
  statusLoading.value = true
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/v1/admin/feedback/${route.params.id}/status`, {
      baseURL,
      method: 'PUT',
      credentials: 'include',
      body: { status: newStatus },
    })
    if (res.code === 0) {
      if (newStatus === 'visible') showToast('已恢复留言', 'success')
      else if (newStatus === 'hidden') showToast('已隐藏留言', 'success')
      else if (newStatus === 'deleted') showToast('已删除留言', 'success')
      await refresh()
    } else {
      showToast(res.message || '操作失败', 'error')
    }
  } catch (err) {
    const error = err as { statusCode?: number; data?: { message?: string }; message?: string }
    if (error?.statusCode === 401) {
      if (import.meta.client) localStorage.removeItem('admin_logged_in')
      await navigateTo('/admin/login')
    } else {
      showToast(error?.data?.message || error?.message || '操作失败', 'error')
    }
  } finally {
    statusLoading.value = false
  }
}

async function handleSaveReply() {
  if (!replyContent.value || !replyContent.value.trim()) {
    showToast('请输入回复内容', 'error')
    return
  }
  if (saveReplyLoading.value) return
  saveReplyLoading.value = true
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/v1/admin/feedback/${route.params.id}/reply`, {
      baseURL,
      method: 'PUT',
      credentials: 'include',
      body: { reply: replyContent.value.trim() },
    })
    if (res.code === 0) {
      showToast('回复已保存', 'success')
      await refresh()
    } else {
      showToast(res.message || '保存失败', 'error')
    }
  } catch (err) {
    const error = err as { statusCode?: number; data?: { message?: string }; message?: string }
    if (error?.statusCode === 401) {
      if (import.meta.client) localStorage.removeItem('admin_logged_in')
      await navigateTo('/admin/login')
    } else {
      showToast(error?.data?.message || error?.message || '保存失败', 'error')
    }
  } finally {
    saveReplyLoading.value = false
  }
}

async function handleClearReply() {
  if (clearReplyLoading.value) return
  if (import.meta.client) {
    const confirmed = window.confirm('确定要删除这条回复吗？')
    if (!confirmed) return
  }
  clearReplyLoading.value = true
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/v1/admin/feedback/${route.params.id}/reply`, {
      baseURL,
      method: 'PUT',
      credentials: 'include',
      body: { reply: '' },
    })
    if (res.code === 0) {
      showToast('回复已删除', 'success')
      await refresh()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  } catch (err) {
    const error = err as { statusCode?: number; data?: { message?: string }; message?: string }
    if (error?.statusCode === 401) {
      if (import.meta.client) localStorage.removeItem('admin_logged_in')
      await navigateTo('/admin/login')
    } else {
      showToast(error?.data?.message || error?.message || '删除失败', 'error')
    }
  } finally {
    clearReplyLoading.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <a
      href="#"
      class="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground mb-4"
      @click.prevent="navigateTo('/admin/feedback')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      返回留言列表
    </a>

    <h1 class="text-2xl font-bold text-foreground mb-6">留言详情</h1>

    <div v-if="toastMessage" class="mb-4">
      <div
        class="flex items-center gap-2 p-3 rounded-lg text-sm"
        :class="toastType === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
      >
        <svg v-if="toastType === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </div>

    <div v-if="pending" class="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
      <div class="inline-flex items-center gap-2">
        <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span>加载中...</span>
      </div>
    </div>

    <template v-else-if="detail">
      <section class="bg-card border border-border rounded-lg p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="getStatusBadge(detail).class">
            {{ getStatusBadge(detail).text }}
          </span>
          <span class="text-sm text-muted-foreground">{{ formatTime(detail.createdAt) }}</span>
        </div>
        <div class="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-sm text-muted-foreground mb-1">留言者</p>
            <p class="font-medium text-foreground">{{ detail.nickname || '匿名用户' }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground mb-1">联系方式</p>
            <p class="text-foreground">{{ detail.contact || '-' }}</p>
          </div>
          <div v-if="detail.ip">
            <p class="text-sm text-muted-foreground mb-1">提交 IP</p>
            <p class="text-foreground">{{ detail.ip }}</p>
          </div>
        </div>
        <div>
          <p class="text-sm text-muted-foreground mb-2">留言内容</p>
          <p class="whitespace-pre-wrap text-foreground" style="line-height: 1.7">{{ detail.content }}</p>
        </div>
      </section>

      <section class="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-error/10 hover:text-error disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="statusLoading"
          @click="handleStatusChange(detail.status === 'hidden' ? 'visible' : 'hidden')"
        >
          <svg v-if="statusLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <template v-else-if="detail.status === 'hidden'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            恢复留言
          </template>
          <template v-else>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            隐藏留言
          </template>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-error px-4 py-2 text-sm font-medium text-error transition hover:bg-error/10 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="statusLoading"
          @click="handleStatusChange('deleted')"
        >
          <svg v-if="statusLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <template v-else>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            删除
          </template>
        </button>
      </section>

      <section class="bg-card border border-border rounded-lg p-6 mt-6">
        <h3 class="text-lg font-semibold text-foreground mb-4">站长回复</h3>
        <label for="reply-content" class="sr-only">回复内容</label>
        <textarea
          id="reply-content"
          v-model="replyContent"
          rows="5"
          placeholder="输入回复内容..."
          class="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="saveReplyLoading"
            @click="handleSaveReply"
          >
            <svg v-if="saveReplyLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <template v-else>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </template>
            {{ saveReplyLoading ? '保存中...' : '保存回复' }}
          </button>
        </div>
      </section>

      <section v-if="detail.adminReply" class="bg-card border border-border rounded-lg p-6 mt-6">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold text-foreground">历史回复</h3>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-error transition hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="clearReplyLoading"
            @click="handleClearReply"
          >
            <svg v-if="clearReplyLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <template v-else>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              删除回复
            </template>
          </button>
        </div>
        <p class="whitespace-pre-wrap text-foreground" style="line-height: 1.7">{{ detail.adminReply }}</p>
        <p class="mt-3 text-sm text-muted-foreground">
          回复于 {{ formatTime(detail.replyAt) }}<template v-if="detail.replyBy"> · by {{ detail.replyBy }}</template>
        </p>
      </section>
    </template>

    <div v-else class="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
      <svg class="mx-auto mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>留言不存在或加载失败</p>
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-1.5 text-primary hover:underline"
        @click="navigateTo('/admin/feedback')"
      >
        返回列表
      </button>
    </div>
  </div>
</template>
