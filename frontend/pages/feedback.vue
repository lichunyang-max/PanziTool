<script setup lang="ts">
/**
 * pages/feedback.vue - 意见反馈页
 *
 * 内容：
 * - 面包屑：首页 > 意见反馈
 * - 提交留言表单（昵称、联系方式、留言内容）
 * - 公开留言列表（含站长回复）
 * - 分页
 *
 * API：
 * - GET /api/v1/feedback?page=N&size=10 - Spring Page 对象
 * - POST /api/v1/feedback - 提交留言
 */

useHead({
  // 关闭全局标题模板，避免后缀重复拼接
  titleTemplate: null,
  // 页面主标题
  title: '意见反馈 | 盘子工具站',
  meta: [
    // 页面描述
    {
      name: 'description',
      content:
        '盘子工具站意见反馈专区，可在线提交工具优化建议、使用问题留言，公开留言实时展示站长回复，助力工具箱持续迭代优化。',
    },
    // 关键词
    {
      name: 'keywords',
      content: '意见反馈,在线留言,工具建议提交,站长留言反馈',
    },
    // 社交分享标题
    {
      property: 'og:title',
      content: '意见反馈 | 盘子工具站',
    },
    // 社交分享描述
    {
      property: 'og:description',
      content:
        '盘子工具站意见反馈专区，可在线提交工具优化建议、使用问题留言，公开留言实时展示站长回复，助力工具箱持续迭代优化。',
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
  'feedback-list',
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

/** 取昵称首字（无昵称返回"匿"） */
function getAvatarText(nickname?: string | null): string {
  if (!nickname || !nickname.trim()) return '匿'
  return nickname.trim().charAt(0).toUpperCase()
}

/** 显示昵称（无则显示"匿名用户"） */
function getDisplayName(nickname?: string | null): string {
  if (!nickname || !nickname.trim()) return '匿名用户'
  return nickname.trim()
}

/** 格式化时间为 YYYY-MM-DD HH:mm */
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

/** 跳转到指定页 */
function goToPage(page: number) {
  const total = pageData.value?.totalPages ?? 0
  if (page < 0 || page >= total) return
  currentPage.value = page
  // 滚动到留言列表顶部
  if (import.meta.client) {
    const el = document.getElementById('feedback-list')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

/** 生成分页按钮显示的页码数组（带省略号） */
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

  const trimmedContact = contact.value.trim()
  if (trimmedContact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact)) {
    errorMessage.value = '联系方式请输入正确的邮箱地址。'
    return
  }

  submitting.value = true
  try {
    const body: Record<string, unknown> = { content }
    const trimmedNickname = nickname.value.trim()
    if (trimmedNickname) body.nickname = trimmedNickname
    if (trimmedContact) body.contact = trimmedContact

    const res = await $fetch<ApiResponse<unknown>>('/api/v1/feedback', {
      baseURL,
      method: 'POST',
      body,
    })

    if (res.code === 0) {
      successMessage.value = '提交成功，刷新后即可看到新留言。'
      // 重置表单
      message.value = ''
      nickname.value = ''
      contact.value = ''
      // 回到第一页并刷新列表
      if (currentPage.value !== 0) {
        currentPage.value = 0
      } else {
        await refreshList()
      }
      // 3 秒后隐藏成功提示
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

/** 输入时清除错误提示 */
function onMessageInput() {
  if (errorMessage.value && message.value.trim().length >= 5) {
    errorMessage.value = ''
  }
}

/** 联系方式输入时清除错误提示 */
function onContactInput() {
  if (errorMessage.value && contact.value.trim()) {
    errorMessage.value = ''
  }
}
</script>

<template>
  <!-- ============ 面包屑 ============ -->
  <nav
    class="flex items-center gap-1.5 mb-6"
    aria-label="面包屑导航"
    style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm)"
  >
    <NuxtLink to="/" class="pz-footer-link" style="font-size: var(--pz-text-sm)">首页</NuxtLink>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0"
      style="color: var(--pz-color-text-tertiary)"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
    <span
      style="color: var(--pz-color-text-primary); font-weight: var(--pz-weight-semibold); white-space: nowrap"
    >
      意见反馈
    </span>
  </nav>

  <!-- ============ 页面标题 ============ -->
  <div class="mb-6">
    <h1
      style="font-family: var(--pz-font-display); font-size: var(--pz-text-3xl); font-weight: var(--pz-weight-bold); color: var(--pz-color-text-primary); line-height: var(--pz-leading-tight); letter-spacing: -0.02em; text-wrap: balance; word-break: keep-all"
    >
      意见反馈
    </h1>
    <p
      style="font-family: var(--pz-font-sans); font-size: var(--pz-text-base); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-relaxed); margin-top: 0.5rem"
    >
      各位小伙伴好，为了给大家带来更好的使用体验，我们始终在持续优化本站所有工具。若你在使用过程中有任何想法：不满意的地方、想要新增的工具、觉得繁琐的操作、合理的改进意见，都欢迎尽情提交。每一条建议我们都会认真查看记录<b style="color: red;">（站长一般当天回复）</b>，期待和大家一同共建实用优质的工具网站。
    </p>
  </div>

  <div class="flex flex-col gap-8">
    <!-- ============ 提交留言表单 ============ -->
    <section>
      <div class="pz-card p-5 sm:p-6">
        <h2
          class="flex items-center gap-2 mb-4"
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-lg); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); line-height: var(--pz-leading-tight)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-primary); flex-shrink: 0"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          提交留言
        </h2>

        <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
          <!-- 昵称 -->
          <div>
            <label
              for="nickname"
              class="block mb-1"
              style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); font-weight: var(--pz-weight-medium); color: var(--pz-color-text-primary)"
            >
              昵称
              <span style="color: var(--pz-color-text-tertiary); font-weight: var(--pz-weight-normal)">（可选）</span>
            </label>
            <input
              id="nickname"
              v-model="nickname"
              type="text"
              placeholder="怎么称呼你"
              class="pz-input w-full"
              maxlength="30"
              autocomplete="nickname"
            >
          </div>

          <!-- 联系方式 -->
          <div>
            <label
              for="contact"
              class="block mb-1"
              style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); font-weight: var(--pz-weight-medium); color: var(--pz-color-text-primary)"
            >
              联系方式
              <span style="color: var(--pz-color-text-tertiary); font-weight: var(--pz-weight-normal)">（可选）</span>
            </label>
            <input
              id="contact"
              v-model="contact"
              type="email"
              placeholder="请输入邮箱，如 example@mail.com"
              class="pz-input w-full"
              maxlength="100"
              autocomplete="email"
              :style="errorMessage ? { borderColor: 'var(--pz-state-error)' } : {}"
              @input="onContactInput"
            >
          </div>

          <!-- 留言内容 -->
          <div>
            <label
              for="message"
              class="block mb-1"
              style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); font-weight: var(--pz-weight-medium); color: var(--pz-color-text-primary)"
            >
              留言内容
              <span style="color: var(--pz-state-error)">*</span>
            </label>
            <textarea
              id="message"
              v-model="message"
              rows="5"
              minlength="5"
              required
              placeholder="请输入您的建议或者问题，若是涉及到现有工具的请加上工具名称，建议或问题尽量描述清晰，不然站长可能不理解哟，谢谢！"
              class="pz-textarea w-full"
              style="min-height: 120px; resize: vertical"
              :style="errorMessage ? { borderColor: 'var(--pz-state-error)' } : {}"
              @input="onMessageInput"
            />
            <p
              v-if="errorMessage"
              class="mt-1"
              style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-state-error)"
            >
              {{ errorMessage }}
            </p>
            <p
              class="mt-1"
              style="font-family: var(--pz-font-sans); font-size: var(--pz-text-xs); color: var(--pz-color-text-tertiary)"
            >
              公开显示，请勿填写密码等敏感信息。
            </p>
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            class="pz-btn-primary self-start"
            :disabled="submitting"
            style="min-height: 40px"
          >
            <svg
              v-if="!submitting"
              class="pz-btn-icon-slide"
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
              class="animate-spin"
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
            {{ submitting ? '提交中...' : '提交留言' }}
          </button>
        </form>

        <!-- 成功提示 -->
        <div
          v-if="successMessage"
          class="mt-4 flex items-center gap-2 p-3"
          style="background-color: var(--pz-state-success-bg); color: var(--pz-state-success); border-radius: var(--pz-radius-md); font-family: var(--pz-font-sans); font-size: var(--pz-text-sm)"
        >
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
      </div>
    </section>

    <!-- ============ 公开留言列表 ============ -->
    <section id="feedback-list">
      <div class="pz-card p-5 sm:p-6">
        <h2
          class="flex items-center gap-2 mb-4"
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-lg); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); line-height: var(--pz-leading-tight)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-primary); flex-shrink: 0"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          公开留言
        </h2>

        <!-- 留言列表 -->
        <div v-if="pageData?.content?.length" class="flex flex-col">
          <article
            v-for="(item, idx) in pageData.content"
            :key="item.id ?? idx"
            class="py-4"
            :style="idx !== pageData.content.length - 1 ? { borderBottom: '1px solid var(--pz-color-border)' } : {}"
          >
            <!-- 头部：头像 + 昵称 + 时间 -->
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="inline-flex items-center justify-center font-medium shrink-0"
                  style="width: 32px; height: 32px; border-radius: var(--pz-radius-full); background-color: var(--pz-color-bg-tertiary); color: var(--pz-color-text-primary); font-size: var(--pz-text-sm)"
                >
                  {{ getAvatarText(item.nickname) }}
                </span>
                <span
                  class="font-medium truncate"
                  style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary)"
                >
                  {{ getDisplayName(item.nickname) }}
                </span>
              </div>
              <time
                class="shrink-0"
                style="font-family: var(--pz-font-sans); font-size: var(--pz-text-xs); color: var(--pz-color-text-tertiary)"
              >
                {{ formatTime(item.createdAt) }}
              </time>
            </div>

            <!-- 留言内容 -->
            <p
              style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary); line-height: var(--pz-leading-relaxed); word-break: break-word; overflow-wrap: break-word"
            >
              {{ item.content }}
            </p>

            <!-- 站长回复 -->
            <div
              v-if="item.adminReply"
              class="mt-3 p-3"
              style="background-color: var(--pz-color-primary-lightest); border-left: 3px solid var(--pz-color-primary); border-radius: var(--pz-radius-md)"
            >
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="color: var(--pz-color-primary); flex-shrink: 0"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span
                  style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); font-weight: var(--pz-weight-semibold); color: var(--pz-color-primary)"
                >
                  站长回复
                </span>
                <time
                  style="font-family: var(--pz-font-sans); font-size: var(--pz-text-xs); color: var(--pz-color-text-tertiary)"
                >
                  {{ formatTime(item.replyAt) }}
                </time>
              </div>
              <p
                style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary); line-height: var(--pz-leading-relaxed); word-break: break-word; overflow-wrap: break-word"
              >
                {{ item.adminReply }}
              </p>
            </div>
          </article>
        </div>

        <!-- 空状态 -->
        <div
          v-else
          class="py-10 text-center"
        >
          <svg
            class="mx-auto mb-3"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-text-tertiary)"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p
            style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-tertiary)"
          >
            暂无留言，快来抢沙发吧
          </p>
        </div>

        <!-- 分页 -->
        <div
          v-if="pageData && pageData.totalPages > 1"
          class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4"
          style="border-top: 1px solid var(--pz-color-border)"
        >
          <span
            style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary)"
          >
            共 {{ pageData.totalElements }} 条留言
          </span>
          <div class="flex items-center gap-2 flex-wrap">
            <!-- 上一页 -->
            <button
              type="button"
              class="pz-btn-secondary"
              :disabled="(pageData.number ?? 0) === 0"
              style="min-height: 36px; cursor: pointer"
              :style="(pageData.number ?? 0) === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
              @click="goToPage((pageData.number ?? 0) - 1)"
            >
              上一页
            </button>

            <!-- 页码按钮 -->
            <template v-for="(p, idx) in pageNumbers" :key="idx">
              <span
                v-if="p === '...'"
                style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-tertiary); padding: 0 4px"
              >
                ...
              </span>
              <button
                v-else
                type="button"
                class="font-medium"
                style="min-width: 36px; min-height: 36px; padding: 0 8px; border-radius: var(--pz-radius-md); font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); cursor: pointer; border: 1px solid var(--pz-color-border); background-color: var(--pz-color-surface); color: var(--pz-color-text-secondary); transition: all 0.15s ease"
                :style="(p as number) - 1 === (pageData.number ?? 0) ? { backgroundColor: 'var(--pz-color-primary)', borderColor: 'var(--pz-color-primary)', color: 'var(--pz-color-text-inverse)' } : {}"
                @click="goToPage((p as number) - 1)"
              >
                {{ p }}
              </button>
            </template>

            <!-- 下一页 -->
            <button
              type="button"
              class="pz-btn-secondary"
              :disabled="(pageData.number ?? 0) >= (pageData.totalPages - 1)"
              style="min-height: 36px; cursor: pointer"
              :style="(pageData.number ?? 0) >= (pageData.totalPages - 1) ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
              @click="goToPage((pageData.number ?? 0) + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
