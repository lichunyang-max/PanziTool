<script setup lang="ts">
/**
 * ToolIcon.vue - 工具卡片图标组件
 *
 * 根据工具 slug 渲染对应的差异化 SVG 图标，与首页热门工具卡片图标保持一致。
 * 未匹配的 slug 渲染默认地球图标。
 */
defineProps<{
  slug: string
}>()

const toolIconMap: Record<string, string> = {
  'json-formatter': 'json',
  'regex-tester': 'search',
  timestamp: 'clock',
  'url-encode': 'link',
  'jwt-decoder': 'key',
  base64: 'code',
  hash: 'hash',
  'image-compress': 'image',
  'image-crop': 'crop',
  'image-convert': 'convert',
}
</script>

<template>
  <svg
    v-if="toolIconMap[slug] === 'json'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/>
    <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'search'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'clock'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'link'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'key'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="m21 2-9.6 9.6"/>
    <path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'code'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'hash'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <line x1="4" x2="20" y1="9" y2="9"/>
    <line x1="4" x2="20" y1="15" y2="15"/>
    <line x1="10" x2="8" y1="3" y2="21"/>
    <line x1="16" x2="14" y1="3" y2="21"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'image'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
  <svg
    v-else
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" x2="22" y1="12" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
</template>
