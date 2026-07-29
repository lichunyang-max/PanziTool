<script setup lang="ts">
/**
 * MobileFooter.vue - 移动端页脚组件
 *
 * 设计规范：
 * - 包含关于我们、隐私政策链接
 * - 版权信息 + ICP 备案号
 * - 样式简洁，居中对齐
 */
</script>

<template>
  <footer class="mobile-footer" role="contentinfo">
    <div class="mobile-footer__links">
      <NuxtLink to="/mobile/about" class="mobile-footer__link">关于我们</NuxtLink>
      <span class="mobile-footer__sep" aria-hidden="true">|</span>
      <NuxtLink to="/mobile/privacy" class="mobile-footer__link">隐私政策</NuxtLink>
    </div>
    <p class="mobile-footer__copy">&copy; 2026 盘子工具站</p>
    <div class="mobile-footer__beian-group">
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        class="mobile-footer__beian-link"
        >渝ICP备2026015117号</a
      >
      <a
        href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=50019002505549"
        target="_blank"
        rel="noopener noreferrer"
        class="mobile-footer__beian-link"
      >
        <img
          src="/images/logo01ga.png"
          alt="公安备案"
          class="mobile-footer__beian-logo"
        />
        渝公网安备50019002505549号
      </a>
    </div>
  </footer>
</template>

<style scoped>
.mobile-footer {
  --m-color-surface: #ffffff;
  --m-color-border-light: #f3f4f6;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-border: #e5e7eb;
  --m-color-primary: #7c3aed;

  margin-top: 24px;
  padding: 16px;
  background-color: var(--m-color-surface);
  border-top: 1px solid var(--m-color-border-light);
  text-align: center;
}

.mobile-footer__links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  min-height: 44px;
}

.mobile-footer__link {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  text-decoration: none;
  padding: 8px 4px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-footer__link:active {
  color: var(--m-color-primary);
}

.mobile-footer__sep {
  color: var(--m-color-border);
  font-size: 12px;
}

.mobile-footer__copy {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.mobile-footer__beian-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.mobile-footer__beian-link {
  font-size: 11px;
  color: var(--m-color-text-tertiary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.mobile-footer__beian-logo {
  width: 14px;
  height: 14px;
}
</style>
