<script setup lang="ts">
/**
 * CopyButton.vue - 复制按钮
 *
 * 带复制图标，点击后显示"已复制"提示
 * 参照 UI 参考文件的 pz-btn-secondary + 复制图标样式
 */
import { Copy, Check } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    text: string
    label?: string
  }>(),
  {
    label: '复制',
  },
)

const emit = defineEmits<{
  copy: [text: string]
}>()

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    emit('copy', props.text)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // 降级：text area fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = props.text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      copied.value = true
      emit('copy', props.text)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      // 复制失败，静默忽略
    }
  }
}
</script>

<template>
  <button
    type="button"
    class="pz-btn-secondary whitespace-nowrap"
    :aria-label="copied ? '已复制' : label"
    @click="handleCopy"
  >
    <component :is="copied ? Check : Copy" class="w-4 h-4" aria-hidden="true" />
    <span>{{ copied ? '已复制' : label }}</span>
  </button>
</template>
