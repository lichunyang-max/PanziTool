<script setup lang="ts">
/**
 * MobileRegexTester.vue - 移动端正则表达式测试工具
 *
 * 正则表达式输入
 * 测试文本输入
 * 匹配结果展示
 * 分组信息展示
 */
import { executeRegex, type RegexResult } from '~/utils/tools/regex'

const props = withDefaults(
  defineProps<{
    slug?: string
  }>(),
  { slug: '' },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'regex-tester',
)

const emit = defineEmits<{
  (e: 'tool_use', slug: string): void
  (e: 'copy', slug: string): void
}>()

const pattern = ref('\\b\\w+\\b')
const flags = ref('g')
const testText = ref('Hello World! This is a test. 123 numbers.')

const result = ref<RegexResult | null>(null)
const copied = ref(false)

const SAMPLES = [
  { label: '邮箱', pattern: '[\\w.-]+@[\\w.-]+\\.\\w+', flags: 'g' },
  { label: '手机号', pattern: '1[3-9]\\d{9}', flags: 'g' },
  { label: 'URL', pattern: 'https?://[\\w.-]+(?:/[\\w./?%&=-]*)?', flags: 'gi' },
  { label: 'IP地址', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', flags: 'g' },
  { label: '日期', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
]

const activeFlags = computed(() => {
  const f = flags.value
  return {
    g: f.includes('g'),
    i: f.includes('i'),
    m: f.includes('m'),
    s: f.includes('s'),
    u: f.includes('u'),
  }
})

function toggleFlag(flag: string) {
  if (flags.value.includes(flag)) {
    flags.value = flags.value.replace(flag, '')
  } else {
    flags.value += flag
  }
}

function handleTest() {
  reportEvent('tool_use', effectiveSlug.value)
  emit('tool_use', effectiveSlug.value)
  result.value = executeRegex(pattern.value, flags.value, testText.value)
}

function handleLoadSample(s: typeof SAMPLES[number]) {
  pattern.value = s.pattern
  flags.value = s.flags
}

function handleClear() {
  pattern.value = ''
  testText.value = ''
  result.value = null
}

async function handleCopy() {
  if (!result.value?.matches.length) return
  const text = result.value.matches.map(m => m.fullMatch).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    reportEvent('copy', effectiveSlug.value)
    emit('copy', effectiveSlug.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 静默忽略
  }
}

const matchCount = computed(() => result.value?.matches.length ?? 0)
</script>

<template>
  <div class="m-tool">
    <!-- 正则输入区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">正则表达式</span>
      </div>
      <div class="m-tool__pattern-row">
        <input
          v-model="pattern"
          type="text"
          class="m-tool__input m-tool__input--pattern"
          placeholder="输入正则表达式..."
          spellcheck="false"
        />
      </div>
      <!-- 标志位快捷 -->
      <div class="m-tool__flags">
        <button
          v-for="f in ['g', 'i', 'm', 's', 'u']"
          :key="f"
          type="button"
          class="m-tool__flag"
          :class="{ 'is-active': activeFlags[f as keyof typeof activeFlags] }"
          @click="toggleFlag(f)"
        >{{ f }}</button>
      </div>
    </div>

    <!-- 常用正则 -->
    <div class="m-tool__card">
      <span class="m-tool__label">常用正则</span>
      <div class="m-tool__quick">
        <button
          v-for="s in SAMPLES"
          :key="s.label"
          type="button"
          class="m-tool__chip"
          @click="handleLoadSample(s)"
        >{{ s.label }}</button>
      </div>
    </div>

    <!-- 测试文本区 -->
    <div class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">测试文本</span>
      </div>
      <textarea
        v-model="testText"
        class="m-tool__textarea"
        placeholder="输入要测试的文本..."
        aria-label="测试文本输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>
    </div>

    <!-- 操作按钮 -->
    <div class="m-tool__actions">
      <button type="button" class="m-btn m-btn--primary" @click="handleTest">测试</button>
      <button type="button" class="m-btn m-btn--ghost" @click="handleClear">清空</button>
    </div>

    <!-- 匹配结果 -->
    <div v-if="result" class="m-tool__card">
      <div class="m-tool__header">
        <span class="m-tool__label">
          匹配结果
          <span v-if="result.success" class="m-tool__match-count">
            共 {{ matchCount }} 处匹配
          </span>
        </span>
        <button
          type="button"
          class="m-tool__link"
          :disabled="!result.success || matchCount === 0"
          @click="handleCopy"
        >{{ copied ? '已复制' : '复制全部' }}</button>
      </div>

      <!-- 错误展示 -->
      <div v-if="!result.success" class="m-tool__alert m-tool__alert--error">
        <span class="m-tool__alert-title">正则表达式错误</span>
        <span class="m-tool__alert-desc">{{ result.error }}</span>
      </div>

      <!-- 匹配列表 -->
      <div v-else-if="result.matches.length > 0" class="m-tool__matches">
        <div
          v-for="m in result.matches"
          :key="m.index"
          class="m-tool__match"
        >
          <div class="m-tool__match-head">
            <span class="m-tool__match-index">#{{ m.index + 1 }}</span>
            <span class="m-tool__match-pos">位置 {{ m.start }}-{{ m.end }}</span>
          </div>
          <code class="m-tool__match-text">{{ m.fullMatch }}</code>
          <!-- 分组信息 -->
          <div v-if="m.groups.length > 0" class="m-tool__match-groups">
            <div
              v-for="(g, gi) in m.groups"
              :key="gi"
              class="m-tool__match-group"
            >
              <span class="m-tool__match-group-label">组{{ gi + 1 }}</span>
              <code class="m-tool__match-group-val">{{ g || '(未匹配)' }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- 无匹配 -->
      <div v-else class="m-tool__empty">
        <span>没有找到匹配的内容</span>
      </div>
    </div>
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
  box-sizing: border-box;
  max-width: 100%;
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

.m-tool__match-count {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  font-weight: 400;
  margin-left: 6px;
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

.m-tool__link:disabled {
  color: var(--m-color-text-tertiary);
  cursor: not-allowed;
}

.m-tool__pattern-row {
  display: flex;
  align-items: center;
  gap: 4px;
}


.m-tool__input {
  flex: 1;
  min-height: 44px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  outline: none;
  box-sizing: border-box;
}

.m-tool__input:focus {
  border-color: var(--m-color-primary);
  box-shadow: 0 0 0 3px var(--m-color-primary-light);
}

.m-tool__input--pattern {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  min-width: 0;
}

.m-tool__flags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.m-tool__flag {
  min-width: 36px;
  min-height: 32px;
  border: 1px solid var(--m-color-border);
  border-radius: 8px;
  background: var(--m-color-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--m-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__flag.is-active {
  background: var(--m-color-primary);
  border-color: var(--m-color-primary);
  color: #ffffff;
}

.m-tool__flag:active {
  transform: scale(0.95);
}

.m-tool__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-tool__chip {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--m-color-border);
  border-radius: 18px;
  background: var(--m-color-surface);
  font-size: 13px;
  color: var(--m-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.m-tool__chip:active {
  background: var(--m-color-primary-light);
  border-color: var(--m-color-primary);
  color: var(--m-color-primary);
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

.m-tool__matches {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.m-tool__match {
  padding: 10px;
  background: var(--m-color-bg);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.m-tool__match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.m-tool__match-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--m-color-primary);
}

.m-tool__match-pos {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
}

.m-tool__match-text {
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-primary);
  background: var(--m-color-surface);
  padding: 6px 8px;
  border-radius: 6px;
  word-break: break-all;
}

.m-tool__match-groups {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--m-color-border-light);
}

.m-tool__match-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.m-tool__match-group-label {
  font-size: 12px;
  color: var(--m-color-text-tertiary);
  min-width: 32px;
}

.m-tool__match-group-val {
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--m-color-text-secondary);
  word-break: break-all;
}

.m-tool__empty {
  text-align: center;
  padding: 20px;
  font-size: 14px;
  color: var(--m-color-text-tertiary);
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