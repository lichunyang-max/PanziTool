<script setup lang="ts">
/**
 * ExampleButton.vue - 示例填充按钮
 *
 * 点击后将示例内容填充到对应输入区
 * 参照 UI 参考文件的"示例"按钮样式（Primary 色文字，无边框背景）
 */
withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: '示例',
  },
)

const emit = defineEmits<{
  fill: []
}>()
</script>

<template>
  <button
    type="button"
    class="text-sm whitespace-nowrap hover:underline"
    style="color: var(--pz-color-primary); background: none; border: none; cursor: pointer; padding: 0"
    :aria-label="label"
    @click="emit('fill')"
  >
    {{ label }}
  </button>
</template>
