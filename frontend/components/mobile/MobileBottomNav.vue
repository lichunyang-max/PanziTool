<script setup lang="ts">
/**
 * MobileBottomNav.vue - 移动端底部导航栏组件
 *
 * 设计规范：
 * - 三个导航项：首页、工具、关于
 * - 当前页高亮（紫色主色调 #7c3aed）
 * - fixed 固定定位，高度 56px
 * - 包含 svg 图标 + 文字标签
 * - 使用 useRoute 判断激活状态
 *
 * 设计 Token：
 *   主色 #7c3aed，背景 #ffffff，边框 #e5e7eb
 */

const route = useRoute()

type TabKey = 'home' | 'tools' | 'about'

interface NavItem {
  label: string
  to: string
  key: TabKey
  icon: string
}

const navItems: NavItem[] = [
  { label: '首页', to: '/', key: 'home', icon: 'home' },
  { label: '工具', to: '/category/developer', key: 'tools', icon: 'tool' },
  { label: '关于', to: '/about', key: 'about', icon: 'info' },
]

/** 根据当前路径判断激活的导航项 */
const activeTab = computed<TabKey>(() => {
  const p = route.path
  if (p === '/' || p === '') return 'home'
  if (p.startsWith('/tools') || p.startsWith('/category')) return 'tools'
  if (p.startsWith('/about')) return 'about'
  return 'home'
})

/** 判断导航项是否激活 */
function isActive(key: TabKey): boolean {
  return activeTab.value === key
}
</script>

<template>
  <nav class="mobile-nav" role="navigation" aria-label="主导航">
    <NuxtLink
      v-for="item in navItems"
      :key="item.key"
      :to="item.to"
      class="mobile-nav__item"
      :data-active="isActive(item.key)"
      :aria-current="isActive(item.key) ? 'page' : undefined"
    >
      <!-- 首页图标 -->
      <svg
        v-if="item.icon === 'home'"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        :stroke="isActive(item.key) ? 'var(--m-color-primary)' : 'var(--m-color-text-tertiary)'"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>

      <!-- 工具图标 -->
      <svg
        v-if="item.icon === 'tool'"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        :stroke="isActive(item.key) ? 'var(--m-color-primary)' : 'var(--m-color-text-tertiary)'"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
      </svg>

      <!-- 关于图标 -->
      <svg
        v-if="item.icon === 'info'"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        :stroke="isActive(item.key) ? 'var(--m-color-primary)' : 'var(--m-color-text-tertiary)'"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>

      <span class="mobile-nav__label">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.mobile-nav {
  --m-color-primary: #7c3aed;
  --m-color-surface: #ffffff;
  --m-color-border: #e5e7eb;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;

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
