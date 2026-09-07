/**
 * imageBase64.ts - 图片与 Base64 互转纯函数
 *
 * 严格移植自 panziui/tools/image-base64.html 内联 script 的核心转换逻辑：
 * - fileToImageBase64：浏览器端将图片 File 转为 Data URI（保留 data:...;base64, 前缀）
 *   校验文件类型与大小（≤ 5MB），失败时返回中文错误信息。
 * - normalizeBase64ToImageSrc：将用户输入的字符串归一化为可渲染的图片 Data URI。
 *   兼容纯 Base64 字符串（自动补默认 PNG 前缀）与完整 Data URI，
 *   通过正则校验格式合法性，不涉及 DOM。
 *
 * 图片实际渲染与尺寸读取由组件完成（<img> 元素）。
 * fileToImageBase64 依赖浏览器 FileReader（与 base64.ts 的 fileToBase64 一致）。
 */

/** 图片大小上限：5MB */
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024

/** 编码/解码操作结果 */
export interface ImageBase64Result {
  success: boolean
  output?: string
  error?: string
  /** 解析得到的元信息（MIME 类型、Base64 长度等） */
  meta?: {
    type: string
    length: number
  }
}

/**
 * 将图片 File 对象转换为 Data URI（保留 data:...;base64, 前缀）
 *
 * 校验：必须是图片类型（image/*），且大小不超过 5MB。
 *
 * @param file 浏览器 File 对象
 * @returns 成功返回 { success: true, output: dataUri, meta }，失败返回 { success: false, error }
 */
export function fileToImageBase64(file: File): Promise<ImageBase64Result> {
  return new Promise<ImageBase64Result>((resolve) => {
    if (!file) {
      resolve({ success: false, error: '未选择文件' })
      return
    }
    if (!file.type.startsWith('image/')) {
      resolve({
        success: false,
        error: '请选择图片文件（PNG / JPG / GIF / WebP / SVG 等）',
      })
      return
    }
    if (file.size > IMAGE_MAX_SIZE) {
      resolve({
        success: false,
        error: '图片大小超过 5MB 限制',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        resolve({ success: false, error: '读取文件失败：不支持的结果类型' })
        return
      }
      resolve({
        success: true,
        output: result,
        meta: { type: file.type || '未知类型', length: result.length },
      })
    }
    reader.onerror = () => {
      resolve({ success: false, error: '读取文件失败，请重试' })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 将用户输入的 Base64 字符串归一化为可渲染的图片 Data URI
 *
 * - 若输入为完整 Data URI（data:image/...;base64,...），原样返回。
 * - 若输入为纯 Base64 字符串，自动补默认 PNG 前缀。
 * - 通过正则校验格式合法性，不涉及 DOM。
 *
 * @param input Data URI 或纯 Base64 字符串
 * @returns 成功返回 { success: true, output: src, meta }，失败返回 { success: false, error }
 */
export function normalizeBase64ToImageSrc(
  input: string,
): ImageBase64Result {
  if (input === '') return { success: true, output: '' }

  const trimmed = input.trim()
  let src = trimmed
  if (!src.startsWith('data:')) {
    src = 'data:image/png;base64,' + trimmed
  }

  // 基础格式校验：data:image/xxx;base64,<合法 Base64 字符（允许空白）>
  const m = src.match(/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=\s]+)$/i)
  if (!m) {
    return {
      success: false,
      error: '无法识别的格式：请粘贴 Data URI 或纯 Base64 字符串',
    }
  }

  return {
    success: true,
    output: src,
    meta: { type: m[1], length: src.length },
  }
}
