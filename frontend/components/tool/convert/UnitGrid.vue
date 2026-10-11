<script setup lang="ts">
/**
 * UnitGrid.vue - 单位换算网格（convert 分类共享组件）
 *
 * 渲染分组单位行：每行 = 单位标签 + 数值输入 + 单行复制。
 * 任意一行输入即成为「源」单位（带 源 标记），其余行由父组件换算显示。
 * 展示模式：grouped（按单位制分组双列）/ flat（单列全部）。
 *
 * 事件：
 * - update:modelValue：源输入原始字符串
 * - update:sourceUnit：源单位 name
 * - copy(unitName, value)：单行复制（组件内部已写入剪贴板）
 */
import { computed } from 'vue'
import type { ConvertUnit, ConvertGroup } from '~/utils/convert/convertCore'

const props = defineProps<{
  groups: ConvertGroup[]
  /** 源输入原始字符串 */
  modelValue: string
  /** 当前源单位 name */
  sourceUnit: string
  /** 目标单位显示文本（由父组件换算并格式化） */
  convertDisplay: (unit: ConvertUnit) => string
  /** 展示模式：grouped=按单位制分组，flat=单列全部 */
  mode?: 'grouped' | 'flat'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:sourceUnit': [name: string]
  copy: [unitName: string, value: string]
}>()

/** 展示用的分组序列（flat 模式下合并为单组） */
const displayGroups = computed<ConvertGroup[]>(() => {
  if (props.mode !== 'flat') return props.groups
  return [
    {
      title: '全部单位',
      units: props.groups.flatMap((g) => g.units),
    },
  ]
})

function findUnit(unitName: string): ConvertUnit | undefined {
  return props.groups.flatMap((g) => g.units).find((u) => u.name === unitName)
}

function displayValue(unit: ConvertUnit): string {
  if (unit.name === props.sourceUnit) return props.modelValue
  return props.convertDisplay(unit)
}

function onInput(unit: ConvertUnit, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (unit.name !== props.sourceUnit) {
    emit('update:sourceUnit', unit.name)
  }
  emit('update:modelValue', raw)
}

async function copyRow(unit: ConvertUnit) {
  const value = displayValue(unit)
  try {
    await navigator.clipboard.writeText(value)
    emit('copy', unit.name, value)
  } catch {
    // 剪贴板不可用时静默忽略
  }
}

defineExpose({ findUnit, displayValue })
</script>

<template>
  <div :class="mode === 'flat' ? 'flex flex-col gap-2' : 'pz-ugrid'">
    <div v-for="group in displayGroups" :key="group.title" class="pz-usec">
      <div v-if="mode !== 'flat'" class="pz-usec-title">
        {{ group.title }}
        <span class="pz-usec-count">{{ group.units.length }}</span>
      </div>
      <div
        v-for="unit in group.units"
        :key="unit.name"
        class="pz-urow"
        :data-src="unit.name === sourceUnit"
      >
        <span class="pz-ulab">
          <span class="n">{{ unit.name }}</span>
          <span class="s">{{ unit.symbol }}</span>
        </span>
        <span v-if="unit.name === sourceUnit" class="pz-usrc-tag">源</span>
        <input
          type="text"
          class="pz-uinput"
          :value="displayValue(unit)"
          :aria-label="unit.name"
          @input="onInput(unit, $event)"
        />
        <span class="pz-uact">
          <button type="button" :aria-label="`复制${unit.name}`" @click="copyRow(unit)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
        </span>
      </div>
    </div>
  </div>
</template>
