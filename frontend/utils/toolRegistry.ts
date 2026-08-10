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
}

/**
 * 检查 slug 是否已注册工具组件
 */
export function hasTool(slug: string): boolean {
  return slug in toolRegistry
}
