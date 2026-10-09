<script setup lang="ts">
/**
 * TextSimilarityTool.vue - 内容重复率检测
 *
 * 双文本比对：环形重复率 + 词组统计 + 判定徽章 + 重复片段高亮。
 */
import { Trash2, ShieldCheck } from 'lucide-vue-next'
import { computeSimilarity, type SimilarityResult } from '~/utils/tools/text/textSimilarity'

useHead({
  titleTemplate: null,
  title: '内容重复率检测工具 | 盘子工具站',
  meta: [
    { name: 'description', content: '免费在线内容重复率检测工具，对比两段文本的词组重合度，给出重复率百分比、最长连续重复片段与改写建议，重复内容高亮显示，本地浏览器处理不上传。' },
    { name: 'keywords', content: '重复率检测,论文查重,文本相似度,内容查重,重复片段,改写检测' },
  ],
})

const props = withDefaults(defineProps<{ slug?: string }>(), { slug: '' })
const { reportEvent } = useAnalytics()
const route = useRoute()
const effectiveSlug = computed(() => props.slug || (route.params.slug as string) || 'text-similarity')

const MAX = 2000
const original = ref('春天来了，花园里的花都开了，蜜蜂在花丛中忙碌地飞来飞去，小朋友们在草地上快乐地放风筝。')
const compare = ref('春天到了，花园里的花全部开了，蜜蜂在花丛中忙碌地飞来飞去，孩子们在草地上开心地放着风筝。')
const result = ref<SimilarityResult | null>(null)

const levelColor = computed(() => {
  switch (result.value?.level) {
    case 'low': return '#16a34a'
    case 'mid': return '#d97706'
    case 'high': return '#ea580c'
    case 'copy': return '#dc2626'
    default: return 'var(--pz-color-primary)'
  }
})

const ringCircumference = 2 * Math.PI * 52

function runCheck() {
  reportEvent('tool_use', effectiveSlug.value)
  result.value = computeSimilarity(original.value, compare.value)
}

onMounted(() => {
  runCheck()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="pz-card p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="sim-a">原文</label>
          <div class="flex items-center gap-2">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">{{ Array.from(original).length }}/{{ MAX }}</span>
            <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.2rem 0.6rem" @click="original = ''">
              <Trash2 class="w-[13px] h-[13px]" aria-hidden="true" />
            </button>
          </div>
        </div>
        <textarea id="sim-a" v-model="original" class="pz-url-textarea" rows="7" maxlength="2000" placeholder="粘贴原始文本..." />
      </div>
      <div class="pz-card p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)" for="sim-b">对比文本</label>
          <div class="flex items-center gap-2">
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">{{ Array.from(compare).length }}/{{ MAX }}</span>
            <button type="button" class="pz-btn-secondary whitespace-nowrap" style="padding: 0.2rem 0.6rem" @click="compare = ''">
              <Trash2 class="w-[13px] h-[13px]" aria-hidden="true" />
            </button>
          </div>
        </div>
        <textarea id="sim-b" v-model="compare" class="pz-url-textarea" rows="7" maxlength="2000" placeholder="粘贴需要比对的文本..." />
      </div>
    </div>

    <div class="pz-card p-4 flex flex-col items-center gap-4">
      <button type="button" class="pz-btn-primary" @click="runCheck">
        <ShieldCheck class="w-4 h-4" aria-hidden="true" />开始检测
      </button>

      <div v-if="result" class="w-full flex flex-col lg:flex-row items-center gap-6">
        <!-- 环形重复率 -->
        <div class="relative shrink-0" style="width: 140px; height: 140px">
          <svg width="140" height="140" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--pz-color-border)" stroke-width="10" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              :stroke="levelColor" stroke-width="10" stroke-linecap="round"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringCircumference * (1 - result.rate / 100)"
              transform="rotate(-90 60 60)"
              style="transition: stroke-dashoffset 0.6s ease"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold" :style="{ color: levelColor }">{{ result.rate }}%</span>
            <span class="text-xs" style="color: var(--pz-color-text-tertiary)">重复率</span>
          </div>
        </div>

        <!-- 统计 + 判定 -->
        <div class="flex-1 w-full flex flex-col gap-3">
          <span class="pz-badge self-start" :style="{ backgroundColor: levelColor + '22', color: levelColor }">
            {{ result.levelText }}（{{ result.rate }}%）
          </span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="flex flex-col p-2 rounded-md" style="background: var(--pz-color-bg-secondary)">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">原文词组</span>
              <span class="text-base font-semibold" style="font-family: var(--pz-font-mono)">{{ result.tokensA }}</span>
            </div>
            <div class="flex flex-col p-2 rounded-md" style="background: var(--pz-color-bg-secondary)">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">对比词组</span>
              <span class="text-base font-semibold" style="font-family: var(--pz-font-mono)">{{ result.tokensB }}</span>
            </div>
            <div class="flex flex-col p-2 rounded-md" style="background: var(--pz-color-bg-secondary)">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">重复词组</span>
              <span class="text-base font-semibold" style="font-family: var(--pz-font-mono)">{{ result.repeated }}</span>
            </div>
            <div class="flex flex-col p-2 rounded-md" style="background: var(--pz-color-bg-secondary)">
              <span class="text-xs" style="color: var(--pz-color-text-tertiary)">最长连续</span>
              <span class="text-base font-semibold" style="font-family: var(--pz-font-mono)">{{ result.longestCommon }} 字</span>
            </div>
          </div>
          <p class="text-sm" style="color: var(--pz-color-text-secondary)">{{ result.advice }}</p>
        </div>
      </div>
    </div>

    <!-- 高亮结果：原文与对比文本并排展示 -->
    <div v-if="result" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="pz-card p-4 flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">原文重复片段高亮</span>
        <div
          class="pz-batch-output"
          style="min-height: 80px; white-space: pre-wrap; word-break: break-all"
          v-html="result.highlightedHtml || '（原文为空）'"
        />
      </div>
      <div class="pz-card p-4 flex flex-col gap-2">
        <span class="text-xs font-semibold" style="color: var(--pz-color-text-secondary)">对比文本重复片段高亮</span>
        <div
          class="pz-batch-output"
          style="min-height: 80px; white-space: pre-wrap; word-break: break-all"
          v-html="result.highlightedHtmlB || '（对比文本为空）'"
        />
      </div>
      <p class="text-xs md:col-span-2" style="color: var(--pz-color-text-tertiary)">
        检测基于本地中英文分词与词组交集，结果仅供参考；连续 13 字以上相同通常视为疑似抄袭。
      </p>
    </div>
  </div>
</template>
