<script setup lang="ts">
/**
 * EmojiPickerTool.vue - Emoji 表情大全
 *
 * 分类浏览 + 中文名搜索，点击 Emoji 一键复制。
 */
import { Check, Search, Smile } from 'lucide-vue-next'
import { EMOJI_CATEGORIES, type EmojiItem } from '~/utils/tools/text/emojiData'
import { copyToClipboard } from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: 'Emoji表情大全 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线Emoji表情大全，收录表情、人物、手势、动物、植物、饮食、运动、旅行、国旗等约350个常用表情，中文名搜索，点击即复制。' },
    { name: 'keywords', content: 'emoji,表情大全,表情符号,表情复制,可爱表情,emoji中文' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'emoji-picker')

const keyword = ref('')
const activeCategory = ref(EMOJI_CATEGORIES[0]!.key)
const copiedEmoji = ref('')
const total = EMOJI_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0)

const rows = computed<EmojiItem[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    return EMOJI_CATEGORIES.flatMap((c) => c.items).filter(
      (it) => it.n.toLowerCase().includes(kw) || it.e.includes(kw),
    )
  }
  return EMOJI_CATEGORIES.find((c) => c.key === activeCategory.value)?.items || []
})

async function copyEmoji(emoji: string) {
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(emoji)
  if (ok) {
    copiedEmoji.value = emoji
    setTimeout(() => {
      if (copiedEmoji.value === emoji) copiedEmoji.value = ''
    }, 1000)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Smile class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">Emoji 库</h2>
        <span class="text-xs" style="color: var(--pz-color-text-tertiary)">共 {{ total }} 个 · 点击复制</span>
      </div>
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--pz-color-text-tertiary)" aria-hidden="true" />
        <input v-model="keyword" type="text" class="pz-input" style="padding-left: 2.25rem" placeholder="输入名称，如：笑、心、猫、火..." >
      </div>
      <div v-if="!keyword" class="pz-mode-toggle flex-wrap">
        <button
          v-for="c in EMOJI_CATEGORIES"
          :key="c.key"
          type="button"
          class="pz-mode-btn"
          :data-active="activeCategory === c.key"
          @click="activeCategory = c.key"
        >{{ c.label }}</button>
      </div>
    </div>

    <div class="pz-card p-4">
      <div v-if="rows.length" class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
        <button
          v-for="(it, i) in rows"
          :key="it.e + i"
          type="button"
          class="aspect-square flex items-center justify-center rounded-md text-2xl transition-colors relative hover:scale-110"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border); min-height: 44px"
          :title="it.n"
          @click="copyEmoji(it.e)"
        >
          <span>{{ it.e }}</span>
          <span
            v-if="copiedEmoji === it.e"
            class="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center"
            style="background: var(--pz-color-primary); color: #fff"
          >
            <Check class="w-3 h-3" aria-hidden="true" />
          </span>
        </button>
      </div>
      <div v-else class="text-center py-10 text-sm" style="color: var(--pz-color-text-tertiary)">
        <Smile class="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
        没有找到匹配的表情
      </div>
      <p class="text-xs mt-4" style="color: var(--pz-color-text-tertiary)">
        Emoji 在不同系统与平台上的显示样式略有差异，复制前可先在本页确认渲染效果。
      </p>
    </div>
  </div>
</template>
