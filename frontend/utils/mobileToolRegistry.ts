/**
 * mobileToolRegistry.ts - 移动端工具注册表
 *
 * slug → 移动端专用组件懒加载映射
 * 与 PC 端 toolRegistry 分离，使用移动端专用的 UI 组件
 * 所有组件位于 components/mobile/tools/ 目录下
 */

import type { Component } from 'vue'

/**
 * 移动端工具注册表：slug → 移动端专用组件异步加载函数
 *
 * 新增工具时：
 * 1. 在 components/mobile/tools/ 下创建移动端工具组件
 * 2. 在此注册表中添加 slug → () => import(...) 映射
 * 3. 确认 slug 与后端 tools 表中的 slug 一致
 */
export const mobileToolRegistry: Record<string, () => Promise<Component>> = {
  'json-formatter': () =>
    import('~/components/mobile/tools/MobileJsonFormatter.vue').then(
      (m) => m.default || m,
    ),

  'url-encode': () =>
    import('~/components/mobile/tools/MobileUrlEncode.vue').then(
      (m) => m.default || m,
    ),

  base64: () =>
    import('~/components/mobile/tools/MobileBase64.vue').then(
      (m) => m.default || m,
    ),

  timestamp: () =>
    import('~/components/mobile/tools/MobileTimestamp.vue').then(
      (m) => m.default || m,
    ),

  'regex-tester': () =>
    import('~/components/mobile/tools/MobileRegexTester.vue').then(
      (m) => m.default || m,
    ),

  'jwt-decoder': () =>
    import('~/components/mobile/tools/MobileJwtDecoder.vue').then(
      (m) => m.default || m,
    ),

  hash: () =>
    import('~/components/mobile/tools/MobileHash.vue').then(
      (m) => m.default || m,
    ),

  cron: () =>
    import('~/components/mobile/tools/MobileCron.vue').then(
      (m) => m.default || m,
    ),

  'image-compress': () =>
    import('~/components/mobile/tools/MobileImageCompress.vue').then(
      (m) => m.default || m,
    ),

  'image-crop': () =>
    import('~/components/mobile/tools/MobileImageCrop.vue').then(
      (m) => m.default || m,
    ),

  'image-convert': () =>
    import('~/components/mobile/tools/MobileImageConvert.vue').then(
      (m) => m.default || m,
    ),

  // ===== 第二批：开发者工具扩展（移动端） =====
  'hex-encode': () =>
    import('~/components/mobile/tools/MobileHexEncode.vue').then(
      (m) => m.default || m,
    ),
  'unicode-convert': () =>
    import('~/components/mobile/tools/MobileUnicodeConvert.vue').then(
      (m) => m.default || m,
    ),
  'base-convert': () =>
    import('~/components/mobile/tools/MobileBaseConvert.vue').then(
      (m) => m.default || m,
    ),
  'image-base64': () =>
    import('~/components/mobile/tools/MobileImageBase64.vue').then(
      (m) => m.default || m,
    ),
  'xml-formatter': () =>
    import('~/components/mobile/tools/MobileXmlFormatter.vue').then(
      (m) => m.default || m,
    ),
  'yaml-formatter': () =>
    import('~/components/mobile/tools/MobileYamlFormatter.vue').then(
      (m) => m.default || m,
    ),
  'csv-json-convert': () =>
    import('~/components/mobile/tools/MobileCsvJsonConvert.vue').then(
      (m) => m.default || m,
    ),
  'uuid-generator': () =>
    import('~/components/mobile/tools/MobileUuidGenerator.vue').then(
      (m) => m.default || m,
    ),
  'mock-data': () =>
    import('~/components/mobile/tools/MobileMockData.vue').then(
      (m) => m.default || m,
    ),
  'string-toolkit': () =>
    import('~/components/mobile/tools/MobileStringToolkit.vue').then(
      (m) => m.default || m,
    ),
  'color-converter': () =>
    import('~/components/mobile/tools/MobileColorConverter.vue').then(
      (m) => m.default || m,
    ),
  'html-escape': () =>
    import('~/components/mobile/tools/MobileHtmlEscape.vue').then(
      (m) => m.default || m,
    ),
  'js-css-beautify': () =>
    import('~/components/mobile/tools/MobileJsCssBeautify.vue').then(
      (m) => m.default || m,
    ),
  'timezone-calculator': () =>
    import('~/components/mobile/tools/MobileTimezoneCalculator.vue').then(
      (m) => m.default || m,
    ),
}

/**
 * 检查 slug 是否已注册移动端工具组件
 */
export function hasMobileTool(slug: string): boolean {
  return slug in mobileToolRegistry
}