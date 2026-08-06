<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useHead({
  titleTemplate: null,
  title: '留言管理 | 盘子工具站',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

interface FeedbackItem {
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

type FilterStatus = 'all' | 'replied' | 'pending' | 'hidden'

const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

const route = useRoute()
const page = ref(Number(route.query.page) || 0)
const keyword = ref('')
const filterStatus = ref<FilterStatus>('all')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const toggleLoading = ref<number | string | null>(null)
const deleteLoading = ref<number | string | null>(null)
const pendingDeleteId = ref<number | string | null>(null)

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

function getStatusBadge(item: FeedbackItem) {
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

const cacheKey = computed(() => `admin-feedback-${page.value}-${keyword.value}-${filterStatus.value}`)

const { data: pageData, refresh, pending } = await useAsyncData<FeedbackPage>(
  cacheKey,
  async () => {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('size', '10')
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterStatus.value === 'hidden') params.set('status', 'hidden')

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
      const res = await $fetch<ApiResponse<FeedbackPage>>(`/api/v1/admin/feedback?${params.toString()}`, {
        baseURL,
        method: 'GET',
        credentials: 'include',
        headers,
      })
      if (res.code !== 0) throw new Error(res.message || '获取失败')
      let content = res.data.content || []
      if (filterStatus.value === 'replied') {
        content = content.filter((item) => !!item.adminReply)
      } else if (filterStatus.value === 'pending') {
        content = content.filter((item) => !item.adminReply && item.status === 'visible')
      }
      return {
        ...res.data,
        content,
      }
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
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 10,
      }
    }
  },
  {
    default: () => ({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10,
    }),
  },
)

watch([page, keyword, filterStatus], () => {
  refresh()
})

function handleRefresh() {
  page.value = 0
  refresh()
}

async function handleToggleStatus(item: FeedbackItem) {
  if (toggleLoading.value !== null) return
  toggleLoading.value = item.id

  try {
    const newStatus = item.status === 'hidden' ? 'visible' : 'hidden'
    const actualNew = item.status === 'deleted' ? 'visible' : newStatus
    const res = await $fetch<ApiResponse<unknown>>(`/api/v1/admin/feedback/${item.id}/status`, {
      baseURL,
      method: 'PUT',
      credentials: 'include',
      body: { status: actualNew },
    })
    if (res.code === 0) {
      showToast(actualNew === 'visible' ? '已恢复留言' : '已隐藏留言', 'success')
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
    toggleLoading.value = null
  }
}

async function handleDelete(item: FeedbackItem) {
  if (deleteLoading.value !== null) return
  pendingDeleteId.value = item.id
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  if (id === null) return
  deleteLoading.value = id
  pendingDeleteId.value = null
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/v1/admin/feedback/${id}`, {
      baseURL,
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.code === 0) {
      showToast('删除成功', 'success')
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
    deleteLoading.value = null
  }
}

function cancelDelete() {
  pendingDeleteId.value = null
}

function goToPage(p: number) {
  const total = pageData.value?.totalPages ?? 0
  if (p < 0 || p >= total) return
  page.value = p
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
</script>

<template>
  <div class="p-6">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-foreground">留言管理</h2>
        <p class="text-muted-foreground mt-1">查看、回复和管理用户公开留言</p>
      </div>

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

      <div class="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索留言内容或昵称..."
            class="pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-72"
            @keyup.enter="handleRefresh"
          />
        </div>
        <div class="flex items-center gap-3">
          <select
            v-model="filterStatus"
            class="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">全部</option>
            <option value="replied">已回复</option>
            <option value="pending">待回复</option>
            <option value="hidden">已隐藏</option>
          </select>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            @click="handleRefresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            刷新
          </button>
        </div>
      </div>

      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted border-b border-border">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-muted-foreground">留言内容</th>
                <th class="px-4 py-3 text-left font-medium text-muted-foreground w-32">昵称</th>
                <th class="px-4 py-3 text-left font-medium text-muted-foreground w-40">时间</th>
                <th class="px-4 py-3 text-left font-medium text-muted-foreground w-28">状态</th>
                <th class="px-4 py-3 text-left font-medium text-muted-foreground w-40">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-if="pending">
                <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
                  <div class="inline-flex items-center gap-2">
                    <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>加载中...</span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="!pageData?.content?.length" class="hover:bg-muted transition-colors">
                <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
                  <svg class="mx-auto mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--pz-color-text-tertiary)">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  暂无留言数据
                </td>
              </tr>
              <tr v-for="item in pageData?.content" :key="item.id" class="hover:bg-muted transition-colors">
                <td class="px-4 py-3 text-foreground max-w-md truncate" :title="item.content">{{ item.content }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ item.nickname || '匿名用户' }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatTime(item.createdAt) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" :class="getStatusBadge(item).class">
                    {{ getStatusBadge(item).text }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <NuxtLink
                      :to="`/admin/feedback/${item.id}`"
                      class="text-primary hover:underline"
                    >
                      查看
                    </NuxtLink>
                    <NuxtLink
                      :to="`/admin/feedback/${item.id}`"
                      class="text-primary hover:underline"
                    >
                      回复
                    </NuxtLink>
                    <a
                      v-if="toggleLoading === item.id"
                      href="#"
                      class="text-muted-foreground opacity-60 cursor-not-allowed"
                      @click.prevent
                    >
                      <svg class="animate-spin inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </a>
                    <a
                      v-else
                      href="#"
                      class="text-muted-foreground hover:text-foreground"
                      @click.prevent="handleToggleStatus(item)"
                    >
                      {{ item.status === 'hidden' ? '恢复' : '隐藏' }}
                    </a>
                    <a
                      v-if="deleteLoading === item.id"
                      href="#"
                      class="text-muted-foreground opacity-60 cursor-not-allowed"
                      @click.prevent
                    >
                      <svg class="animate-spin inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </a>
                    <a
                      v-else
                      href="#"
                      class="hover:underline"
                      style="color: var(--pz-state-error)"
                      @click.prevent="handleDelete(item)"
                    >
                      删除
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex items-center justify-between mt-6">
        <span class="text-sm text-muted-foreground">共 {{ pageData?.totalElements ?? 0 }} 条留言</span>
        <nav v-if="pageData && pageData.totalPages > 1" class="flex items-center gap-1">
          <button
            type="button"
            class="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-muted-foreground hover:bg-muted disabled:opacity-50"
            :disabled="(pageData.number ?? 0) === 0"
            @click="goToPage((pageData.number ?? 0) - 1)"
          >
            <svg class="inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <template v-for="(p, idx) in pageNumbers" :key="idx">
            <span
              v-if="p === '...'"
              class="px-2 text-muted-foreground"
            >
              ...
            </span>
            <button
              v-else
              type="button"
              class="px-3 py-1.5 text-sm border border-border rounded-md"
              :class="(p as number) - 1 === (pageData.number ?? 0) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground hover:bg-muted'"
              @click="goToPage((p as number) - 1)"
            >
              {{ p }}
            </button>
          </template>
          <button
            type="button"
            class="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground hover:bg-muted disabled:opacity-50"
            :disabled="(pageData.number ?? 0) >= (pageData.totalPages - 1)"
            @click="goToPage((pageData.number ?? 0) + 1)"
          >
            <svg class="inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </nav>
      </div>

      <!-- 删除确认弹窗 -->
      <div
        v-if="pendingDeleteId !== null"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background-color: rgba(0, 0, 0, 0.5)"
      >
        <div class="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4">
          <h3 class="text-lg font-semibold text-foreground mb-2">确认删除</h3>
          <p class="text-sm text-muted-foreground mb-6">删除后留言将无法恢复，确定要删除吗？</p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm border border-border rounded-md bg-card text-foreground hover:bg-muted"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-md"
              style="background-color: var(--pz-state-error); color: var(--pz-color-text-inverse); border: none"
              @click="confirmDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
  </div>
</template>
