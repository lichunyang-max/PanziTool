<script setup lang="ts">
/**
 * ErrorBoundary.vue - 错误边界组件
 *
 * 使用 onErrorCaptured 捕获子组件异常
 * 展示友好错误提示（红色背景卡片）
 * 提供重试按钮
 */

const error = ref<Error | null>(null)
const errorMessage = ref('')

const hasError = computed(() => error.value !== null)

/**
 * Nuxt onErrorCaptured 钩子（Vue 3）
 * 捕获子组件异常，阻止错误继续传播
 */
onErrorCaptured((err: Error) => {
  error.value = err
  errorMessage.value = err.message || '未知错误'
  return false // 阻止错误继续传播
})

function retry() {
  error.value = null
  errorMessage.value = ''
}
</script>

<template>
  <div>
    <!-- 错误展示区 -->
    <div
      v-if="hasError"
      class="pz-card p-4 flex items-start gap-3"
      style="
        background-color: var(--pz-state-error-bg);
        border-color: var(--pz-state-error-border);
      "
      role="alert"
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
        class="shrink-0 mt-0.5"
        style="color: var(--pz-state-error)"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <div class="min-w-0">
        <p
          class="text-sm font-semibold"
          style="color: var(--pz-state-error)"
        >
          发生错误
        </p>
        <p
          class="text-sm mt-1"
          style="font-family: var(--pz-font-mono); color: var(--pz-color-text-secondary)"
        >
          {{ errorMessage }}
        </p>
        <button
          type="button"
          class="pz-btn-secondary mt-3"
          style="padding: 0.25rem 0.75rem; font-size: var(--pz-text-xs)"
          @click="retry"
        >
          重试
        </button>
      </div>
    </div>

    <!-- 正常子内容 -->
    <div v-else>
      <slot />
    </div>
  </div>
</template>
