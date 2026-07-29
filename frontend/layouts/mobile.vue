<script setup lang="ts">
/**
 * mobile.vue - 移动端基础布局
 *
 * 参考 panzi-tools-mobile/pages/index.html 设计：
 * - 顶部 Header（52px，sticky 固定）：Logo + 站点名称
 * - 内容区域：单栏展示，padding: 0 16px
 * - 底部 Footer：关于我们、隐私政策链接、版权信息
 * - 底部导航栏（56px，fixed 固定）：首页、工具、关于三个入口
 *
 * 设计 Token（独立 scoped CSS，不污染 Tailwind 全局）：
 *   主色 #7c3aed，背景 #f9fafb，圆角 12px
 *
 * 技术要求：
 * - 组件最小触摸区域 44x44px
 * - 监听 resize，设备切换时 isMobile 状态已由 composable 维护
 */

const { isMobile } = useDevice()

const route = useRoute()

/** 根据当前路径高亮底部导航项 */
const activeTab = computed<'home' | 'tools' | 'about'>(() => {
  const p = route.path
  // 首页（含移动端首页 /mobile）
  if (p === '/' || p === '' || p === '/mobile' || p === '/mobile/') return 'home'
  // 工具相关页：开发者工具 / 图片工具列表与详情
  if (
    p.startsWith('/mobile/tools') ||
    p.startsWith('/mobile/image-tools') ||
    p.startsWith('/tools') ||
    p.startsWith('/category')
  )
    return 'tools'
  if (p.startsWith('/about') || p.startsWith('/mobile/about')) return 'about'
  return 'home'
})

/** 客户端挂载后：启动 resize 监听，支持横竖屏切换实时响应 */
onMounted(() => {
  const { setupResizeListener } = useDevice()
  const cleanup = setupResizeListener()
  onBeforeUnmount(cleanup)
})
</script>

<template>
  <div class="mobile-layout">
    <!-- 顶部 Header（sticky） -->
    <header class="mobile-header" role="banner">
      <NuxtLink to="/" class="mobile-header__brand" aria-label="盘子工具站首页">
        <span class="mobile-header__logo" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2.5"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </span>
        <span class="mobile-header__title">盘子工具站</span>
      </NuxtLink>
    </header>

    <!-- 内容区 -->
    <main class="mobile-main" role="main">
      <div class="mobile-main__inner">
        <slot />
      </div>

      <!-- 底部 Footer -->
      <MobileFooter />

      <!-- 底部占位（避免内容被 fixed 导航遮挡） -->
      <div class="mobile-nav__placeholder" aria-hidden="true"></div>
    </main>

    <!-- 底部导航栏（fixed） -->
    <nav class="mobile-nav" role="navigation" aria-label="主导航">
      <NuxtLink
        to="/"
        class="mobile-nav__item"
        :data-active="activeTab === 'home'"
        aria-current="page"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          :stroke="activeTab === 'home' ? '#7c3aed' : '#9ca3af'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span class="mobile-nav__label">首页</span>
      </NuxtLink>

      <NuxtLink
        to="/mobile/tools"
        class="mobile-nav__item"
        :data-active="activeTab === 'tools'"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          :stroke="activeTab === 'tools' ? '#7c3aed' : '#9ca3af'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
          />
        </svg>
        <span class="mobile-nav__label">工具</span>
      </NuxtLink>

      <NuxtLink
        to="/mobile/about"
        class="mobile-nav__item"
        :data-active="activeTab === 'about'"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          :stroke="activeTab === 'about' ? '#7c3aed' : '#9ca3af'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span class="mobile-nav__label">关于</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
/* --- 设计 Token（仅在 scoped 内生效，不污染全局 Tailwind） --- */
.mobile-layout {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #a78bfa;
  --m-color-primary-lighter: #ede9fe;
  --m-color-bg: #f9fafb;
  --m-color-surface: #ffffff;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-radius-lg: 12px;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--m-color-bg);
  color: var(--m-color-text-primary);
  font-family: 'Noto Sans SC', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* --- Header --- */
.mobile-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 52px;
  padding: 0 16px;
  background-color: var(--m-color-surface);
  border-bottom: 1px solid var(--m-color-border);
  display: flex;
  align-items: center;
}

.mobile-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--m-color-text-primary);
  min-height: 44px;
  min-width: 44px;
  padding: 0;
}

.mobile-header__logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--m-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-header__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--m-color-text-primary);
  line-height: 1.2;
}

/* --- Main --- */
.mobile-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mobile-main__inner {
  padding: 0 16px;
  flex: 1;
}

/* --- Footer 样式已迁移至 MobileFooter.vue --- */

/* --- Bottom Nav --- */
.mobile-nav__placeholder {
  height: 56px;
  background-color: var(--m-color-surface);
  width: 100%;
}

.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: var(--m-color-surface);
  border-top: 1px solid var(--m-color-border);
  display: flex;
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.mobile-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--m-color-text-secondary);
  min-height: 44px;
  padding: 4px 0;
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav__item[data-active='true'] {
  color: var(--m-color-primary);
}

.mobile-nav__label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

.mobile-nav__item[data-active='true'] .mobile-nav__label {
  color: var(--m-color-primary);
  font-weight: 600;
}
</style>
