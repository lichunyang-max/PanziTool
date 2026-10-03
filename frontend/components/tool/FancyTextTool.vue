<script setup lang="ts">
/**
 * FancyTextTool.vue - 花体英文转换器
 *
 * 14 种 Unicode 花体样式实时转换，点击任一行复制。
 */
import { Check, Copy, Sparkles, Trash2 } from 'lucide-vue-next'
import { FANCY_STYLES } from '~/utils/tools/text/fancyText'
import { copyToClipboard } from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: '花体英文转换器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线花体英文转换器，提供双线体、手写体、哥特体、圆圈字、全角体、倒置体等14种Unicode花体样式，网名个性签名一键生成，点击即复制。' },
    { name: 'keywords', content: '花体英文,英文花体字,特殊字体,哥特体,个性签名,Unicode字体' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'fancy-text')

const MAX = 500
const text = ref('Hello World')
const copiedKey = ref('')

const results = computed(() =>
  FANCY_STYLES.map((style) => ({ key: style.key, name: style.name, value: style.transform(text.value) })),
)

async function copyRow(key: string, value: string) {
  if (!value) return
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(value)
  if (ok) {
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = ''
    }, 1200)
  }
}
function clearText() {
  text.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="fancy-input">输入英文</label>
        <span class="text-xs" style="color: var(--pz-color-text-tertiary)">{{ Array.from(text).length }}/{{ MAX }}</span>
      </div>
      <div class="relative">
        <input
          id="fancy-input"
          v-model="text"
          type="text"
          class="pz-input w-full"
          maxlength="500"
          placeholder="输入英文、数字（中文与标点原样保留）"
        >
        <button
          v-if="text"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1"
          style="color: var(--pz-color-text-tertiary)"
          aria-label="清空"
          @click="clearText"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <p class="text-xs flex items-center gap-1" style="color: var(--pz-color-text-tertiary)">
        <Sparkles class="w-3.5 h-3.5" aria-hidden="true" />
        共 {{ FANCY_STYLES.length }} 种样式，点击任意一行即可复制
      </p>
    </div>

    <div class="pz-card p-4 flex flex-col gap-2">
      <button
        v-for="r in results"
        :key="r.key"
        type="button"
        class="flex items-center justify-between gap-3 w-full text-left p-3 rounded-md transition-colors"
        style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border); min-height: 48px"
        @click="copyRow(r.key, r.value)"
      >
        <span class="flex flex-col min-w-0">
          <span class="text-xs mb-0.5" style="color: var(--pz-color-text-tertiary)">{{ r.name }}</span>
          <span class="text-lg truncate" style="color: var(--pz-color-text-primary)">{{ r.value || '—' }}</span>
        </span>
        <component
          :is="copiedKey === r.key ? Check : Copy"
          class="w-4 h-4 shrink-0"
          :style="{ color: copiedKey === r.key ? 'var(--pz-color-primary)' : 'var(--pz-color-text-tertiary)' }"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>
