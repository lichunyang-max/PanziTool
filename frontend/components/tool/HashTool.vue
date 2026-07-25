<script setup lang="ts">
/**
 * HashTool.vue - 哈希计算工具组件
 *
 * 严格参照 ui/pages/哈希计算.html 的交互区结构：
 * 1. 文本哈希计算卡片（算法多选 pills + textarea + 计算按钮 + 结果区）
 * 2. 文件哈希计算卡片（拖拽上传 + 文件信息 + 结果区）
 * 3. 哈希算法对比表（静态）
 *
 * - SHA 系列使用 Web Crypto API，MD5 通过 js-md5 动态 import 懒加载
 * - 所有计算在浏览器本地完成，文件不上传服务器
 * - 计算触发 reportEvent('tool_use')，复制触发 reportEvent('copy')
 */
import { ref, computed } from 'vue'
import {
  Hash as HashIcon,
  FileText,
  Table2,
  Upload,
  Copy,
  Check,
  Trash2,
  Loader2,
} from 'lucide-vue-next'
import {
  computeTextHash,
  computeFileHash,
  type HashAlgorithm,
} from '~/utils/tools/hash'
import { useAnalytics } from '~/composables/useAnalytics'

useHead({
  titleTemplate: null,
  title: '哈希计算 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线哈希计算工具，支持MD5/SHA1/SHA256等多种算法，文本与文件均可计算，本地浏览器运算不上传，保障数据安全，免登录即用。'
    },
    {
      name: 'keywords',
      content: '哈希计算,MD5加密,SHA256,在线加密'
    },
    {
      property: 'og:title',
      content: '哈希计算 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线哈希计算工具，支持MD5/SHA1/SHA256等多种算法，文本与文件均可计算，本地浏览器运算不上传，保障数据安全，免登录即用。'
    }
  ]
})

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

// === 算法定义 ===
const ALGORITHMS: HashAlgorithm[] = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
]

// 多选状态：使用 reactive record 保证响应性
const algoSelected = ref<Record<HashAlgorithm, boolean>>({
  MD5: true,
  'SHA-1': true,
  'SHA-256': true,
  'SHA-384': true,
  'SHA-512': true,
})

function toggleAlgo(algo: HashAlgorithm) {
  algoSelected.value[algo] = !algoSelected.value[algo]
}

function isAlgoSelected(algo: HashAlgorithm): boolean {
  return algoSelected.value[algo] === true
}

const hasSelectedAlgo = computed(() =>
  ALGORITHMS.some((a) => algoSelected.value[a]),
)

const selectedAlgoList = computed(() =>
  ALGORITHMS.filter((a) => algoSelected.value[a]),
)

// === 结果项类型 ===
interface HashResultItem {
  algo: HashAlgorithm
  hash: string | null
  error?: boolean
}

// === 文本哈希 ===
const textInput = ref('')
const textResults = ref<HashResultItem[]>([])
const textComputing = ref(false)
const textError = ref('')

const charCount = computed(() => textInput.value.length)

async function computeText() {
  if (textInput.value === '') return
  if (!hasSelectedAlgo.value) {
    textError.value = '请至少选择一种算法'
    return
  }
  textError.value = ''
  textComputing.value = true
  reportEvent('tool_use', props.slug)

  const results: HashResultItem[] = []
  for (const algo of selectedAlgoList.value) {
    try {
      const hash = await computeTextHash(textInput.value, algo)
      results.push({ algo, hash })
    } catch {
      results.push({ algo, hash: null, error: true })
    }
  }
  textResults.value = results
  textComputing.value = false
}

function clearText() {
  textInput.value = ''
  textResults.value = []
  textError.value = ''
}

function onTextKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    computeText()
  }
}

// === 文件哈希 ===
const selectedFile = ref<File | null>(null)
const fileResults = ref<HashResultItem[]>([])
const fileComputing = ref(false)
const fileProgress = ref('')
const fileError = ref('')
const isDragover = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0])
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragover.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0])
  }
}

function onDragover(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragover.value = true
}

function onDragleave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragover.value = false
}

function triggerFileInput() {
  fileInputEl.value?.click()
}

function onUploadKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    triggerFileInput()
  }
}

async function handleFile(file: File) {
  if (!file) return
  selectedFile.value = file
  fileResults.value = []
  fileError.value = ''

  if (!hasSelectedAlgo.value) {
    fileError.value = '请先在上方选择至少一种算法'
    return
  }

  fileComputing.value = true
  fileProgress.value = '正在计算...'

  const algos = selectedAlgoList.value
  const results: HashResultItem[] = []
  for (let i = 0; i < algos.length; i++) {
    try {
      const hash = await computeFileHash(file, algos[i])
      results.push({ algo: algos[i], hash })
    } catch {
      results.push({ algo: algos[i], hash: null, error: true })
    }
    fileProgress.value = `正在计算... (${i + 1}/${algos.length})`
  }
  fileResults.value = results
  fileComputing.value = false
  fileProgress.value = ''
}

function clearFile() {
  selectedFile.value = null
  fileResults.value = []
  fileProgress.value = ''
  fileError.value = ''
  if (fileInputEl.value) {
    fileInputEl.value.value = ''
  }
}

// === 复制 ===
const copiedKey = ref<string | null>(null)

async function copyToClipboard(text: string, key: string) {
  reportEvent('copy', props.slug)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // fallback for non-secure contexts
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copiedKey.value = key
    setTimeout(() => {
      copiedKey.value = null
    }, 1500)
  } catch {
    // 静默忽略复制失败
  }
}

// === 对比表数据 ===
interface ComparisonRow {
  algo: string
  bits: string
  chars: string
  security: 'low' | 'high'
  securityNote: string
  usage: string
}

const comparisonData: ComparisonRow[] = [
  {
    algo: 'MD5',
    bits: '128',
    chars: '32',
    security: 'low',
    securityNote: '（已不推荐用于安全场景）',
    usage: '文件校验、缓存键',
  },
  {
    algo: 'SHA-1',
    bits: '160',
    chars: '40',
    security: 'low',
    securityNote: '（已不推荐用于安全场景）',
    usage: 'Git、旧版TLS证书',
  },
  {
    algo: 'SHA-256',
    bits: '256',
    chars: '64',
    security: 'high',
    securityNote: '',
    usage: '区块链、数字证书、TLS',
  },
  {
    algo: 'SHA-384',
    bits: '384',
    chars: '96',
    security: 'high',
    securityNote: '',
    usage: '高安全场景',
  },
  {
    algo: 'SHA-512',
    bits: '512',
    chars: '128',
    security: 'high',
    securityNote: '',
    usage: '高安全场景',
  },
  {
    algo: 'SHA3-256',
    bits: '256',
    chars: '64',
    security: 'high',
    securityNote: '',
    usage: '新一代标准（NIST FIPS 202）',
  },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ===== 1. 文本哈希计算 ===== -->
    <div class="pz-card p-4 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <HashIcon
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          文本哈希计算
        </h2>
      </div>

      <!-- 算法选择 pills -->
      <div class="flex flex-col gap-2">
        <div class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">
          选择算法
        </div>
        <div class="pz-algo-pills">
          <div
            v-for="algo in ALGORITHMS"
            :key="algo"
            class="pz-algo-pill"
            :data-selected="isAlgoSelected(algo) ? 'true' : 'false'"
            role="checkbox"
            :aria-checked="isAlgoSelected(algo) ? 'true' : 'false'"
            tabindex="0"
            @click="toggleAlgo(algo)"
            @keydown.enter.prevent="toggleAlgo(algo)"
            @keydown.space.prevent="toggleAlgo(algo)"
          >
            <Check
              v-if="isAlgoSelected(algo)"
              class="pz-algo-check"
              aria-hidden="true"
            />
            <span>{{ algo }}</span>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label
            class="text-xs font-semibold"
            style="color: var(--pz-color-text-secondary)"
            for="pz-hash-input"
          >
            输入文本
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ charCount }} 字符
          </span>
        </div>
        <textarea
          id="pz-hash-input"
          v-model="textInput"
          class="pz-hash-textarea"
          rows="5"
          placeholder="输入要计算哈希的文本..."
          @keydown="onTextKeydown"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="pz-btn-primary whitespace-nowrap"
          :disabled="textComputing"
          @click="computeText"
        >
          <Loader2
            v-if="textComputing"
            class="w-4 h-4 animate-spin"
            aria-hidden="true"
          />
          <Check v-else class="w-4 h-4" aria-hidden="true" />
          计算哈希
        </button>
        <button
          type="button"
          class="pz-btn-secondary whitespace-nowrap"
          @click="clearText"
        >
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          清空
        </button>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="textError"
        class="p-3 text-sm"
        style="color: var(--pz-state-error)"
      >
        {{ textError }}
      </div>

      <!-- 计算中提示 -->
      <div
        v-if="textComputing"
        class="p-3 text-sm"
        style="color: var(--pz-color-text-secondary)"
      >
        正在计算...
      </div>

      <!-- 结果区 -->
      <div
        v-if="textResults.length > 0"
        class="pz-card flex flex-col gap-0"
        style="border-color: var(--pz-color-border-light)"
      >
        <div
          v-for="item in textResults"
          :key="item.algo"
          class="pz-hash-result"
        >
          <div class="pz-hash-result-label">
            <span class="pz-badge pz-badge-primary">{{ item.algo }}</span>
          </div>
          <div
            v-if="item.error || item.hash === null"
            class="pz-hash-result-value"
            style="color: var(--pz-state-error)"
          >
            浏览器不支持
          </div>
          <div v-else class="pz-hash-result-value">{{ item.hash }}</div>
          <button
            v-if="!item.error && item.hash !== null"
            type="button"
            class="pz-btn-secondary pz-hash-copy-btn"
            style="flex-shrink: 0; padding: 0.25rem 0.625rem; font-size: var(--pz-text-xs)"
            @click="copyToClipboard(item.hash!, `text-${item.algo}`)"
          >
            <Check
              v-if="copiedKey === `text-${item.algo}`"
              class="w-3.5 h-3.5"
              aria-hidden="true"
            />
            <Copy v-else class="w-3.5 h-3.5" aria-hidden="true" />
            {{ copiedKey === `text-${item.algo}` ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 2. 文件哈希计算 ===== -->
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
          文件哈希计算
        </h2>
      </div>

      <input
        ref="fileInputEl"
        type="file"
        class="hidden"
        aria-hidden="true"
        @change="onFileChange"
      />

      <!-- 拖拽上传区（文件未选择时显示） -->
      <div
        v-if="!selectedFile"
        class="pz-upload-area"
        :class="{ 'pz-dragover': isDragover }"
        role="button"
        tabindex="0"
        aria-label="选择文件"
        @click="triggerFileInput"
        @keydown="onUploadKeydown"
        @dragover="onDragover"
        @dragenter="onDragover"
        @dragleave="onDragleave"
        @drop="onDrop"
      >
        <div class="flex flex-col items-center gap-2">
          <Upload
            class="w-8 h-8"
            style="color: var(--pz-color-text-tertiary)"
            aria-hidden="true"
          />
          <div class="text-sm font-medium" style="color: var(--pz-color-text-primary)">
            拖拽文件到此处或点击选择文件
          </div>
          <div class="text-xs" style="color: var(--pz-color-text-tertiary)">
            支持任意文件类型，所有计算在浏览器本地完成
          </div>
        </div>
      </div>

      <!-- 文件信息 + 结果区 -->
      <div v-if="selectedFile" class="mt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div
            class="flex items-center gap-2 text-sm"
            style="color: var(--pz-color-text-primary)"
          >
            <FileText
              class="w-4 h-4"
              style="color: var(--pz-color-primary)"
              aria-hidden="true"
            />
            <span class="font-medium">{{ selectedFile.name }}</span>
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
              ({{ formatFileSize(selectedFile.size) }})
            </span>
          </div>
          <button
            type="button"
            class="pz-btn-secondary whitespace-nowrap"
            style="padding: 0.25rem 0.75rem"
            @click="clearFile"
          >
            <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
            清除
          </button>
        </div>

        <!-- 错误提示 -->
        <div
          v-if="fileError"
          role="alert"
          class="pz-card p-3 text-sm"
          style="color: var(--pz-state-error); border-color: var(--pz-color-border-light)"
        >
          {{ fileError }}
        </div>

        <!-- 计算进度 -->
        <div
          v-if="fileComputing"
          class="pz-card p-3 text-sm flex items-center gap-2"
          style="color: var(--pz-color-text-secondary); border-color: var(--pz-color-border-light)"
        >
          <Loader2 class="w-4 h-4 animate-spin" aria-hidden="true" />
          {{ fileProgress }}
        </div>

        <!-- 文件哈希结果 -->
        <div
          v-if="fileResults.length > 0"
          class="pz-card flex flex-col gap-0"
          style="border-color: var(--pz-color-border-light)"
        >
          <div
            v-for="item in fileResults"
            :key="item.algo"
            class="pz-hash-result"
          >
            <div class="pz-hash-result-label">
              <span class="pz-badge pz-badge-primary">{{ item.algo }}</span>
            </div>
            <div
              v-if="item.error || item.hash === null"
              class="pz-hash-result-value"
              style="color: var(--pz-state-error)"
            >
              浏览器不支持
            </div>
            <div v-else class="pz-hash-result-value">{{ item.hash }}</div>
            <button
              v-if="!item.error && item.hash !== null"
              type="button"
              class="pz-btn-secondary pz-hash-copy-btn"
              style="flex-shrink: 0; padding: 0.25rem 0.625rem; font-size: var(--pz-text-xs)"
              @click="copyToClipboard(item.hash!, `file-${item.algo}`)"
            >
              <Check
                v-if="copiedKey === `file-${item.algo}`"
                class="w-3.5 h-3.5"
                aria-hidden="true"
              />
              <Copy v-else class="w-3.5 h-3.5" aria-hidden="true" />
              {{ copiedKey === `file-${item.algo}` ? '已复制' : '复制' }}
            </button>
          </div>
        </div>
      </div>

      <p class="text-xs mt-3" style="color: var(--pz-color-text-tertiary)">
        大文件计算可能需要较长时间，请耐心等待。文件不会上传到服务器，所有计算在浏览器本地完成。
      </p>
    </div>

    <!-- ============ 广告位（哈希算法对比和文件哈希计算之间） ============ -->
    <AdSlot slot-key="hashMiddle" />

    <!-- ===== 3. 哈希算法对比表 ===== -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <Table2
          class="w-[18px] h-[18px]"
          style="color: var(--pz-color-primary)"
          aria-hidden="true"
        />
        <h2
          class="text-base font-semibold"
          style="color: var(--pz-color-text-primary)"
        >
          哈希算法对比
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-cmp-table">
          <thead>
            <tr>
              <th>算法</th>
              <th>输出长度(bit)</th>
              <th>输出长度(字符)</th>
              <th>安全等级</th>
              <th>典型用途</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparisonData" :key="row.algo">
              <td>{{ row.algo }}</td>
              <td class="pz-mono-cell">{{ row.bits }}</td>
              <td class="pz-mono-cell">{{ row.chars }}</td>
              <td>
                <span :class="row.security === 'low' ? 'pz-security-low' : 'pz-security-high'">
                  {{ row.security === 'low' ? '低' : '高' }}
                </span>
                <span v-if="row.securityNote" style="color: var(--pz-color-text-secondary)">
                  {{ row.securityNote }}
                </span>
              </td>
              <td>{{ row.usage }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === Algorithm selector pills === */
.pz-algo-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.pz-algo-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-secondary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-full);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  white-space: nowrap;
}
.pz-algo-pill:hover {
  border-color: var(--pz-color-primary-border);
  color: var(--pz-color-primary);
}
.pz-algo-pill[data-selected='true'] {
  background-color: var(--pz-color-primary-light);
  color: var(--pz-color-primary);
  border-color: var(--pz-color-primary-border);
}
.pz-algo-pill:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}
.pz-algo-pill .pz-algo-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* === Text input textarea === */
.pz-hash-textarea {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  line-height: var(--pz-leading-relaxed);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem;
  outline: none;
  resize: vertical;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  width: 100%;
  min-height: 120px;
}
.pz-hash-textarea:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}

/* === Hash result row === */
.pz-hash-result {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}
.pz-hash-result:last-child {
  border-bottom: none;
}
.pz-hash-result-label {
  flex-shrink: 0;
  width: 80px;
  padding-top: 0.125rem;
}
.pz-hash-result-value {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  padding: 0.5rem 0.75rem;
  word-break: break-all;
  flex: 1;
  min-width: 0;
}

/* === File upload area === */
.pz-upload-area {
  border: 2px dashed var(--pz-color-border-strong);
  border-radius: var(--pz-radius-lg);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  background-color: var(--pz-color-bg-secondary);
}
.pz-upload-area:hover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-lightest);
}
.pz-upload-area.pz-dragover {
  border-color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
}
.pz-upload-area:focus-visible {
  outline: 2px solid var(--pz-color-primary);
  outline-offset: 2px;
}

/* === Comparison table === */
.pz-cmp-table {
  width: 100%;
  border-collapse: collapse;
}
.pz-cmp-table th {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  text-align: left;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border);
  white-space: nowrap;
}
.pz-cmp-table td {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}
.pz-cmp-table td.pz-mono-cell {
  font-family: var(--pz-font-mono);
  color: var(--pz-color-text-secondary);
}
.pz-cmp-table .pz-security-low {
  color: var(--pz-state-error);
  font-weight: var(--pz-weight-medium);
}
.pz-cmp-table .pz-security-high {
  color: var(--pz-state-success);
  font-weight: var(--pz-weight-medium);
}

/* === Copy button === */
.pz-hash-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .pz-algo-pill,
  .pz-upload-area {
    transition: none;
  }
}
</style>
