<script setup lang="ts">
/**
 * MobileJwtDecoder.vue - 移动端 JWT 解析工具
 *
 * JWT Token 输入
 * Header / Payload 分段展示
 * 字段表格展示
 * 时间戳转换
 */
import { decodeJwt, formatTimestamp, type DecodeJwtResult } from '~/utils/tools/jwt'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'jwt-decoder',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const tokenInput = ref('')
const result = ref<DecodeJwtResult | null>(null)
const copiedField = ref<string>('')

const SAMPLE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

function handleDecode() {
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  result.value = decodeJwt(tokenInput.value)
}

function handleLoadSample() {
  tokenInput.value = SAMPLE_TOKEN
  result.value = null
}

function handleClear() {
  tokenInput.value = ''
  result.value = null
}

async function handleCopy(text: string, field: string) {
  try {
    await navigator.clipboard.writeText(text)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copiedField.value = field
    setTimeout(() => { copiedField.value = '' }, 2000)
  } catch {
    // 静默忽略
  }
}

const headerFields = computed(() => {
  if (!result.value?.success || !result.value.parts) return []
  return Object.entries(result.value.parts.headerObj).map(([k, v]) => ({
    key: k,
    value: typeof v === 'object' ? JSON.stringify(v) : String(v),
  }))
})

const payloadFields = computed(() => {
  if (!result.value?.success || !result.value.parts) return []
  return Object.entries(result.value.parts.payloadObj).map(([k, v]) => ({
    key: k,
    value: typeof v === 'object' ? JSON.stringify(v) : String(v),
  }))
})

const isExpired = computed(() => {
  if (!result.value?.success || !result.value.parts) return null
  const exp = result.value.parts.payloadObj.exp
  if (typeof exp !== 'number') return null
  return Date.now() > exp * 1000
})
</script>

<template>
  <div class="m-tool">
    <!-- Token 输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">JWT Token</span>
        <button type="button" class="m-tool__link" @click="handleLoadSample">示例</button>
      </div>
      <textarea
        v-model="tokenInput"
        class="m-tool__textarea"
        placeholder="在此粘贴 JWT Token..."
        aria-label="JWT Token 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleDecode">解析</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 错误展示 -->
    <div
      v-if="result && !result.success"
      class="m-tool__alert m-tool__alert--error"
      role="alert"
    >
      <span class="m-tool__alert-title">解析失败</span>
      <span class="m-tool__alert-desc">{{ result.error }}</span>
    </div>

    <!-- 解析结果 -->
    <template v-if="result?.success && result.parts">
      <!-- 基本信息 -->
      <div class="m-tool__card">
        <span class="m-tool__label">基本信息</span>
        <div class="m-tool__info-grid">
          <div class="m-tool__info-item">
            <span class="m-tool__info-key">算法</span>
            <span class="m-tool__info-val">{{ result.parts.algo }}</span>
          </div>
          <div class="m-tool__info-item">
            <span class="m-tool__info-key">类型</span>
            <span class="m-tool__info-val">{{ result.parts.type }}</span>
          </div>
          <div class="m-tool__info-item">
            <span class="m-tool__info-key">总长度</span>
            <span class="m-tool__info-val">{{ result.parts.totalLength }} 字符</span>
          </div>
          <div v-if="result.parts.expReadable" class="m-tool__info-item">
            <span class="m-tool__info-key">过期时间</span>
            <span
              class="m-tool__info-val"
              :class="{ 'is-expired': isExpired }"
            >
              {{ result.parts.expReadable }}
              <span v-if="isExpired" class="m-tool__expired-tag">(已过期)</span>
              <span v-else-if="isExpired === false" class="m-tool__valid-tag">(有效)</span>
            </span>
          </div>
          <div v-if="result.parts.iatReadable" class="m-tool__info-item">
            <span class="m-tool__info-key">签发时间</span>
            <span class="m-tool__info-val">{{ result.parts.iatReadable }}</span>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="m-tool__card">
        <div class="m-tool__header">
          <span class="m-tool__label">Header</span>
          <button
            type="button"
            class="m-tool__link"
            @click="handleCopy(result!.parts!.header, 'header')"
          >{{ copiedField === 'header' ? '已复制' : '复制' }}</button>
        </div>
        <div class="m-tool__table">
          <div class="m-tool__table-row m-tool__table-row--head">
            <span>字段</span>
            <span>值</span>
          </div>
          <div
            v-for="f in headerFields"
            :key="f.key"
            class="m-tool__table-row"
          >
            <span class="m-tool__table-key">{{ f.key }}</span>
            <span class="m-tool__table-val">{{ f.value }}</span>
          </div>
        </div>
      </div>

      <!-- Payload -->
      <div class="m-tool__card">
        <div class="m-tool__header">
          <span class="m-tool__label">Payload</span>
          <button
            type="button"
            class="m-tool__link"
            @click="handleCopy(result!.parts!.payload, 'payload')"
          >{{ copiedField === 'payload' ? '已复制' : '复制' }}</button>
        </div>
        <div class="m-tool__table">
          <div class="m-tool__table-row m-tool__table-row--head">
            <span>字段</span>
            <span>值</span>
          </div>
          <div
            v-for="f in payloadFields"
            :key="f.key"
            class="m-tool__table-row"
          >
            <span class="m-tool__table-key">{{ f.key }}</span>
            <span class="m-tool__table-val">{{ f.value }}</span>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="m-tool__card">
        <div class="m-tool__header">
          <span class="m-tool__label">Signature</span>
          <button
            type="button"
            class="m-tool__link"
            @click="handleCopy(result!.parts!.signature, 'signature')"
          >{{ copiedField === 'signature' ? '已复制' : '复制' }}</button>
        </div>
        <code class="m-tool__code-block">{{ result.parts.signature }}</code>
        <p class="m-tool__hint">签名仅用于验证，不包含可读取信息。</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.m-tool {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #ede9fe;
  --m-color-primary-lighter: #ddd6fe;
  --m-color-surface: #ffffff;
  --m-color-bg: #f9fafb;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-error: #ef4444;
  --m-color-error-bg: #fef2f2;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-tool__card {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-tool__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.m-tool__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
}

.m-tool__link {
  background: none;
  border: none;
  color: var(--m-color-primary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__link:active {
  opacity: 0.7;
}

.m-tool__textarea {
  width: 100%;
  min-height: 120px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  resize: vertical;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
}

.m-tool__textarea:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-tool__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-btn {
  flex: 1;
  min-width: 72px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-btn:active {
  transform: scale(0.97);
}

.m-btn--primary {
  background: var(--m-color-primary);
  color: #ffffff;
}

.m-btn--primary:active {
  background: #6d28d9;
}

.m-btn--ghost {
  background: var(--m-color-surface);
  color: var(--m-color-text-secondary);
  border: 1px solid var(--m-color-border);
}

.m-btn--ghost:active {
  background: var(--m-color-bg);
}

.m-tool__info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-tool__info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.m-tool__info-key {
  font-size: 13px;
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
}

.m-tool__info-val {
  font-size: 13px;
  color: var(--m-color-text-primary);
  text-align: right;
  word-break: break-all;
}

.m-tool__info-val.is-expired {
  color: var(--m-color-error);
}

.m-tool__expired-tag {
  color: var(--m-color-error);
  font-size: 12px;
  margin-left: 4px;
}

.m-tool__valid-tag {
  color: #10b981;
  font-size: 12px;
  margin-left: 4px;
}

.m-tool__table {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--m-color-border-light);
}

.m-tool__table-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13px;
  align-items: start;
}

.m-tool__table-row--head {
  background: var(--m-color-bg);
  font-weight: 600;
  color: var(--m-color-text-primary);
}

.m-tool__table-row:not(.m-tool__table-row--head) {
  border-top: 1px solid var(--m-color-border-light);
}

.m-tool__table-key {
  font-weight: 500;
  color: var(--m-color-text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}

.m-tool__table-val {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-secondary);
  word-break: break-all;
}

.m-tool__code-block {
  margin: 0;
  padding: 10px 12px;
  background: var(--m-color-bg);
  border-radius: 10px;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

.m-tool__hint {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  margin: 0;
}

.m-tool__alert {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.m-tool__alert--error {
  background: var(--m-color-error-bg);
  border-color: #fecaca;
}

.m-tool__alert--error .m-tool__alert-title {
  color: var(--m-color-error);
}

.m-tool__alert-title {
  font-size: 14px;
  font-weight: 600;
}

.m-tool__alert-desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>