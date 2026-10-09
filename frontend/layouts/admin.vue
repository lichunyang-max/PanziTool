<script setup lang="ts">
/**
 * layouts/admin.vue - 管理后台布局
 *
 * 用于 /admin/* 下的管理页面（登录页除外）：
 * - 深色顶栏（shield 图标 + 站点名 + 退出登录按钮）
 * - 主内容区 <slot />
 *
 * 退出登录：调用后端注销 API 销毁服务端会话，
 * 然后清除客户端 localStorage 标记并跳转到登录页。
 * admin_token 为 HttpOnly cookie，由后端管理。
 */

interface MenuItem {
  label: string
  to?: string
  icon: string
  disabled?: boolean
}

const menuItems: MenuItem[] = [
  { label: '留言管理', to: '/admin/feedback', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { label: '资源管理', to: '/admin/resources', icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' },
  { label: '广告管理', to: '/admin/ads', icon: 'M3 11v2a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1zm13.94-4.06l-1.41 1.41a8 8 0 0 1 0 11.31l1.41 1.41a10 10 0 0 0 0-14.13zM18.36 8.64l-1.41 1.41a4 4 0 0 1 0 5.9l1.41 1.41a6 6 0 0 0 0-8.72z' },
]

const route = useRoute()

function isMenuActive(item: MenuItem): boolean {
  if (!item.to) return false
  return route.path === item.to || route.path.startsWith(item.to + '/')
}

const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

const logoutLoading = ref(false)

async function handleLogout() {
  if (logoutLoading.value) return
  logoutLoading.value = true

  try {
    await $fetch('/api/v1/admin/logout', {
      baseURL,
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // 即使 API 调用失败，仍然进行本地清理和跳转
  } finally {
    if (import.meta.client) {
      localStorage.removeItem('admin_logged_in')
    }
    logoutLoading.value = false
    await navigateTo('/admin/login')
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- 深色顶栏 -->
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
      <button
        type="button"
        class="flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100 transition-opacity"
        style="font-family: var(--pz-font-sans)"
        :disabled="logoutLoading"
        :style="logoutLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {}"
        @click="handleLogout"
      >
        <svg
          v-if="logoutLoading"
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
        <svg
          v-else
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
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {{ logoutLoading ? '退出中...' : '退出登录' }}
      </button>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧侧边栏 -->
      <aside class="w-[220px] shrink-0 ml-[5px] bg-card border-r border-border p-2">
        <div class="mb-2 px-2">
          <span class="text-sm font-semibold text-foreground">管理菜单</span>
        </div>
        <nav class="flex flex-col gap-2">
          <template v-for="item in menuItems" :key="item.label">
            <NuxtLink
              v-if="item.to && !item.disabled"
              :to="item.to"
              class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="isMenuActive(item) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="item.icon" />
              </svg>
              <span>{{ item.label }}</span>
            </NuxtLink>
            <a
              v-else
              href="#"
              class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
              @click.prevent
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="item.icon" />
              </svg>
              <span>{{ item.label }}</span>
            </a>
          </template>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
