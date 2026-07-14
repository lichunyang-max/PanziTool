<script setup lang="ts">
/**
 * AppFooter - 固定页脚（全宽）
 * 严格参照 UI 参考文件 ui/pages/首页.html 的 footer 结构
 * - 居中链接：关于我们 / 隐私政策
 * - 版权信息 + ICP 备案号 + 公网安备号
 */
</script>

<template>
  <footer
    class="flex-shrink-0"
    style="
      background-color: var(--pz-color-bg-secondary);
      border-top: 1px solid var(--pz-color-border);
    "
  >
    <div
      class="flex flex-col items-center justify-center gap-1 py-3"
      style="padding-left: 2rem; padding-right: 2rem"
    >
      <div class="flex items-center gap-6">
        <NuxtLink to="/about" class="pz-footer-link">关于我们</NuxtLink>
        <NuxtLink to="/privacy" class="pz-footer-link">隐私政策</NuxtLink>
      </div>
      <div
        class="flex flex-wrap items-center justify-center gap-4 text-xs"
        style="color: var(--pz-color-text-tertiary); font-family: var(--pz-font-sans)"
      >
        <span>© 2026 PanziPool. All rights reserved.</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener"
          class="pz-footer-link"
          style="font-size: var(--pz-text-xs)"
          >渝ICP备2026015117号</a
        >
        <a
          href="http://www.beian.gov.cn/"
          target="_blank"
          rel="noopener"
          class="pz-footer-link"
          style="font-size: var(--pz-text-xs)"
          >京公网安备 110108020XXXXXX号</a
        >
      </div>
    </div>
  </footer>
</template>
