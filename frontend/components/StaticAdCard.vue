<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
}

const props = defineProps<Props>()

const isHidden = ref(false)

const closeKey = `ad_hidden_${props.id}`

onMounted(() => {
  if (typeof window !== 'undefined') {
    const hidden = sessionStorage.getItem(closeKey)
    isHidden.value = hidden === 'true'
  }
})

function handleClose() {
  isHidden.value = true
  sessionStorage.setItem(closeKey, 'true')
}
</script>

<template>
  <div v-if="!isHidden" class="static-ad-card p-4 border border-gray-200 rounded-lg bg-white overflow-hidden relative">
    <a :href="linkUrl" target="_blank" rel="noopener noreferrer" class="flex items-center gap-4">
      <img :src="imageUrl" alt="广告图片" class="w-24 h-20 object-cover rounded" />
      <div class="flex-1">
        <h3 class="font-medium text-gray-900 text-sm">{{ title }}</h3>
        <div class="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            <line x1="12" y1="22" x2="12" y2="15.5" />
            <line x1="22" y1="8.5" x2="12" y2="15.5" />
            <line x1="2" y1="8.5" x2="12" y2="15.5" />
            <line x1="2" y1="15.5" x2="12" y2="15.5" />
            <line x1="22" y1="15.5" x2="12" y2="15.5" />
          </svg>
          <span>广告</span>
        </div>
      </div>
    </a>
    <button
      @click="handleClose"
      class="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
      aria-label="关闭广告"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.static-ad-card:hover {
  border-color: var(--pz-color-primary);
}
</style>