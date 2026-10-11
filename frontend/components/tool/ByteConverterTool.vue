<script setup lang="ts">
/**
 * ByteConverterTool.vue - 字节单位换算器
 *
 * 支持 bit、B、KB、MB、GB、TB 等存储单位互转，
 * 可切换 1024（二进制）与 1000（十进制）两种进率口径；浏览器本地计算不上传。
 */
import { Copy, Database, Download, Info, RefreshCw, Trash2 } from 'lucide-vue-next'
import {
  convertUnitValue,
  formatConvertValue,
  parseConvertInput,
  type DecimalMode,
  type OutputStyle,
} from '~/utils/convert/convertCore'

useHead({
  titleTemplate: null,
  title: '字节单位换算器 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线字节单位换算工具，支持 bit、B、KB、MB、GB、TB 六种单位互转，可切换 1024（二进制）与 1000（十进制）两种进率口径，浏览器本地计算不上传，免登录打开即用。' },
    { name: 'keywords', content: '字节换算,存储单位,容量换算,KB,MB,GB,TB,bit,进率,单位换算' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'byte-converter')
const { reportEvent } = useAnalytics()

interface UnitDef {
  name: string
  symbol: string
  /** 1 该单位等于多少字节 */
  toBase: number
}

/** 二进制（1024 进率）单位，基准为字节 */
const binUnits: UnitDef[] = [
  { name: '比特', symbol: 'bit', toBase: 0.125 },
  { name: '字节', symbol: 'B', toBase: 1 },
  { name: '千字节', symbol: 'KB', toBase: 1024 },
  { name: '兆字节', symbol: 'MB', toBase: 1024 ** 2 },
  { name: '千兆字节', symbol: 'GB', toBase: 1024 ** 3 },
  { name: '太字节', symbol: 'TB', toBase: 1024 ** 4 },
  { name: '拍字节', symbol: 'PB', toBase: 1024 ** 5 },
]

/** 十进制（1000 进率，SI）单位，名称加后缀避免与二进制单位重名 */
const decUnits: UnitDef[] = [
  { name: '字节（十进制）', symbol: 'B', toBase: 1 },
  { name: '千字节（十进制）', symbol: 'kB', toBase: 1000 },
  { name: '兆字节（十进制）', symbol: 'MB', toBase: 1e6 },
  { name: '千兆字节（十进制）', symbol: 'GB', toBase: 1e9 },
  { name: '太字节（十进制）', symbol: 'TB', toBase: 1e12 },
  { name: '拍字节（十进制）', symbol: 'PB', toBase: 1e15 },
]

const allUnits = [...binUnits, ...decUnits]
function findUnit(name: string): UnitDef {
  const u = allUnits.find((x) => x.name === name)
  return u || allUnits[4]
}

const sourceUnit = ref('千兆字节')
const rawValue = ref('1')
const decimals = ref<DecimalMode>('auto')
const outputStyle = ref<OutputStyle>('thousand')

/** 进率口径：1024（二进制）/ 1000（十进制）/ 同时显示两列 */
const radix = ref<'bin' | 'dec' | 'both'>('bin')
const groups = computed<{ title: string; units: UnitDef[] }[]>(() => {
  if (radix.value === 'bin') return [{ title: '二进制（1024 进率）', units: binUnits }]
  if (radix.value === 'dec') return [{ title: '十进制（1000 进率）', units: decUnits }]
  return [
    { title: '二进制（1024 进率）', units: binUnits },
    { title: '十进制（1000 进率）', units: decUnits },
  ]
})

// 切换口径后若当前源单位不在新单位列表中，回落到对应口径的千兆字节
watch(radix, () => {
  const names = groups.value.flatMap((g) => g.units.map((u) => u.name))
  if (!names.includes(sourceUnit.value)) {
    sourceUnit.value = radix.value === 'dec' ? '千兆字节（十进制）' : '千兆字节'
  }
})

const parsed = computed(() => parseConvertInput(rawValue.value))

function convertDisplay(unit: UnitDef): string {
  const src = findUnit(sourceUnit.value)
  if (!unit || !src) return ''
  if (parsed.value === null) return ''
  return formatConvertValue(convertUnitValue(src, unit, parsed.value), decimals.value, outputStyle.value)
}

/** 展示单位（大数值结果与等式），按设计稿等式行顺序 */
const showcaseUnits = ['兆字节', '千字节', '字节', '比特']
const showcase = computed(() =>
  showcaseUnits.map((name) => {
    const unit = findUnit(name)
    const v = parsed.value === null ? null : convertUnitValue(findUnit(sourceUnit.value), unit, parsed.value)
    return {
      name: unit.name,
      symbol: unit.symbol,
      value: v === null ? '—' : formatConvertValue(v, decimals.value, outputStyle.value),
    }
  }),
)

const radixLabel = computed(() =>
  radix.value === 'bin' ? '1024（二进制）' : radix.value === 'dec' ? '1000（十进制）' : '双口径同时显示',
)

const tipText = computed(() => {
  const src = findUnit(sourceUnit.value)
  return `当前输入单位为 ${src.name}(${src.symbol})，值 ${rawValue.value || '0'}，进率口径为 ${radixLabel.value}。`
})

/** 当前展示的全部单位（复制/导出用） */
const currentUnits = computed(() => groups.value.flatMap((g) => g.units))

/** 换算对照知识行（与设计稿一致，二进制口径） */
const eqRows: { k: string; v: string }[] = [
  { k: '1 字节(B)', v: '8 比特(bit)' },
  { k: '1 千字节(KB)', v: '1,024 字节(B) = 2^10 B' },
  { k: '1 兆字节(MB)', v: '1,024 KB = 2^20 B = 1,048,576 B' },
  { k: '1 千兆字节(GB)', v: '1,024 MB = 2^30 B = 1,073,741,824 B' },
  { k: '1 太字节(TB)', v: '1,024 GB = 2^40 B = 1,099,511,627,776 B' },
  { k: '1 拍字节(PB)', v: '1,024 TB = 2^50 B' },
  { k: '标称 1 TB 硬盘', v: '系统显示约 931 GB（按 1024 口径）' },
  { k: '标称 500 GB 硬盘', v: '系统显示约 465 GB' },
  { k: '100 Mbps 宽带', v: '理论下载约 12.5 MB/s' },
  { k: '1 GB 文件在 100 Mbps 下', v: '理论约 81.9 秒传完' },
]
const hlIndex = 2

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
  const lines = currentUnits.value.map((u) => `${u.name}(${u.symbol})\t${convertDisplay(u)}`)
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
    `字节单位换算结果（源：${src.name} ${src.symbol}，值：${rawValue.value}，进率口径：${radixLabel.value}）`,
    ...currentUnits.value.map((u) => `${u.name}(${u.symbol}) = ${convertDisplay(u)}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `byte-converter-${Date.now()}.txt`
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
          <Database class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
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
          系统按 1024 进率显示容量，硬盘厂商按 1000 进率标称，这就是「1TB 硬盘只有 931GB」的原因，可在下方切换进率口径对比。
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
        <Database class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">换算设置</h2>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">进率口径</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['bin', '1024（二进制 KiB）'], ['dec', '1000（十进制 SI）'], ['both', '同时显示两列']] as ['bin' | 'dec' | 'both', string][])"
              :key="opt[0]"
              type="button"
              class="pz-mode-btn"
              :data-active="radix === opt[0]"
              @click="radix = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">小数位数</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['auto', '自动'], [2, '2 位'], [4, '4 位'], [8, '8 位']] as [DecimalMode, string][])"
              :key="String(opt[0])"
              type="button"
              class="pz-mode-btn"
              :data-active="decimals === opt[0]"
              @click="decimals = opt[0]"
            >
              {{ opt[1] }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">输出格式</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in ([['plain', '普通数字'], ['scientific', '科学计数法'], ['thousand', '千分位分隔']] as [OutputStyle, string][])"
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
        <span class="pz-bignum-unit">{{ showcase[0]?.name }}({{ showcase[0]?.symbol }})</span>
        <span class="pz-bignum-eq">
          {{ rawValue || '0' }} {{ sourceUnit }}({{ findUnit(sourceUnit).symbol }}) =
          {{ showcase.map((s) => `${s.value} ${s.name}(${s.symbol})`).join(' = ') }}
        </span>
      </div>
      <div class="text-xs font-semibold mb-2 mt-1" style="color: var(--pz-color-text-secondary)">
        1 GB 等于
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
/* 字节页输入框加宽（默认固定 9.5rem → 弹性填满行内剩余空间，所有行右端对齐），高度不变 */
:deep(.pz-ulab) {
  flex: 0 0 7.5rem;
}
:deep(.pz-urow input.pz-uinput) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
/* 字节页：分组内单位行两列排布（标题横跨两列），窄屏保持单列 */
@media (min-width: 768px) {
  :deep(.pz-ugrid) {
    grid-template-columns: 1fr;
  }
  :deep(.pz-ugrid .pz-usec) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem 1rem;
  }
  :deep(.pz-ugrid .pz-usec-title) {
    grid-column: 1 / -1;
  }
}
</style>
