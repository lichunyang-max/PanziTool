<script setup lang="ts">
/**
 * SpecialSymbolsTool.vue - 特殊符号大全
 *
 * 分类浏览 + 名称/符号搜索，点击符号一键复制。
 */
import { Check, Copy, Search, Sigma } from 'lucide-vue-next'
import {
  SYMBOL_CATEGORIES,
  getSymbolName,
} from '~/utils/tools/text/specialSymbols'
import { copyToClipboard } from '~/utils/tools/text/textCore'

useHead({
  titleTemplate: null,
  title: '特殊符号大全 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线特殊符号大全，收录数学符号、箭头、标点、图形、货币、希腊字母、上标下标等约350个常用Unicode符号，点击即复制，可用于昵称、文案与论文。' },
    { name: 'keywords', content: '特殊符号,符号大全,数学符号,箭头符号,希腊字母,标点符号,昵称符号' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'special-symbols')

const keyword = ref('')
const activeCategory = ref(SYMBOL_CATEGORIES[0]!.key)
const copiedSymbol = ref('')
const total = SYMBOL_CATEGORIES.reduce((sum, c) => sum + c.symbols.length, 0)

interface Row {
  symbol: string
  name: string
}

const rows = computed<Row[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    const result: Row[] = []
    for (const c of SYMBOL_CATEGORIES) {
      for (const s of c.symbols) {
        const name = getSymbolName(s, c.label)
        if (s.includes(kw) || name.toLowerCase().includes(kw) || c.label.toLowerCase().includes(kw)) {
          result.push({ symbol: s, name })
        }
      }
    }
    return result
  }
  const c = SYMBOL_CATEGORIES.find((x) => x.key === activeCategory.value)
  return c ? c.symbols.map((s) => ({ symbol: s, name: getSymbolName(s, c.label) })) : []
})

async function copySymbol(symbol: string) {
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(symbol)
  if (ok) {
    copiedSymbol.value = symbol
    setTimeout(() => {
      if (copiedSymbol.value === symbol) copiedSymbol.value = ''
    }, 1000)
  }
}

</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Sigma class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">特殊符号库</h2>
        <span class="text-xs" style="color: var(--pz-color-text-tertiary)">共 {{ total }} 个 · 点击复制</span>
      </div>
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--pz-color-text-tertiary)" aria-hidden="true" />
        <input v-model="keyword" type="text" class="pz-input" style="padding-left: 2.25rem" placeholder="搜索符号或名称，如：箭头、大于、欧元、贝塔..." >
      </div>
      <div v-if="!keyword" class="pz-mode-toggle flex-wrap">
        <button
          v-for="c in SYMBOL_CATEGORIES"
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
          v-for="(r, i) in rows"
          :key="r.symbol + i"
          type="button"
          class="aspect-square flex items-center justify-center rounded-md text-xl transition-colors relative group"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border); min-height: 44px"
          :title="r.name"
          @click="copySymbol(r.symbol)"
        >
          <span>{{ r.symbol }}</span>
          <span
            v-if="copiedSymbol === r.symbol"
            class="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center"
            style="background: var(--pz-color-primary); color: #fff"
          >
            <Check class="w-3 h-3" aria-hidden="true" />
          </span>
        </button>
      </div>
      <div v-else class="text-center py-10 text-sm" style="color: var(--pz-color-text-tertiary)">
        <Copy class="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
        没有找到匹配的符号
      </div>
      <p class="text-xs mt-4" style="color: var(--pz-color-text-tertiary)">
        符号均为 Unicode 字符，可直接用于 Word、网页与聊天工具；若显示为方框，说明当前字体不支持该符号。
      </p>
    </div>
  </div>
</template>
