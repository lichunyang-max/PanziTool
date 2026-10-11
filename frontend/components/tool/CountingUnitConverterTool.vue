<script setup lang="ts">
/**
 * CountingUnitConverterTool.vue - 英文计数单位换算
 *
 * 支持 K（千）、M（百万）、B（十亿）、T（万亿）与纯数字、中文读数互转，
 * 一键把 1.5M、2.3B 这类缩写还原成精确数字；浏览器本地计算不上传。
 */
import { Copy, Download, Hash, Info, RefreshCw, Trash2 } from 'lucide-vue-next'
import {
  convertUnitValue,
  formatConvertValue,
  parseConvertInput,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '英文计数单位换算 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线英文计数单位换算工具，支持 K（千）、M（百万）、B（十亿）、T（万亿）与纯数字、中文读数互转，一键把 1.5M、2.3B 这类缩写还原成精确数字，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '英文计数单位,K,M,B,T,千,百万,十亿,万亿,中文读数,万,亿,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'counting-unit-converter')
const { reportEvent } = useAnalytics()

interface UnitDef {
  name: string
  symbol: string
  /** 1 该单位等于多少（纯数字个数） */
  toBase: number
}

/** 缩写单位（基准为纯数字个数），K 的系数随「K 的含义」设置动态计算 */
const abbrUnits: UnitDef[] = [
  { name: 'K', symbol: '千 / Thousand', toBase: 1000 },
  { name: 'M', symbol: '百万 / Million', toBase: 1e6 },
  { name: 'B', symbol: '十亿 / Billion', toBase: 1e9 },
  { name: 'T', symbol: '万亿 / Trillion', toBase: 1e12 },
]

/** 完整数值单位 */
const fullUnits: UnitDef[] = [
  { name: '纯数字', symbol: 'plain', toBase: 1 },
  { name: '中文读数', symbol: '中文', toBase: 1 },
]

const allUnits = [...abbrUnits, ...fullUnits]
function findUnit(name: string): UnitDef {
  const u = allUnits.find((x) => x.name === name)
  return u || allUnits[1]
}

const sourceUnit = ref('M')
const rawValue = ref('1.5')
const outputStyle = ref<OutputStyle>('thousand')

/** K 的含义：计数口径 1000（默认）/ 二进制口径 1024 */
const kBase = ref<1000 | 1024>(1000)
const groups = computed<{ title: string; units: UnitDef[] }[]>(() => [
  {
    title: '缩写单位',
    units: abbrUnits.map((u) => (u.name === 'K' ? { ...u, toBase: kBase.value } : u)),
  },
  { title: '完整数值', units: fullUnits },
])

/** 中文读数模式：万/亿（默认）/ 纯万进制 / 不转换 */
const chineseMode = ref<'wanYi' | 'wanOnly' | 'off'>('wanYi')

const parsed = computed(() => parseConvertInput(rawValue.value))

/** 中文读数文本（万/亿混用、纯万进制或原样数字） */
function chineseReading(v: number): string {
  if (chineseMode.value === 'off') return formatConvertValue(v, 'auto', outputStyle.value)
  if (chineseMode.value === 'wanOnly') return `${formatConvertValue(v / 1e4, 'auto', outputStyle.value)}万`
  const abs = Math.abs(v)
  if (abs >= 1e8) return `${formatConvertValue(v / 1e8, 'auto', outputStyle.value)}亿`
  if (abs >= 1e4) return `${formatConvertValue(v / 1e4, 'auto', outputStyle.value)}万`
  return formatConvertValue(v, 'auto', outputStyle.value)
}

/** 整数转中文汉字读数（如 1500000 → 一百五十万），非整数或超范围退回数值式读法 */
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const CN_SMALL = ['千', '百', '十', '']
const CN_SECTIONS = ['', '万', '亿', '万亿']
function fourDigitToCn(num: number): string {
  const d = [Math.floor(num / 1000) % 10, Math.floor(num / 100) % 10, Math.floor(num / 10) % 10, num % 10]
  let s = ''
  let pendingZero = false
  d.forEach((digit, i) => {
    if (digit === 0) {
      if (s) pendingZero = true
      return
    }
    if (pendingZero) {
      s += '零'
      pendingZero = false
    }
    // 10~19 读作「十X」而非「一十X」
    if (i === 2 && digit === 1 && !s) {
      s += '十'
      return
    }
    s += CN_DIGITS[digit] + CN_SMALL[i]
  })
  return s
}
function chineseChars(v: number): string {
  if (!isFinite(v)) return '—'
  if (!Number.isInteger(v) || Math.abs(v) >= 1e16) return chineseReading(v)
  if (v === 0) return '零'
  const neg = v < 0
  let x = Math.abs(v)
  const secs: number[] = []
  while (x > 0) {
    secs.push(x % 10000)
    x = Math.floor(x / 10000)
  }
  if (secs.length > CN_SECTIONS.length) return chineseReading(v)
  let out = ''
  for (let i = secs.length - 1; i >= 0; i--) {
    const sec = secs[i]
    if (sec === 0) continue
    // 本节不足千位或上一节为零时补「零」
    if (out && (sec < 1000 || secs[i + 1] === 0) && !out.endsWith('零')) out += '零'
    out += fourDigitToCn(sec) + CN_SECTIONS[i]
  }
  return (neg ? '负' : '') + out
}

function convertDisplay(unit: UnitDef): string {
  const src = findUnit(sourceUnit.value)
  if (!unit || !src) return ''
  if (parsed.value === null) return ''
  const v = convertUnitValue(src, unit, parsed.value)
  if (unit.name === '中文读数') return chineseReading(v)
  return formatConvertValue(v, 'auto', outputStyle.value)
}

/** 展示单位（大数值结果与等式），按设计稿等式行顺序 */
const showcaseUnits = ['纯数字', '中文读数', 'K']
const showcase = computed(() =>
  showcaseUnits.map((name) => {
    const unit = findUnit(name)
    if (parsed.value === null) {
      return { name: unit.name, symbol: unit.symbol, value: '—' }
    }
    const v = convertUnitValue(findUnit(sourceUnit.value), unit, parsed.value)
    return {
      name: unit.name,
      symbol: unit.symbol,
      value: unit.name === '中文读数' ? chineseReading(v) : formatConvertValue(v, 'auto', outputStyle.value),
    }
  }),
)

/** 大数值下方括号内的中文汉字读数（如 一百五十万） */
const chineseCharsPlain = computed(() => {
  if (parsed.value === null) return '—'
  return chineseChars(convertUnitValue(findUnit(sourceUnit.value), findUnit('纯数字'), parsed.value))
})

const tipText = computed(() => {
  const src = findUnit(sourceUnit.value)
  return `当前输入单位为 ${src.name}（${src.symbol}），值 ${rawValue.value || '0'}。社交平台粉丝量、财报金额常用这类缩写。`
})

/** 换算对照知识行（与设计稿一致，默认十进制口径） */
const eqRows: { k: string; v: string }[] = [
  { k: '1 K', v: '1,000（10³）Thousand 千' },
  { k: '1 M', v: '1,000,000（10⁶）Million 百万' },
  { k: '1 B', v: '1,000,000,000（10⁹）Billion 十亿' },
  { k: '1 T', v: '1,000,000,000,000（10¹²）Trillion 万亿' },
  { k: '1 M', v: '1,000 K' },
  { k: '1 B', v: '1,000 M = 10 亿' },
  { k: '1 T', v: '1,000 B = 1 万亿' },
  { k: '1 亿（中文）', v: '100 M = 0.1 B' },
  { k: '1 万亿（中文）', v: '1 T = 1,000 B' },
  { k: '10 K', v: '1 万' },
  { k: '100 K', v: '10 万' },
  { k: '1 M', v: '100 万' },
]
const hlIndex = 1

function resetOne() {
  rawValue.value = '1'
  reportEvent('tool_use', effectiveSlug.value)
}
function clearAll() {
  rawValue.value = ''
}

// 工具使用上报：输入后 1.5s 防抖（每次会话首次触发）
let useReportTimer: ReturnType<typeof setTimeout> | null = null
let useReported = false
watch(rawValue, (v) => {
  if (useReported || !v.trim()) return
  if (useReportTimer) clearTimeout(useReportTimer)
  useReportTimer = setTimeout(() => {
    useReported = true
    reportEvent('tool_use', effectiveSlug.value)
  }, 1500)
})
onBeforeUnmount(() => {
  if (useReportTimer) clearTimeout(useReportTimer)
})

function onUnitCopy() {
  reportEvent('copy', effectiveSlug.value)
}

/** 复制全部换算结果 */
async function copyAll() {
  const lines = allUnits.map((u) => `${u.name}(${u.symbol})\t${convertDisplay(u)}`)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    reportEvent('copy', effectiveSlug.value)
  } catch {
    // 静默忽略
  }
}

/** 导出 TXT */
function exportTxt() {
  const src = findUnit(sourceUnit.value)
  const lines = [
    `英文计数单位换算结果（源：${src.name}（${src.symbol}），值：${rawValue.value}）`,
    ...allUnits.map((u) => `${u.name}(${u.symbol}) = ${convertDisplay(u)}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `counting-unit-converter-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  reportEvent('download', effectiveSlug.value)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 提示条 -->
    <div class="pz-tip">
      <span class="shrink-0" style="color: var(--pz-state-info)">
        <Info class="w-4 h-4" aria-hidden="true" />
      </span>
      <p class="text-sm" style="color: var(--pz-color-text-primary); line-height: 1.5">
        {{ tipText }}
      </p>
    </div>

    <!-- 单位换算 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <Hash class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">单位换算</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="resetOne">
            <RefreshCw class="w-3.5 h-3.5" aria-hidden="true" /> 重置为 1
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="clearAll">
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" /> 清空
          </button>
        </div>
      </div>
      <div class="pz-tip mb-4">
        <span class="shrink-0" style="color: var(--pz-state-info)">
          <Info class="w-4 h-4" aria-hidden="true" />
        </span>
        <p class="text-sm" style="color: var(--pz-color-text-primary); line-height: 1.5">
          K/M/B/T 基于十进制（10³ 递进），与计算机存储的 KB/MB（1024 进率）不是一回事，不要混用。
        </p>
      </div>
      <ToolConvertUnitGrid
        v-model:model-value="rawValue"
        v-model:source-unit="sourceUnit"
        :groups="groups"
        :convert-display="convertDisplay"
        mode="grouped"
        @copy="onUnitCopy"
      />
    </div>

    <!-- 换算设置 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <Hash class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">换算设置</h2>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">K 的含义</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([[1000, 'K = 1,000（千）'], [1024, 'K = 1,024（二进制）']] as [1000 | 1024, string][])"
              :key="opt[0]"
              type="button"
              class="pz-mode-btn"
              :data-active="kBase === opt[0]"
              @click="kBase = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">中文读数</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['wanYi', '万 / 亿'], ['wanOnly', '纯万进制'], ['off', '不转换']] as ['wanYi' | 'wanOnly' | 'off', string][])"
              :key="opt[0]"
              type="button"
              class="pz-mode-btn"
              :data-active="chineseMode === opt[0]"
              @click="chineseMode = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出格式</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['thousand', '千分位分隔'], ['plain', '纯数字'], ['scientific', '科学计数法']] as [OutputStyle, string][])"
              :key="opt[0]"
              type="button"
              class="pz-mode-btn"
              :data-active="outputStyle === opt[0]"
              @click="outputStyle = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 换算对照 -->
    <div class="pz-card p-4">
      <div class="pz-card-head">
        <div class="flex items-center gap-2">
          <RefreshCw class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
          <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">换算对照</h2>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="copyAll">
            <Copy class="w-3.5 h-3.5" aria-hidden="true" /> 复制全部
          </button>
          <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: .25rem .75rem" @click="exportTxt">
            <Download class="w-3.5 h-3.5" aria-hidden="true" /> 导出 TXT
          </button>
        </div>
      </div>
      <div class="pz-bignum mb-4">
        <span class="pz-bignum-val">{{ showcase[0]?.value }}</span>
        <span class="pz-bignum-unit">（{{ chineseCharsPlain }}）</span>
        <span class="pz-bignum-eq">
          {{ rawValue || '0' }} {{ sourceUnit }} =
          {{ showcase.map((s) => s.value).join(' = ') }}
        </span>
      </div>
      <div class="text-xs font-semibold mb-2 mt-1" style="color: var(--pz-color-text-secondary)">
        缩写对照
      </div>
      <div class="pz-eq">
        <div v-for="(row, idx) in eqRows" :key="row.k + idx" class="pz-eq-row" :data-hl="idx === hlIndex">
          <span class="pz-eq-k">{{ row.k }}</span>
          <span class="pz-eq-v">{{ row.v }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 计数页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
