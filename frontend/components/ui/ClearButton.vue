<script setup lang="ts">
/**
 * ClearButton.vue - 清空按钮
 *
 * 参照 UI 参考文件的 pz-btn-secondary + 清空图标样式
 */
import { Trash2 } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: '清空',
  },
)

const emit = defineEmits<{
  clear: []
}>()
</script>

<template>
  <button
    type="button"
    class="pz-btn-secondary whitespace-nowrap"
    :aria-label="label"
    @click="emit('clear')"
  >
    <Trash2 class="w-4 h-4" aria-hidden="true" />
    <span>{{ label }}</span>
  </button>
</template>
