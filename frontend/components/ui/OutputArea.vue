<script setup lang="ts">
/**
 * OutputArea.vue - 输出展示区域
 *
 * 只读 pre 元素，使用等宽字体，支持语法高亮 HTML
 * 参照 UI 参考文件 .pz-code 样式
 */

withDefaults(
  defineProps<{
    content?: string
    label?: string
    showLabel?: boolean
  }>(),
  {
    content: '',
    label: '输出',
    showLabel: true,
  },
)
</script>

<template>
  <div class="pz-card p-4 flex flex-col gap-3 min-w-0" :class="$attrs.class">
    <div v-if="showLabel" class="flex items-center justify-between">
      <span
        class="text-sm font-medium"
        style="color: var(--pz-color-text-primary)"
      >
        {{ label }}
      </span>
      <slot name="header-actions" />
    </div>
    <pre class="pz-code flex-1"><code v-if="content">{{ content }}</code><slot v-else /></pre>
  </div>
</template>
