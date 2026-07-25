<script setup lang="ts">
/**
 * JwtDecoderTool.vue - JWT 解析工具组件
 *
 * 严格参照 ui/pages/JWT解析.html 的交互区结构：
 * 1. JWT 令牌输入卡片（textarea + 字符计数 + 工具栏 + 错误信息区）
 * 2. 三段解码展示（Header/Payload/Signature 卡片，解码后显示）
 * 3. Token 信息栏（6 项信息）
 * 4. JWT 算法参考表（静态表格）
 *
 * 安全说明：仅解码不验签，所有操作在浏览器本地完成
 */
import { KeyRound, CheckCheck, Trash2, FileText, Table2 } from 'lucide-vue-next'
import { decodeJwt, formatTimestamp, type JwtParts } from '~/utils/tools/jwt'
import { useAnalytics } from '~/composables/useAnalytics'

useHead({
  titleTemplate: null,
  title: 'JWT解析工具 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '免费在线JWT解析工具，快速解密JWT Token头部与载荷信息，附全量算法参考，本地解析不上传，保障接口调试数据安全。'
    },
    {
      name: 'keywords',
      content: 'JWT解析,JWT解密,Token解析,JWT校验'
    },
    {
      property: 'og:title',
      content: 'JWT解析工具 | 盘子工具站'
    },
    {
      property: 'og:description',
      content: '免费在线JWT解析工具，快速解密JWT Token头部与载荷信息，附全量算法参考，本地解析不上传，保障接口调试数据安全。'
    }
  ]
})

const props = defineProps<{
  slug: string
}>()

const { reportEvent } = useAnalytics()

// === 示例 JWT（HS256，含 iat 和 exp，exp 在远期未来） ===
const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk3NTIzNDU2Nzh9.jND5T1q3GFlvRDXm3V6KNqg8Zq5jvBmCZ_iIqjB4HMI'

// === 响应式状态 ===
const tokenInput = ref('')
const errorMessage = ref<string | null>(null)
const decodedParts = ref<JwtParts | null>(null)

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// === 计算属性 ===

/** 输入字符计数 */
const charCount = computed(() => tokenInput.value.length)

/** 是否已解码（显示三段展示区和信息栏） */
const hasDecoded = computed(() => decodedParts.value !== null)

/** Header 字段说明（typ / kid） */
const headerNote = computed(() => {
  if (!decodedParts.value) return ''
  const header = decodedParts.value.headerObj
  const notes: string[] = []
  if (header.typ) notes.push(`类型: ${header.typ}`)
  if (header.kid) notes.push(`密钥ID: ${header.kid}`)
  return notes.join('  |  ')
})

/** Payload 字段说明（exp / iat / nbf 可读时间） */
const payloadNote = computed(() => {
  if (!decodedParts.value) return ''
  const payload = decodedParts.value.payloadObj
  const notes: string[] = []

  // exp 可读时间
  if (typeof payload.exp === 'number') {
    notes.push(`过期时间: ${formatTimestamp(payload.exp)}`)
  }
  // iat 可读时间
  if (typeof payload.iat === 'number') {
    notes.push(`签发时间: ${formatTimestamp(payload.iat)}`)
  }
  // nbf 可读时间
  if (typeof payload.nbf === 'number') {
    notes.push(`生效时间: ${formatTimestamp(payload.nbf)}`)
  }
  return notes.join('  |  ')
})

/** exp 状态：有效 / 已过期 / 无 */
const expStatus = computed<'valid' | 'expired' | null>(() => {
  if (!decodedParts.value) return null
  const exp = decodedParts.value.payloadObj.exp
  if (typeof exp !== 'number') return null
  const now = Math.floor(Date.now() / 1000)
  return exp < now ? 'expired' : 'valid'
})

/** 签名是否使用 none 算法（安全警告） */
const isNoneAlgo = computed(() => decodedParts.value?.algo === 'none')

// === 算法参考表数据 ===
interface AlgoRow {
  algo: string
  type: string
  desc: string
  secure: boolean
}

const algoTableData: AlgoRow[] = [
  { algo: 'HS256', type: 'HMAC', desc: 'HMAC with SHA-256', secure: true },
  { algo: 'HS384', type: 'HMAC', desc: 'HMAC with SHA-384', secure: true },
  { algo: 'HS512', type: 'HMAC', desc: 'HMAC with SHA-512', secure: true },
  { algo: 'RS256', type: 'RSA', desc: 'RSASSA-PKCS1-v1.5 with SHA-256', secure: true },
  { algo: 'RS384', type: 'RSA', desc: 'RSASSA-PKCS1-v1.5 with SHA-384', secure: true },
  { algo: 'RS512', type: 'RSA', desc: 'RSASSA-PKCS1-v1.5 with SHA-512', secure: true },
  { algo: 'ES256', type: 'ECDSA', desc: 'ECDSA with P-256 curve', secure: true },
  { algo: 'ES384', type: 'ECDSA', desc: 'ECDSA with P-384 curve', secure: true },
  { algo: 'ES512', type: 'ECDSA', desc: 'ECDSA with P-521 curve', secure: true },
  { algo: 'none', type: 'None', desc: '无签名', secure: false },
]

// === 方法 ===

/** 执行解码 */
function handleDecode() {
  const token = tokenInput.value.trim()
  if (!token) {
    errorMessage.value = '请输入JWT令牌'
    decodedParts.value = null
    return
  }

  // 上报 tool_use 事件
  reportEvent('tool_use', props.slug)

  const result = decodeJwt(token)
  if (result.success && result.parts) {
    decodedParts.value = result.parts
    errorMessage.value = null
  } else {
    decodedParts.value = null
    errorMessage.value = result.error || '解码失败'
  }
}

/** 清空所有 */
function handleClear() {
  tokenInput.value = ''
  errorMessage.value = null
  decodedParts.value = null
}

/** 粘贴示例 JWT 并解码 */
function handleSample() {
  tokenInput.value = SAMPLE_JWT
  handleDecode()
}

/** 输入事件：更新字符计数 + 防抖自动解码 */
function handleInput() {
  // 防抖自动解码（300ms）
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    const token = tokenInput.value.trim()
    if (!token) {
      errorMessage.value = null
      decodedParts.value = null
      return
    }
    handleDecode()
  }, 300)
}

/** Ctrl/Cmd + Enter 快捷解码 */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleDecode()
  }
}

// 组件卸载时清除防抖定时器
onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div>
    <!-- ============ 1. JWT 令牌输入卡片 ============ -->
    <div class="pz-card p-4 mb-6 flex flex-col gap-4">
      <!-- 标题 -->
      <div class="flex items-center gap-2">
        <KeyRound class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">
          JWT令牌输入
        </h2>
      </div>

      <!-- 输入区 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="pz-jwt-input">
            粘贴JWT令牌
          </label>
          <span class="text-xs" style="color: var(--pz-color-text-tertiary)">
            {{ charCount }} 字符
          </span>
        </div>
        <textarea
          id="pz-jwt-input"
          v-model="tokenInput"
          class="pz-jwt-textarea"
          rows="5"
          placeholder="粘贴JWT令牌 (xxxxx.yyyyy.zzzzz)..."
          aria-label="JWT令牌输入"
          @input="handleInput"
          @keydown="handleKeydown"
        />
        <p class="text-xs" style="color: var(--pz-color-text-tertiary)">
          JWT令牌格式为 xxxxx.yyyyy.zzzzz（三段Base64URL用点分隔），所有解码在浏览器本地完成，不上传服务器
        </p>
      </div>

      <!-- 工具栏 -->
      <div class="pz-jwt-toolbar">
        <button type="button" class="pz-btn-primary whitespace-nowrap" @click="handleDecode">
          <CheckCheck class="w-4 h-4" aria-hidden="true" />
          <span>解码</span>
        </button>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" @click="handleClear">
          <Trash2 class="w-4 h-4" aria-hidden="true" />
          <span>清空</span>
        </button>
        <button type="button" class="pz-btn-secondary whitespace-nowrap" @click="handleSample">
          <FileText class="w-4 h-4" aria-hidden="true" />
          <span>粘贴示例</span>
        </button>
      </div>

      <!-- 错误信息区 -->
      <div v-if="errorMessage" role="alert" class="pz-jwt-error-msg">
        {{ errorMessage }}
      </div>
    </div>

    <!-- ============ 2. 三段解码展示 ============ -->
    <div v-if="hasDecoded" class="mb-6">
      <div class="pz-jwt-parts">
        <!-- Header 卡片（红色调） -->
        <div class="pz-jwt-part pz-jwt-part--header">
          <div class="flex items-center justify-between">
            <span class="pz-jwt-part-label">Header</span>
            <span class="pz-jwt-badge pz-jwt-badge--algo">{{ decodedParts!.algo }}</span>
          </div>
          <pre class="pz-jwt-part-content">{{ decodedParts!.header }}</pre>
          <p v-if="headerNote" class="pz-jwt-field-note">{{ headerNote }}</p>
        </div>

        <!-- Payload 卡片（紫色调） -->
        <div class="pz-jwt-part pz-jwt-part--payload">
          <div class="flex items-center justify-between">
            <span class="pz-jwt-part-label">Payload</span>
            <span v-if="expStatus === 'valid'" class="pz-jwt-badge pz-jwt-badge--valid">有效</span>
            <span v-else-if="expStatus === 'expired'" class="pz-jwt-badge pz-jwt-badge--expired">已过期</span>
          </div>
          <pre class="pz-jwt-part-content">{{ decodedParts!.payload }}</pre>
          <p v-if="payloadNote" class="pz-jwt-field-note">{{ payloadNote }}</p>
        </div>

        <!-- Signature 卡片（蓝色调） -->
        <div class="pz-jwt-part pz-jwt-part--signature">
          <div class="flex items-center justify-between">
            <span class="pz-jwt-part-label">Signature</span>
            <span v-if="isNoneAlgo" class="pz-jwt-badge pz-jwt-badge--warning">无签名算法(alg=none)</span>
          </div>
          <pre class="pz-jwt-part-content">{{ decodedParts!.signature }}</pre>
          <p class="pz-jwt-field-note">签名验证需要密钥，本工具仅解码不验证签名</p>
        </div>
      </div>
    </div>

    <!-- ============ 3. Token 信息栏 ============ -->
    <div v-if="hasDecoded" class="mb-6">
      <div class="pz-jwt-info-bar">
        <div class="pz-jwt-info-item">
          <span class="pz-jwt-info-label">Header长度</span>
          <span class="pz-jwt-info-value">{{ decodedParts!.headerLength }} 字符</span>
        </div>
        <div class="pz-jwt-info-item">
          <span class="pz-jwt-info-label">Payload长度</span>
          <span class="pz-jwt-info-value">{{ decodedParts!.payloadLength }} 字符</span>
        </div>
        <div class="pz-jwt-info-item">
          <span class="pz-jwt-info-label">Signature长度</span>
          <span class="pz-jwt-info-value">{{ decodedParts!.signatureLength }} 字符</span>
        </div>
        <div class="pz-jwt-info-item">
          <span class="pz-jwt-info-label">总长度</span>
          <span class="pz-jwt-info-value">{{ decodedParts!.totalLength }} 字符</span>
        </div>
        <div class="pz-jwt-info-item">
          <span class="pz-jwt-info-label">签名算法</span>
          <span class="pz-jwt-info-value">{{ decodedParts!.algo }}</span>
        </div>
        <div class="pz-jwt-info-item">
          <span class="pz-jwt-info-label">令牌类型</span>
          <span class="pz-jwt-info-value">{{ decodedParts!.type }}</span>
        </div>
      </div>
    </div>

    <!-- ============ 广告位（JWT算法参考功能上面） ============ -->
    <div class="mb-6">
      <AdSlot slot-key="jwtTop" />
    </div>

    <!-- ============ 4. JWT 算法参考表 ============ -->
    <div class="pz-card p-4">
      <div class="flex items-center gap-2 mb-3">
        <Table2 class="w-[18px] h-[18px]" style="color: var(--pz-color-primary)" aria-hidden="true" />
        <h2 class="text-base font-semibold" style="color: var(--pz-color-text-primary)">
          JWT算法参考
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="pz-jwt-algo-table">
          <thead>
            <tr>
              <th>算法</th>
              <th>类型</th>
              <th>说明</th>
              <th>安全性</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in algoTableData" :key="row.algo">
              <td class="pz-mono-cell">{{ row.algo }}</td>
              <td>{{ row.type }}</td>
              <td>{{ row.desc }}</td>
              <td>
                <span v-if="row.secure" class="pz-security-high">推荐</span>
                <span v-else class="pz-security-low">不安全</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === JWT textarea === */
.pz-jwt-textarea {
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
  word-break: break-all;
}

.pz-jwt-textarea:focus {
  border-color: var(--pz-color-primary);
  box-shadow: 0 0 0 3px var(--pz-color-primary-lighter);
}

/* === Action toolbar === */
.pz-jwt-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

/* === Three-part decoded display grid === */
.pz-jwt-parts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 900px) {
  .pz-jwt-parts {
    grid-template-columns: 1fr;
  }
}

/* === Individual part card — border-led surface with left accent === */
.pz-jwt-part {
  background-color: var(--pz-color-surface);
  border: 1px solid var(--pz-color-border);
  border-left-width: 4px;
  border-radius: var(--pz-radius-lg);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.pz-jwt-part:hover {
  box-shadow: var(--pz-shadow-md);
}

/* Header card variant — red/coral accent */
.pz-jwt-part--header {
  border-left-color: #dc2626;
}

/* Payload card variant — purple/violet accent */
.pz-jwt-part--payload {
  border-left-color: #7c3aed;
}

/* Signature card variant — blue accent */
.pz-jwt-part--signature {
  border-left-color: #0ea5e9;
}

/* Part label */
.pz-jwt-part-label {
  font-family: var(--pz-font-display);
  font-size: var(--pz-text-base);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-primary);
}

/* Decoded content area */
.pz-jwt-part-content {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  line-height: var(--pz-leading-relaxed);
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-tertiary);
  border: 1px solid var(--pz-color-border-light);
  border-radius: var(--pz-radius-md);
  padding: 0.75rem;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
  word-break: break-all;
}

/* === Token info bar === */
.pz-jwt-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pz-jwt-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.875rem;
  background-color: var(--pz-color-bg-secondary);
  border: 1px solid var(--pz-color-border);
  border-radius: var(--pz-radius-md);
  min-width: 100px;
}

.pz-jwt-info-label {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-normal);
  color: var(--pz-color-text-tertiary);
  white-space: nowrap;
}

.pz-jwt-info-value {
  font-family: var(--pz-font-mono);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-medium);
  color: var(--pz-color-text-primary);
}

/* === Algorithm reference table === */
.pz-jwt-algo-table {
  width: 100%;
  border-collapse: collapse;
}

.pz-jwt-algo-table :deep(th) {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  font-weight: var(--pz-weight-semibold);
  color: var(--pz-color-text-secondary);
  text-align: left;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border);
  white-space: nowrap;
}

.pz-jwt-algo-table :deep(td) {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-primary);
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--pz-color-border-light);
}

.pz-jwt-algo-table .pz-mono-cell {
  font-family: var(--pz-font-mono);
  color: var(--pz-color-text-secondary);
}

.pz-jwt-algo-table .pz-security-low {
  color: var(--pz-state-warning);
  font-weight: var(--pz-weight-medium);
}

.pz-jwt-algo-table .pz-security-high {
  color: var(--pz-state-success);
  font-weight: var(--pz-weight-medium);
}

/* === Badges === */
.pz-jwt-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  font-weight: var(--pz-weight-medium);
  border-radius: var(--pz-radius-full);
  white-space: nowrap;
}

.pz-jwt-badge--algo {
  background-color: var(--pz-color-bg-tertiary);
  color: var(--pz-color-text-secondary);
}

.pz-jwt-badge--valid {
  background-color: var(--pz-state-success-bg);
  color: var(--pz-state-success);
  border: 1px solid var(--pz-state-success-border);
}

.pz-jwt-badge--expired {
  background-color: var(--pz-state-error-bg);
  color: var(--pz-state-error);
  border: 1px solid var(--pz-state-error-border);
}

.pz-jwt-badge--warning {
  background-color: var(--pz-state-warning-bg);
  color: var(--pz-state-warning);
  border: 1px solid var(--pz-state-warning-border);
}

/* === Error message area === */
.pz-jwt-error-msg {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-state-error);
  background-color: var(--pz-state-error-bg);
  border: 1px solid var(--pz-state-error-border);
  border-radius: var(--pz-radius-md);
  padding: 0.625rem 0.875rem;
}

/* === Field annotation === */
.pz-jwt-field-note {
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-xs);
  color: var(--pz-color-text-tertiary);
  margin-top: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .pz-jwt-part {
    transition: none;
  }
}
</style>
