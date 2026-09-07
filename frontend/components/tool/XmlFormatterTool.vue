<script setup lang="ts">
/**
 * XmlFormatterTool.vue - XML 格式化/压缩/校验工具组件
 *
 * 逻辑忠实移植自 panziui/tools/xml-formatter.html 的内联脚本（纯 JS 递归解析）。
 * 桌面端结构参照 JsonFormatterTool.vue：双栏输入/输出 + 操作工具栏。
 *
 * 交互（通过 useAnalytics 上报）：
 * - 格式化 / 压缩 / 校验 → tool_use 事件
 * - 复制结果 → copy 事件
 * - Ctrl/Cmd + Enter 触发格式化
 */
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Minimize2,
  Wand2,
} from 'lucide-vue-next'
import { formatXml, minifyXml, validateXml } from '~/utils/tools/xml'
import ClearButton from '~/components/ui/ClearButton.vue'
import CopyButton from '~/components/ui/CopyButton.vue'

useHead({
  titleTemplate: null,
  title: 'XML格式化校验 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content:
        '免费在线XML格式化校验工具，支持美化、压缩、语法校验、错误行号定位，CDATA原样保留，适配SOAP接口报文调试，本地浏览器处理不上传，免登录即用。',
    },
    {
      name: 'keywords',
      content: 'XML格式化,XML美化,XML校验,XML压缩,SOAP报文',
    },
    {
      property: 'og:title',
      content: 'XML格式化校验 | 盘子工具站',
    },
    {
      property: 'og:description',
      content:
        '免费在线XML格式化校验工具，支持美化、压缩、语法校验、错误行号定位，CDATA原样保留，适配SOAP接口报文调试，本地浏览器处理不上传，免登录即用。',
    },
  ],
})

const props = withDefaults(
  defineProps<{
    /** 工具 slug，用于事件上报；未传入时从路由参数获取 */
    slug?: string
  }>(),
  {
    slug: '',
  },
)

const route = useRoute()
const { reportEvent } = useAnalytics()

/** 用于事件上报的 slug：优先使用 prop，其次路由参数 */
const effectiveSlug = computed(
  () => props.slug || (route.params.slug as string) || 'xml-formatter',
)

// === 示例数据（SOAP 报文，含命名空间与 CDATA） ===
const SAMPLE_XML =
  '<?xml version="1.0" encoding="UTF-8"?>\n<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:usr="http://api.example.com/user">\n  <soapenv:Header/>\n  <soapenv:Body>\n    <usr:queryUserRequest>\n      <usr:userId>10001</usr:userId>\n      <usr:detail>\n        <usr:includeProfile>true</usr:includeProfile>\n        <usr:includeOrders>false</usr:includeOrders>\n      </usr:detail>\n      <usr:remark><![CDATA[备注 <无特殊字符转义> & 内容]]></usr:remark>\n    </usr:queryUserRequest>\n  </soapenv:Body>\n</soapenv:Envelope>'

// === 状态 ===
// 预填充示例数据，确保 SSR/预渲染时页面有实际内容（利于 SEO）
const input = ref(SAMPLE_XML)
const output = ref(formatXml(SAMPLE_XML, 2).output ?? '')
const errorMsg = ref('')
/** null = 未校验；true = 校验通过；false = 校验失败 */
const validateStatus = ref<boolean | null>(null)
const indent = ref<number>(2)

// === 大输入防护：1MB ===
const LARGE_INPUT_THRESHOLD = 1024 * 1024
const isLargeInput = computed(() => input.value.length > LARGE_INPUT_THRESHOLD)

// === 清除错误 / 校验状态 ===
function resetFeedback() {
  errorMsg.value = ''
  validateStatus.value = null
}

// === 操作处理 ===
function handleFormat() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result = formatXml(input.value, indent.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    output.value = ''
    errorMsg.value = result.error || '格式化失败'
  }
}

function handleMinify() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result = minifyXml(input.value)
  if (result.success && result.output !== undefined) {
    output.value = result.output
  } else {
    output.value = ''
    errorMsg.value = result.error || '压缩失败'
  }
}

function handleValidate() {
  resetFeedback()
  reportEvent('tool_use', effectiveSlug.value)
  const result = validateXml(input.value)
  validateStatus.value = result.success
  if (!result.success) {
    errorMsg.value = result.error || 'XML 格式错误'
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  resetFeedback()
}

function handleLoadSample() {
  input.value = SAMPLE_XML
  resetFeedback()
}

function handleCopy() {
  reportEvent('copy', effectiveSlug.value)
}

/** Ctrl/Cmd + Enter 触发格式化 */
function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleFormat()
  }
}
</script>

<template>
  <!-- ===== 双栏布局：输入 + 输出 ===== -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- 输入区 -->
    <div
      class="pz-card p-4 flex flex-col gap-3 h-[360px] lg:h-[500px] min-w-0"
    >
      <div class="flex items-center justify-between">
        <span
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
        >
          输入
        </span>
        <button
          type="button"
          class="text-sm whitespace-nowrap hover:underline"
          style="
            color: var(--pz-color-primary);
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          "
          aria-label="加载示例 XML"
          @click="handleLoadSample"
        >
          示例
        </button>
      </div>
      <textarea
        v-model="input"
        class="pz-textarea flex-1 w-full"
        placeholder="粘贴需要格式化的 XML 报文..."
        aria-label="XML 输入"
        spellcheck="false"
        autocorrect="off"
        autocapitalize="off"
        @keydown="onInputKeydown"
      ></textarea>
    </div>

    <!-- 输出区 -->
    <div
      class="pz-card p-4 flex flex-col gap-3 h-[360px] lg:h-[500px] min-w-0"
    >
      <div class="flex items-center justify-between">
        <span
          class="text-sm font-medium"
          style="color: var(--pz-color-text-primary)"
        >
          输出
        </span>
        <CopyButton :text="output" @copy="handleCopy" />
      </div>
      <pre class="pz-code flex-1"><code>{{ output }}</code></pre>
    </div>
  </div>

  <!-- ===== 操作工具栏 ===== -->
  <div class="flex flex-wrap items-center justify-center gap-3 py-4">
    <button
      type="button"
      class="pz-btn-primary whitespace-nowrap"
      aria-label="格式化 XML"
      @click="handleFormat"
    >
      <Wand2 class="w-4 h-4" aria-hidden="true" />
      <span>格式化</span>
    </button>
    <button
      type="button"
      class="pz-btn-secondary whitespace-nowrap"
      aria-label="压缩 XML"
      @click="handleMinify"
    >
      <Minimize2 class="w-4 h-4" aria-hidden="true" />
      <span>压缩</span>
    </button>
    <button
      type="button"
      class="pz-btn-secondary whitespace-nowrap"
      aria-label="校验 XML"
      @click="handleValidate"
    >
      <Check class="w-4 h-4" aria-hidden="true" />
      <span>校验</span>
    </button>
    <ClearButton @clear="handleClear" />
    <div class="flex items-center gap-2 whitespace-nowrap">
      <span class="text-sm" style="color: var(--pz-color-text-secondary)">
        缩进
      </span>
      <select
        v-model="indent"
        class="pz-input"
        aria-label="缩进空格数"
      >
        <option :value="2">2 空格</option>
        <option :value="4">4 空格</option>
      </select>
    </div>
  </div>

  <!-- ===== 大输入警告 ===== -->
  <div
    v-if="isLargeInput"
    class="pz-card p-4 flex items-start gap-3 mb-4"
    style="
      background-color: var(--pz-state-warning-bg);
      border-color: var(--pz-state-warning-border);
    "
    role="alert"
  >
    <AlertCircle
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-warning)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p class="text-sm font-semibold" style="color: var(--pz-state-warning)">
        输入过大
      </p>
      <p class="text-sm mt-1" style="color: var(--pz-color-text-secondary)">
        当前输入超过 1MB，处理可能较慢，建议缩减输入。
      </p>
    </div>
  </div>

  <!-- ===== 错误展示区 ===== -->
  <div
    v-if="errorMsg"
    class="pz-card p-4 flex items-start gap-3"
    style="
      background-color: var(--pz-state-error-bg);
      border-color: var(--pz-state-error-border);
    "
    role="alert"
  >
    <AlertCircle
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-error)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p class="text-sm font-semibold" style="color: var(--pz-state-error)">
        XML 语法错误
      </p>
      <p
        class="text-sm mt-1"
        style="
          font-family: var(--pz-font-mono);
          color: var(--pz-color-text-secondary);
        "
      >
        {{ errorMsg }}
      </p>
    </div>
  </div>

  <!-- ===== 校验成功提示 ===== -->
  <div
    v-if="validateStatus === true"
    class="pz-card p-4 flex items-start gap-3"
    style="
      background-color: var(--pz-state-success-bg);
      border-color: var(--pz-state-success-border);
    "
    role="status"
  >
    <CheckCircle2
      class="w-5 h-5 shrink-0 mt-0.5"
      style="color: var(--pz-state-success)"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p class="text-sm font-semibold" style="color: var(--pz-state-success)">
        XML 校验通过
      </p>
      <p class="text-sm mt-1" style="color: var(--pz-color-text-secondary)">
        输入是合法的 XML 格式。
      </p>
    </div>
  </div>
</template>
