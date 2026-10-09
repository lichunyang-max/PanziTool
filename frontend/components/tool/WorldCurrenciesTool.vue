<script setup lang="ts">
/**
 * WorldCurrenciesTool.vue - 世界各国地区货币速查表
 *
 * 搜索 + 表格展示，点击复制。
 */
import { Search, Copy, Check } from 'lucide-vue-next'
import { WORLD_CURRENCIES } from '~/utils/tools/finance/financeCore'

useHead({
  titleTemplate: null,
  title: '世界各国地区货币一览表 | 盘子工具站',
  meta: [
    { name: 'description', content: '世界各国地区货币速查表，收录 130 余种货币的 ISO 标准代码、中英文名称、国家/地区、货币符号与辅币进位制，支持按代码、中英文名称、国家/地区搜索，点击即复制。' },
    { name: 'keywords', content: '世界货币,货币代码,ISO货币,各国货币,货币符号' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'world-currencies')
const { reportEvent } = useAnalytics()

const keyword = ref('')

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return WORLD_CURRENCIES
  return WORLD_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(k) ||
      c.name.toLowerCase().includes(k) ||
      c.nameEn.toLowerCase().includes(k) ||
      c.country.toLowerCase().includes(k),
  )
})

let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(keyword, () => {
  if (useReported) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})

const copied = ref('')
function copy(text: string, key: string) {
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => (copied.value = ''), 1500)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="pz-card p-4 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <Search class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">世界货币速查表</h2>
      </div>
      <input v-model="keyword" type="text" class="pz-input" placeholder="搜索货币代码、中英文名称或国家/地区，如 USD、美元、Euro、美国" />
      <p class="text-xs" style="color: var(--pz-color-text-tertiary)">共 {{ filtered.length }} 种货币，点击任一单元格可复制内容。</p>
    </div>

    <div class="pz-card p-4">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="border-bottom: 2px solid var(--pz-color-border)">
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">代码</th>
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">货币名称</th>
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">英文名称</th>
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">国家/地区</th>
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">符号</th>
              <th class="text-left py-2 px-2 font-semibold" style="color: var(--pz-color-text-secondary)">辅币进位制</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in filtered"
              :key="c.code + c.country"
              style="border-bottom: 1px solid var(--pz-color-border)"
              class="hover:bg-[var(--pz-color-bg-secondary)]"
            >
              <td class="py-2 px-2">
                <button class="group flex items-center gap-1" style="font-family: var(--pz-font-mono); color: var(--pz-color-primary)" @click="copy(c.code, c.code + c.country)">
                  {{ c.code }}
                  <component :is="copied === c.code + c.country ? Check : Copy" class="w-3 h-3 opacity-0 group-hover:opacity-100" aria-hidden="true" />
                </button>
              </td>
              <td class="py-2 px-2" style="color: var(--pz-color-text-primary)">{{ c.name }}</td>
              <td class="py-2 px-2" style="color: var(--pz-color-text-secondary)">{{ c.nameEn }}</td>
              <td class="py-2 px-2" style="color: var(--pz-color-text-secondary)">{{ c.country }}</td>
              <td class="py-2 px-2" style="font-family: var(--pz-font-mono)">{{ c.symbol }}</td>
              <td class="py-2 px-2 whitespace-nowrap" style="color: var(--pz-color-text-tertiary)">{{ c.subunit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
