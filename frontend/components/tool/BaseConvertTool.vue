<script setup lang="ts">
/**
 * BaseConvertTool.vue - 进制转换工具组件
 *
 * 严格参照 ui/pages/base-convert.html 的交互区结构：
 * 1. 输入区：数字输入 + 源进制 radio（2 / 8 / 10 / 16）+ 操作按钮（转换/清空）
 * 2. 输出区：四种进制结果（2 / 8 / 10 / 16），每行可复制
 * 3. 进制对照表（前 16 个十进制数）
 *
 * 使用 BigInt 精确转换，支持任意大数。
 */
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
import {
  convertBase,
  RADIX_NAMES,
  RADICES,
  type Radix,
} from '~/utils/tools/baseConvert'

useHead({
  titleTemplate: null,
  title: '进制转换 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线进制转换工具，支持 2/8/10/16 进制互转，使用 BigInt 精确处理任意大数，兼容十六进制 0x 前缀，附前 16 个数的进制对照表，免登录打开即用，本地处理保障数据安全。',
    },
    {
      name: 'keywords',
      content: '进制转换,二进制,八进制,十进制,十六进制,BigInt',
    },
    {
      property: 'og:title',
      content: '进制转换 | 盘子工具站',
    },
    {
      property: 'og:description',
      content: '免费在线进制转换工具，支持 2/8/10/16 进制互转，使用 BigInt 精确处理任意大数，兼容十六进制 0x 前缀，附前 16 个数的进制对照表，免登录打开即用，本地处理保障数据安全。',
    },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })

const { reportEvent } = useAnalytics()
const route = useRoute()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'base-convert',
)

// 预填充示例：255（十进制）→ 各进制
const SAMPLE_INPUT = '255'
const SAMPLE_RESULT = convertBase(SAMPLE_INPUT, 10)

const input = ref(SAMPLE_INPUT)
const fromRadix = ref<Radix>(10)
const outputs = ref<Record<Radix, string>>(
  SAMPLE_RESULT.success && SAMPLE_RESULT.outputs
    ? SAMPLE_RESULT.outputs
    : { 2: '11111111', 8: '377', 10: '255', 16: 'FF' },
)
const errorMsg = ref('')
const copiedRadix = ref<Radix | null>(null)

const inputPlaceholder = computed(
  () => `输入 ${RADIX_NAMES[fromRadix.value]} 数字，如 255 或 0xFF`,
)

// 对照表（前 16 个十进制数）
const refTable: ReadonlyArray<{ dec: number; bin: string; oct: string; hex: string }> = Array.from(
  { length: 16 },
  (_, i) => ({
    dec: i,
    bin: i.toString(2).padStart(4, '0'),
    oct: i.toString(8),
    hex: i.toString(16).toUpperCase(),
  }),
)

function setRadix(r: Radix) {
  fromRadix.value = r
}

function doConvert() {
  errorMsg.value = ''
  if (input.value.trim() === '') {
    outputs.value = { 2: '-', 8: '-', 10: '-', 16: '-' }
    return
  }
  reportEvent('tool_use', effectiveSlug.value)

  const result = convertBase(input.value, fromRadix.value)
  if (result.success && result.outputs) {
    outputs.value = result.outputs
  } else {
    outputs.value = { 2: '-', 8: '-', 10: '-', 16: '-' }
    errorMsg.value = result.error ?? '转换失败'
  }
}

function doClear() {
  input.value = ''
  outputs.value = { 2: '-', 8: '-', 10: '-', 16: '-' }
  errorMsg.value = ''
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (import.meta.server) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 降级
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

async function doCopyRadix(r: Radix) {
  const text = outputs.value[r]
  if (!text || text === '-') return
  reportEvent('copy', effectiveSlug.value)
  const ok = await copyToClipboard(text)
  if (ok) {
    copiedRadix.value = r
    setTimeout(() => {
      copiedRadix.value = null
    }, 1500)
  }
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    doConvert()
  }
}
</script>

<template>
  <div>
    <!-- 1. 输入区 -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-3">
      <div class="flex flex-col gap-2">
        <label
          class="text-xs font-semibold"
          style="color: var(--pz-color-text-secondary)"
          for="pz-base-input"
        >
          输入数字
        </label>
        <input
          id="pz-base-input"
          v-model="input"
          type="text"
          class="pz-input"
          style="font-family: var(--pz-font-mono); min-height: 2.75rem"
          :placeholder="inputPlaceholder"
          @keydown="onInputKeydown"
        />
      </div>

      <div class="flex flex-col gap-2">
        <div
          class="text-xs font-semibold"
          style="color: var(--pz-color-text-secondary)"
        >
          源进制
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="r in RADICES"
            :key="r"
            type="button"
            class="pz-mode-btn"
            :data-active="fromRadix === r ? 'true' : undefined"
            :aria-selected="fromRadix === r"
            @click="setRadix(r)"
          >
            {{ RADIX_NAMES[r] }}（{{ r }}）
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          @click="doConvert"
        >
          <RefreshCw class="w-4 h-4" aria-hidden="true" />
          转换
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="doClear"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          清空
        </button>
      </div>

      <div
        v-if="errorMsg"
        class="pz-error-text flex items-start gap-2"
        role="alert"
      >
        <AlertCircle
          class="w-4 h-4 shrink-0 mt-0.5"
          style="color: var(--pz-state-error)"
          aria-hidden="true"
        />
        <span>{{ errorMsg }}</span>
      </div>
    </div>

    <!-- 2. 输出区：四种进制结果 -->
    <div class="pz-card p-4 mb-6">
      <h2
        class="text-base font-semibold mb-3"
        style="color: var(--pz-color-text-primary)"
      >
        转换结果
      </h2>
      <div class="flex flex-col gap-2">
        <div
          v-for="r in RADICES"
          :key="r"
          class="flex items-center gap-3 p-3 rounded-md"
          style="background: var(--pz-color-bg-secondary); border: 1px solid var(--pz-color-border)"
        >
          <span
            class="text-xs font-semibold shrink-0"
            style="color: var(--pz-color-text-secondary); min-width: 4.5rem"
          >
            {{ RADIX_NAMES[r] }}（{{ r }}）
          </span>
          <code
            class="flex-1 break-all"
            style="font-family: var(--pz-font-mono); font-size: var(--pz-text-sm); color: var(--pz-color-text-primary)"
          >{{ outputs[r] }}</code>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap shrink-0"
            style="padding: 0.25rem 0.75rem"
            :disabled="!outputs[r] || outputs[r] === '-'"
            @click="doCopyRadix(r)"
          >
            <component
              :is="copiedRadix === r ? Check : Copy"
              class="w-[14px] h-[14px]"
              aria-hidden="true"
            />
            {{ copiedRadix === r ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 3. 进制对照表 -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <FileText
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          前 16 个数的进制对照表
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-encode-table">
          <thead>
            <tr>
              <th>十进制</th>
              <th>二进制</th>
              <th>八进制</th>
              <th>十六进制</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in refTable" :key="i">
              <td class="pz-mono-cell">{{ row.dec }}</td>
              <td class="pz-mono-cell">{{ row.bin }}</td>
              <td class="pz-mono-cell">{{ row.oct }}</td>
              <td class="pz-mono-cell">{{ row.hex }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
