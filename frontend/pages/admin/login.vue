<script setup lang="ts">
/**
 * pages/admin/login.vue - 站长登录页
 *
 * 独立页面（不使用 default / admin 布局），包含：
 * - 深色顶栏（shield 图标 + 站点名 + 返回首页链接）
 * - 居中登录卡片（账号、密码、错误提示、登录按钮）
 * - 页脚版权
 *
 * API：POST /api/v1/admin/login
 *   请求：{ username, password }
 *   响应：{ code: 0, data: { token, username, expireAt } }
 *
 * 登录成功后设置 localStorage 标记并跳转到 /admin/feedback。
 * admin_token 由后端通过 Set-Cookie（HttpOnly）下发。
 */

definePageMeta({
  layout: false,
})

useHead({
  titleTemplate: null,
  title: '站长登录 | 盘子工具站',
  meta: [
    { name: 'description', content: '管理员登录入口' },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

// ============ 类型定义 ============
interface LoginData {
  token: string
  username: string
  expireAt?: string
}

interface LoginResponse {
  code: number
  data: LoginData
  message?: string
}

// ============ 状态 ============
const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

// ============ 登录处理 ============
async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = '请输入账号和密码'
    return
  }
  errorMessage.value = ''
  loading.value = true

  try {
    const res = await $fetch<LoginResponse>('/api/v1/admin/login', {
      baseURL,
      method: 'POST',
      body: { username: username.value, password: password.value },
      credentials: 'include',
    })

    if (res.code === 0) {
      if (import.meta.client) {
        localStorage.setItem('admin_logged_in', '1')
      }
      await navigateTo('/admin/feedback')
    } else {
      errorMessage.value = res.message || '登录失败'
    }
  } catch (err) {
    const error = err as {
      statusCode?: number
      data?: { message?: string }
      message?: string
    }
    if (error?.statusCode === 429) {
      errorMessage.value = '登录尝试过于频繁，请稍后再试'
    } else if (error?.statusCode === 401) {
      errorMessage.value = '账号或密码错误'
    } else if (error?.data?.message) {
      errorMessage.value = error.data.message
    } else if (error?.message) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = '网络错误，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen" style="font-family: var(--pz-font-sans)">
    <!-- ============ 深色顶栏 ============ -->
    <header
      class="w-full px-6 py-4 flex items-center justify-between shrink-0"
      style="background-color: #0f172a; color: #ffffff"
    >
      <div class="flex items-center gap-3">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span class="text-lg font-semibold" style="font-family: var(--pz-font-display)">
          盘子工具站 管理后台
        </span>
      </div>
      <NuxtLink
        to="/"
        class="flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100 transition-opacity"
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
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回首页
      </NuxtLink>
    </header>

    <!-- ============ 主内容区：居中登录卡片 ============ -->
    <main class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="pz-card w-full max-w-sm p-6 sm:p-8" style="box-shadow: var(--pz-shadow-md)">
        <!-- 标题 -->
        <div class="mb-6">
          <h1
            class="text-2xl font-semibold tracking-tight"
            style="font-family: var(--pz-font-display); color: var(--pz-color-text-primary)"
          >
            站长登录
          </h1>
          <p
            class="mt-1"
            style="
              font-family: var(--pz-font-sans);
              font-size: var(--pz-text-sm);
              color: var(--pz-color-text-secondary);
            "
          >
            请输入管理员账号密码
          </p>
        </div>

        <!-- 登录表单 -->
        <form class="space-y-4" novalidate @submit.prevent="handleLogin">
          <!-- 账号 -->
          <div class="space-y-2">
            <label
              for="admin-username"
              class="block"
              style="
                font-family: var(--pz-font-sans);
                font-size: var(--pz-text-sm);
                font-weight: var(--pz-weight-medium);
                color: var(--pz-color-text-primary);
              "
            >
              账号
            </label>
            <input
              id="admin-username"
              v-model="username"
              name="username"
              type="text"
              required
              autocomplete="username"
              placeholder="请输入管理员账号"
              class="pz-input w-full"
            >
          </div>

          <!-- 密码 -->
          <div class="space-y-2">
            <label
              for="admin-password"
              class="block"
              style="
                font-family: var(--pz-font-sans);
                font-size: var(--pz-text-sm);
                font-weight: var(--pz-weight-medium);
                color: var(--pz-color-text-primary);
              "
            >
              密码
            </label>
            <input
              id="admin-password"
              v-model="password"
              name="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="请输入密码"
              class="pz-input w-full"
            >
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMessage" role="alert" class="pz-error-text">
            {{ errorMessage }}
          </div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            class="pz-btn-primary w-full justify-center"
            :disabled="loading"
            style="min-height: 42px"
            :style="loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}"
          >
            <svg
              v-if="loading"
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
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>
    </main>

    <!-- ============ 页脚 ============ -->
    <footer
      class="w-full py-4 px-6 shrink-0"
      style="border-top: 1px solid var(--pz-color-border); background-color: var(--pz-color-bg)"
    >
      <p
        class="text-center"
        style="
          font-family: var(--pz-font-sans);
          font-size: var(--pz-text-sm);
          color: var(--pz-color-text-secondary);
        "
      >
        © 2026 盘子工具站. All rights reserved.
      </p>
    </footer>
  </div>
</template>
