<script setup lang="ts">
/**
 * default.vue - 基础布局组件
 * 严格参照 UI 参考文件 ui/pages/首页.html 的整体布局结构
 * - 固定头部（64px，全宽）
 * - 应用主体（flex:1）：可折叠侧边栏 + 可滚动主内容区
 * - 固定页脚（全宽）
 */

onMounted(() => {
  const bp = document.createElement('script')
  const curProtocol = window.location.protocol.split(':')[0]
  if (curProtocol === 'https') {
    bp.src = 'https://zz.bdstatic.com/linksubmit/push.js'
  } else {
    bp.src = 'http://push.zhanzhang.baidu.com/push.js'
  }
  const s = document.getElementsByTagName('script')[0]
  s.parentNode?.insertBefore(bp, s)
})
</script>

<template>
  <!-- 固定头部（全宽） -->
  <AppHeader />

  <!-- 应用主体：侧边栏 + 可滚动主内容区 -->
  <div class="pz-app">
    <AppSidebar />

    <!-- 可滚动主内容区 -->
    <div class="pz-main-area">
      <main class="pz-main-content">
        <slot />
      </main>
    </div>
  </div>

  <!-- 固定页脚（全宽） -->
  <AppFooter />
</template>
