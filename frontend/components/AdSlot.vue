<script setup lang="ts">
/**
 * AdSlot.vue - 可配置广告位组件
 *
 * 通过 runtimeConfig.public.adSlots 配置广告位，实现广告位的预留与可配置。
 *
 * 特性：
 * - 未配置（空字符串）时静默隐藏，不影响页面布局
 * - 已配置时异步注入第三方广告脚本，不阻塞首屏渲染
 * - 使用 <ClientOnly> 包裹，SSR 阶段不渲染广告内容
 * - 脚本加载失败时静默降级隐藏
 *
 * 用法：<AdSlot slot-key="homeTop" />
 *
 * 配置方式（nuxt.config.ts）：
 *   runtimeConfig: {
 *     public: {
 *       adSlots: {
 *         homeTop: 'https://example.com/ad.js', // 配置脚本 URL 启用
 *         sidebar: '',    // 空字符串=未配置
 *         toolBottom: '', // 空字符串=未配置
 *       }
 *     }
 *   }
 */

const props = defineProps<{
  /** 广告位 key，对应 runtimeConfig.public.adSlots 中的配置项（如 'homeTop'/'sidebar'/'toolBottom'） */
  slotKey: string
}>()

const config = useRuntimeConfig()
const adSlots = (config.public.adSlots || {}) as Record<string, string>

/**
 * 当前广告位配置值
 * - 空字符串或不存在 → 未配置，静默隐藏
 * - 非空字符串 → 已配置（可为脚本 URL 或广告单元 ID）
 */
const adConfig = computed(() => {
  const value = adSlots[props.slotKey]
  return typeof value === 'string' && value.trim() !== '' ? value : ''
})

/** 脚本是否加载失败（用于降级隐藏） */
const loadFailed = ref(false)

/**
 * 异步注入第三方广告脚本
 * - 通过 requestIdleCallback 或 setTimeout 延迟执行，确保不阻塞首屏
 * - 脚本加载失败时设置 loadFailed 触发降级隐藏
 */
async function injectAdScript() {
  if (!adConfig.value || loadFailed.value) return

  // 配置为脚本 URL 时动态加载
  if (adConfig.value.startsWith('http')) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = adConfig.value
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`广告脚本加载失败: ${adConfig.value}`))
      document.head.appendChild(script)
    }).catch(() => {
      // 静默降级：加载失败时隐藏广告位
      loadFailed.value = true
    })
  }
  // 非 URL 配置（如广告单元 ID）预留扩展，由具体广告平台 SDK 处理
}

onMounted(() => {
  if (!adConfig.value) return

  // 使用 requestIdleCallback 在浏览器空闲时加载，不阻塞首屏
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => injectAdScript(), { timeout: 3000 })
  } else {
    // 降级：不支持 requestIdleCallback 时延迟加载
    setTimeout(injectAdScript, 1500)
  }
})
</script>

<template>
  <!-- 广告位：已配置时渲染广告容器，未配置时显示占位符 -->
  <!-- 注意：不使用 ClientOnly，避免 SSR hydration mismatch -->
  <div
    class="pz-ad-slot"
    :class="{ 'pz-ad-slot-placeholder': !adConfig || loadFailed }"
    :data-ad-slot="slotKey"
    aria-label="广告位"
  >
    <span v-if="!adConfig || loadFailed">广告位</span>
    <!-- 已配置时广告内容由第三方脚本异步注入 -->
  </div>
</template>

<style scoped>
.pz-ad-slot-placeholder {
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--pz-color-bg-tertiary);
  border: 1px dashed var(--pz-color-border-strong);
  border-radius: var(--pz-radius-lg);
}

.pz-ad-slot-placeholder span {
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-tertiary);
  font-family: var(--pz-font-sans);
}
</style>
