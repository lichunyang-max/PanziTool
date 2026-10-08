/**
 * toolRegistry.ts - 工具注册表
 *
 * slug → 组件懒加载映射
 * Task 7: 初始注册（占位），后续 Task 8-14 添加实际工具组件
 */

import type { Component } from 'vue'

/**
 * 工具注册表：slug → 组件异步加载函数
 *
 * 使用方式：
 * - 动态路由 /tools/[slug].vue 从路由获取 slug
 * - 通过 toolRegistry[slug] 获取对应组件的懒加载函数
 * - 使用 defineAsyncComponent 包装实现代码分割
 *
 * 新增工具时：
 * 1. 在 components/tool/ 下创建工具组件（如 JsonFormatterTool.vue）
 * 2. 在此注册表中添加 slug → () => import(...) 映射
 * 3. 在后端 tools 表中插入相应元数据
 */
export const toolRegistry: Record<string, () => Promise<Component>> = {
  // Task 8: JSON 格式化工具
  'json-formatter': () =>
    import('~/components/tool/JsonFormatterTool.vue').then(
      (m) => m.default || m,
    ),

  // Task 9: URL 编码解码工具
  'url-encode': () =>
    import('~/components/tool/UrlEncodeTool.vue').then((m) => m.default || m),

  // Task 10: Base64 编码/解码工具
  base64: () =>
    import('~/components/tool/Base64Tool.vue').then((m) => m.default || m),

  // Task 11: 时间戳转换工具
  timestamp: () =>
    import('~/components/tool/TimestampTool.vue').then((m) => m.default || m),

  // Task 12: 正则表达式测试工具
  'regex-tester': () =>
    import('~/components/tool/RegexTesterTool.vue').then((m) => m.default || m),

  // Task 13: JWT 解析工具
  'jwt-decoder': () =>
    import('~/components/tool/JwtDecoderTool.vue').then((m) => m.default || m),

  // Task 14: 哈希计算工具
  hash: () =>
    import('~/components/tool/HashTool.vue').then((m) => m.default || m),
  // Task 38: Cron 表达式工具
  cron: () =>
    import('~/components/tool/CronTool.vue').then((m) => m.default || m),
  // Task 16: 图片压缩工具
  'image-compress': () =>
    import('~/components/tool/ImageCompressTool.vue').then(
      (m) => m.default || m,
    ),
  // Task 17: 图片裁剪工具
  'image-crop': () =>
    import('~/components/tool/ImageCropTool.vue').then((m) => m.default || m),
  // Task 18: 图片格式转换工具
  'image-convert': () =>
    import('~/components/tool/ImageConvertTool.vue').then(
      (m) => m.default || m,
    ),
  // AI 证件照工具
  'id-photo': () =>
    import('~/components/tool/IdPhotoTool.vue').then((m) => m.default || m),

  // 二维码生成工具
  'qr-code': () =>
    import('~/components/tool/QrCodeTool.vue').then((m) => m.default || m),

  // ===== 第二批：开发者工具扩展（纯前端本地运算） =====
  'hex-encode': () =>
    import('~/components/tool/HexEncodeTool.vue').then((m) => m.default || m),
  'unicode-convert': () =>
    import('~/components/tool/UnicodeConvertTool.vue').then(
      (m) => m.default || m,
    ),
  'base-convert': () =>
    import('~/components/tool/BaseConvertTool.vue').then((m) => m.default || m),
  'image-base64': () =>
    import('~/components/tool/ImageBase64Tool.vue').then(
      (m) => m.default || m,
    ),
  'xml-formatter': () =>
    import('~/components/tool/XmlFormatterTool.vue').then(
      (m) => m.default || m,
    ),
  'yaml-formatter': () =>
    import('~/components/tool/YamlFormatterTool.vue').then(
      (m) => m.default || m,
    ),
  'csv-json-convert': () =>
    import('~/components/tool/CsvJsonConvertTool.vue').then(
      (m) => m.default || m,
    ),
  'uuid-generator': () =>
    import('~/components/tool/UuidGeneratorTool.vue').then(
      (m) => m.default || m,
    ),
  'mock-data': () =>
    import('~/components/tool/MockDataTool.vue').then((m) => m.default || m),
  'string-toolkit': () =>
    import('~/components/tool/StringToolkitTool.vue').then(
      (m) => m.default || m,
    ),
  'color-converter': () =>
    import('~/components/tool/ColorConverterTool.vue').then(
      (m) => m.default || m,
    ),
  'html-escape': () =>
    import('~/components/tool/HtmlEscapeTool.vue').then((m) => m.default || m),
  'js-css-beautify': () =>
    import('~/components/tool/JsCssBeautifyTool.vue').then(
      (m) => m.default || m,
    ),
  'timezone-calculator': () =>
    import('~/components/tool/TimezoneCalculatorTool.vue').then(
      (m) => m.default || m,
    ),

  // ===== 第三批：文本工具（纯前端本地运算） =====
  'case-converter': () =>
    import('~/components/tool/CaseConverterTool.vue').then(
      (m) => m.default || m,
    ),
  'text-workflow': () =>
    import('~/components/tool/TextWorkflowTool.vue').then(
      (m) => m.default || m,
    ),
  'text-dedupe': () =>
    import('~/components/tool/TextDedupeTool.vue').then(
      (m) => m.default || m,
    ),
  'text-replace': () =>
    import('~/components/tool/TextReplaceTool.vue').then(
      (m) => m.default || m,
    ),
  'text-reverse': () =>
    import('~/components/tool/TextReverseTool.vue').then(
      (m) => m.default || m,
    ),
  'text-numbering': () =>
    import('~/components/tool/TextNumberingTool.vue').then(
      (m) => m.default || m,
    ),
  'text-to-html': () =>
    import('~/components/tool/TextToHtmlTool.vue').then(
      (m) => m.default || m,
    ),
  'special-symbols': () =>
    import('~/components/tool/SpecialSymbolsTool.vue').then(
      (m) => m.default || m,
    ),
  'emoji-picker': () =>
    import('~/components/tool/EmojiPickerTool.vue').then(
      (m) => m.default || m,
    ),
  'fancy-text': () =>
    import('~/components/tool/FancyTextTool.vue').then(
      (m) => m.default || m,
    ),
  'word-count': () =>
    import('~/components/tool/WordCountTool.vue').then(
      (m) => m.default || m,
    ),
  'text-similarity': () =>
    import('~/components/tool/TextSimilarityTool.vue').then(
      (m) => m.default || m,
    ),
  'text-typesetting': () =>
    import('~/components/tool/TextTypesettingTool.vue').then(
      (m) => m.default || m,
    ),
  'word-frequency': () =>
    import('~/components/tool/WordFrequencyTool.vue').then(
      (m) => m.default || m,
    ),

  // ===== 财务工具（纯前端本地运算） =====
  'rmb-uppercase': () =>
    import('~/components/tool/RmbUppercaseTool.vue').then(
      (m) => m.default || m,
    ),
  'check-date-uppercase': () =>
    import('~/components/tool/CheckDateUppercaseTool.vue').then(
      (m) => m.default || m,
    ),
  'english-amount-uppercase': () =>
    import('~/components/tool/EnglishAmountUppercaseTool.vue').then(
      (m) => m.default || m,
    ),
  'tax-calculator': () =>
    import('~/components/tool/TaxCalculatorTool.vue').then(
      (m) => m.default || m,
    ),
  'income-tax-calculator': () =>
    import('~/components/tool/IncomeTaxCalculatorTool.vue').then(
      (m) => m.default || m,
    ),
  'labor-income-tax': () =>
    import('~/components/tool/LaborIncomeTaxTool.vue').then(
      (m) => m.default || m,
    ),
  'currency-exchange': () =>
    import('~/components/tool/CurrencyExchangeTool.vue').then(
      (m) => m.default || m,
    ),
  'world-currencies': () =>
    import('~/components/tool/WorldCurrenciesTool.vue').then(
      (m) => m.default || m,
    ),
  'number-sum': () =>
    import('~/components/tool/NumberSumTool.vue').then(
      (m) => m.default || m,
    ),
  'contract-payment': () =>
    import('~/components/tool/ContractPaymentTool.vue').then(
      (m) => m.default || m,
    ),
  'loan-calculator': () =>
    import('~/components/tool/LoanCalculatorTool.vue').then(
      (m) => m.default || m,
    ),
}

/**
 * 检查 slug 是否已注册工具组件
 */
export function hasTool(slug: string): boolean {
  return slug in toolRegistry
}
