<script setup lang="ts">
/**
 * App.vue - 资源站根布局
 *
 * 顶部导航（logo + 搜索提示由各页面自行处理）+ 路由出口：
 * - /              资源列表页（Home）
 * - /resource/:id  资源详情页（ResourceDetail）
 */
</script>

<template>
  <header class="site-header">
    <RouterLink class="site-logo" to="/">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      盘子资源站
    </RouterLink>
  </header>

  <RouterView />
</template>
