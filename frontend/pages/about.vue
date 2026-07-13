<script setup lang="ts">
/**
 * pages/about.vue - 关于我们页
 *
 * 严格参照 ui/pages/关于我们.html 的布局
 * - 面包屑：首页 > 关于我们
 * - 站点介绍（渐变背景区）
 * - 特色亮点（3 列卡片）
 * - 统计数据（10+工具 / 50k+月活用户 / 100%免费）
 * - 联系方式
 */

useSeoMeta({
  title: '关于我们',
  description: 'PanziPool 致力于为中文开发者提供便捷的在线工具集合。所有工具无需安装，打开即用。',
})
</script>

<template>
  <!-- ============ 面包屑 ============ -->
  <nav
    aria-label="面包屑"
    class="flex items-center gap-1.5 mb-10"
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
      关于我们
    </span>
  </nav>

  <!-- ============ 站点介绍（渐变背景） ============ -->
  <section
    class="-mx-8 px-8 py-12 sm:py-16"
    style="background: linear-gradient(to bottom, var(--pz-color-primary-lightest), transparent)"
  >
    <div class="max-w-3xl mx-auto text-center">
      <h1
        class="pz-h1"
        style="color: var(--pz-color-primary); text-wrap: balance; word-break: keep-all; overflow-wrap: break-word"
      >
        关于 PanziPool
      </h1>
      <p
        style="font-family: var(--pz-font-sans); font-size: var(--pz-text-lg); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-normal); margin-top: 1rem; text-wrap: balance; word-break: keep-all"
      >
        面向中文开发者的在线工具聚合站
      </p>
      <p
        style="font-family: var(--pz-font-sans); font-size: var(--pz-text-base); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-relaxed); margin-top: 1.5rem"
      >
        PanziPool
        致力于为中文开发者提供便捷的在线工具集合。我们聚焦开发者日常工作中的格式化、编码解码、正则测试、时间转换等高频需求，同时提供图片压缩、格式转换等轻量图片处理工具。所有工具无需安装，打开即用。
      </p>
    </div>
  </section>

  <!-- ============ 特色亮点（3 列卡片） ============ -->
  <section class="py-10 sm:py-12">
    <h2
      style="font-family: var(--pz-font-display); font-size: var(--pz-text-2xl); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); text-align: center; margin-bottom: 2rem; line-height: var(--pz-leading-tight); text-wrap: balance; word-break: keep-all"
    >
      我们的特色
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 即开即用 -->
      <article class="pz-card p-6 flex flex-col items-center text-center" style="transition: border-color 0.15s ease, transform 0.15s ease"
        @mouseenter="
          ($event.target as HTMLElement).style.borderColor = 'var(--pz-color-primary-border)';
          ($event.target as HTMLElement).style.transform = 'translateY(-2px)';
        "
        @mouseleave="
          ($event.target as HTMLElement).style.borderColor = 'var(--pz-color-border)';
          ($event.target as HTMLElement).style.transform = 'translateY(0)';
        "
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mb-4"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <h3
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-lg); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); line-height: var(--pz-leading-tight)"
        >
          即开即用
        </h3>
        <p
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-relaxed); margin-top: 0.5rem"
        >
          无需安装，浏览器打开即可使用所有工具
        </p>
      </article>

      <!-- 隐私安全 -->
      <article class="pz-card p-6 flex flex-col items-center text-center" style="transition: border-color 0.15s ease, transform 0.15s ease"
        @mouseenter="
          ($event.target as HTMLElement).style.borderColor = 'var(--pz-color-primary-border)';
          ($event.target as HTMLElement).style.transform = 'translateY(-2px)';
        "
        @mouseleave="
          ($event.target as HTMLElement).style.borderColor = 'var(--pz-color-border)';
          ($event.target as HTMLElement).style.transform = 'translateY(0)';
        "
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mb-4"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <h3
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-lg); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); line-height: var(--pz-leading-tight)"
        >
          隐私安全
        </h3>
        <p
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-relaxed); margin-top: 0.5rem"
        >
          图片工具本地处理，不上传服务器，保护数据隐私
        </p>
      </article>

      <!-- 快速查找 -->
      <article class="pz-card p-6 flex flex-col items-center text-center" style="transition: border-color 0.15s ease, transform 0.15s ease"
        @mouseenter="
          ($event.target as HTMLElement).style.borderColor = 'var(--pz-color-primary-border)';
          ($event.target as HTMLElement).style.transform = 'translateY(-2px)';
        "
        @mouseleave="
          ($event.target as HTMLElement).style.borderColor = 'var(--pz-color-border)';
          ($event.target as HTMLElement).style.transform = 'translateY(0)';
        "
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mb-4"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <h3
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-lg); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); line-height: var(--pz-leading-tight)"
        >
          快速查找
        </h3>
        <p
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-relaxed); margin-top: 0.5rem"
        >
          分类清晰，支持搜索，快速找到所需工具
        </p>
      </article>
    </div>
  </section>

  <!-- ============ 统计数据 ============ -->
  <section
    class="-mx-8 px-8 py-12 sm:py-14"
    style="background-color: var(--pz-color-bg-secondary)"
  >
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center max-w-3xl mx-auto">
      <div class="flex flex-col items-center">
        <span
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-3xl); font-weight: var(--pz-weight-bold); color: var(--pz-color-primary); font-variant-numeric: tabular-nums; line-height: 1.2"
        >
          10+
        </span>
        <span
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); margin-top: 0.5rem"
        >
          在线工具
        </span>
      </div>
      <div class="flex flex-col items-center">
        <span
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-3xl); font-weight: var(--pz-weight-bold); color: var(--pz-color-primary); font-variant-numeric: tabular-nums; line-height: 1.2"
        >
          50k+
        </span>
        <span
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); margin-top: 0.5rem"
        >
          月活用户
        </span>
      </div>
      <div class="flex flex-col items-center">
        <span
          style="font-family: var(--pz-font-display); font-size: var(--pz-text-3xl); font-weight: var(--pz-weight-bold); color: var(--pz-color-primary); font-variant-numeric: tabular-nums; line-height: 1.2"
        >
          100%
        </span>
        <span
          style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); margin-top: 0.5rem"
        >
          免费使用
        </span>
      </div>
    </div>
  </section>

  <!-- ============ 联系方式 ============ -->
  <section class="py-10 sm:py-12 max-w-2xl mx-auto">
    <h2
      style="font-family: var(--pz-font-display); font-size: var(--pz-text-2xl); font-weight: var(--pz-weight-semibold); color: var(--pz-color-text-primary); margin-bottom: 1.5rem; line-height: var(--pz-leading-tight); text-wrap: balance; word-break: keep-all"
    >
      联系我们
    </h2>
    <div class="pz-card p-6 flex flex-col gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <a
          href="mailto:feedback@panzipool.com"
          class="truncate"
          style="font-family: var(--pz-font-mono); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary); text-decoration: none; transition: color 0.15s ease"
        >
          feedback@panzipool.com
        </a>
      </div>
      <p
        style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); line-height: var(--pz-leading-relaxed)"
      >
        如有工具建议、问题反馈或合作意向，欢迎通过邮件联系我们。
      </p>
    </div>
    <p
      style="font-family: var(--pz-font-sans); font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary); margin-top: 1.5rem; line-height: var(--pz-leading-relaxed)"
    >
      查看我们的
      <NuxtLink
        to="/privacy"
        style="font-family: var(--pz-font-sans); color: var(--pz-color-primary); font-weight: var(--pz-weight-semibold); text-decoration: none; text-underline-offset: 4px"
      >
        隐私政策
      </NuxtLink>。
    </p>
  </section>
</template>
