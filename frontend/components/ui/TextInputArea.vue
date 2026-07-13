<script setup lang="ts">
/**
 * TextInputArea.vue - 文本输入区域
 *
 * 使用等宽字体 textarea，支持 v-model
 * 参照 UI 参考文件 .pz-textarea 样式
 */

const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    placeholder?: string
    rows?: number
    label?: string
    showLabel?: boolean
  }>(),
  {
    placeholder: '在此输入...',
    rows: 10,
    label: '输入',
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
    <textarea
      v-model="model"
      class="pz-textarea flex-1 w-full"
      :placeholder="placeholder"
      :rows="rows"
      :aria-label="label"
    />
  </div>
</template>
