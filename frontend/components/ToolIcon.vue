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
  'qr-code': 'qr',
  'id-photo': 'id',
  // 第二批开发者工具
  'hex-encode': 'binary',
  'unicode-convert': 'type',
  'base-convert': 'calculator',
  'image-base64': 'image',
  'xml-formatter': 'braces',
  'yaml-formatter': 'file',
  'csv-json-convert': 'table',
  'uuid-generator': 'fingerprint',
  'mock-data': 'database',
  'string-toolkit': 'type',
  'color-converter': 'palette',
  'html-escape': 'code',
  'js-css-beautify': 'wand',
  'timezone-calculator': 'clock',
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
    v-else-if="toolIconMap[slug] === 'binary'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2"/>
    <path d="M9 8v8M15 8v8M9 12h6"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'type'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" x2="15" y1="20" y2="20"/>
    <line x1="12" x2="12" y1="4" y2="20"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'calculator'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <rect width="16" height="20" x="4" y="2" rx="2"/>
    <line x1="8" x2="16" y1="6" y2="6"/>
    <line x1="8" x2="8" y1="14" y2="14"/>
    <line x1="12" x2="12" y1="14" y2="14"/>
    <line x1="16" x2="16" y1="14" y2="14"/>
    <line x1="8" x2="8" y1="18" y2="18"/>
    <line x1="12" x2="12" y1="18" y2="18"/>
    <line x1="16" x2="13" y1="18" y2="18"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'braces'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/>
    <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'file'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v5h5"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'table'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <rect width="18" height="18" x="3" y="3" rx="2"/>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'fingerprint'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
    <path d="M5 19.5C5.5 18 6 14 6 12a6 6 0 0 1 .34-2"/>
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.32-.5 4"/>
    <path d="M8 20a2 2 0 0 0-2-2v-2a4 4 0 0 1 .5-2"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'database'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14a9 3 0 0 0 18 0V5"/>
    <path d="M3 12a9 3 0 0 0 18 0"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'palette'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
  <svg
    v-else-if="toolIconMap[slug] === 'wand'"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="color: var(--pz-color-primary)" aria-hidden="true"
  >
    <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>
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
