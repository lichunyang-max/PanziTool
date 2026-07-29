<script setup lang="ts">
/**
 * MobileHeader.vue - 移动端顶部导航组件
 *
 * 设计规范：
 * - sticky 固定定位，高度 52px
 * - Logo 图标 + 站点名称「盘子工具站」
 * - 工具页可显示返回按钮（通过 prop 控制）
 *
 * 设计 Token：
 *   主色 #7c3aed，背景 #ffffff，边框 #e5e7eb
 */

interface Props {
  /** 是否显示返回按钮 */
  showBack?: boolean
  /** 返回跳转路径 */
  backTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  backTo: '/',
})

const router = useRouter()

async function handleBack() {
  if (props.backTo === '/') {
    await router.push('/')
  } else {
    await router.push(props.backTo)
  }
}
</script>

<template>
  <header class="mobile-header" role="banner">
    <!-- 返回按钮 -->
    <button
      v-if="showBack"
      class="mobile-header__back"
      type="button"
      aria-label="返回"
      @click="handleBack"
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
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <!-- Logo + 站点名称 -->
    <NuxtLink to="/" class="mobile-header__brand" aria-label="盘子工具站首页">
      <span class="mobile-header__logo" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </span>
      <span class="mobile-header__title">盘子工具站</span>
    </NuxtLink>
  </header>
</template>

<style scoped>
.mobile-header {
  /* 设计 Token（scoped 内独立样式，不污染全局 Tailwind） */
  --m-color-primary: #7c3aed;
  --m-color-bg: #ffffff;
  --m-color-border: #e5e7eb;
  --m-color-text: #111827;
  --m-color-text-secondary: #6b7280;

  position: sticky;
  top: 0;
  z-index: 50;
  height: 52px;
  padding: 0 16px;
  background-color: var(--m-color-bg);
  border-bottom: 1px solid var(--m-color-border);
  display: flex;
  align-items: center;
}

/* 返回按钮 */
.mobile-header__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  margin-right: 4px;
  background: none;
  border: none;
  color: var(--m-color-text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: color 0.15s ease, background-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-header__back:active {
  background-color: #f3f4f6;
  color: var(--m-color-primary);
}

/* Logo + 品牌 */
.mobile-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--m-color-text);
  min-height: 44px;
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
  color: var(--m-color-text);
  line-height: 1.2;
}
</style>
