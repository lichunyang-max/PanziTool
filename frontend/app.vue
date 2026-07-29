<script setup lang="ts">
/**
 * app.vue - Nuxt 根组件
 *
 * 客户端初始化：
 * - detectDevice() 同步 isMobile 响应式状态供组件使用
 * - 路由重定向与 resize 监听由 plugins/device-detect.client.ts 负责
 */

if (import.meta.client) {
  const { detectDevice } = useDevice()
  detectDevice()
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>