/**
 * image.ts - 图片工具共享纯函数
 *
 * 供图片压缩 / 裁剪 / 格式转换三个工具复用。所有图片处理在浏览器本地完成
 * (基于原生 Canvas API + 手动 EXIF 解析),不引入第三方图片处理库,不上传服务器。
 *
 * 导出:
 * - readExifOrientation(file)  从 JPEG 读取 EXIF Orientation 标签(1-8)
 * - loadImageWithOrientation  加载图片并通过 Canvas 修正方向
 * - canvasToBlob              Canvas 转 Blob
 * - formatFileSize            格式化文件大小
 * - downloadBlob              触发浏览器下载
 * - resizeCanvas              按最大宽高缩放 canvas(保持比例)
 * - calculateResize           计算缩放后尺寸(纯函数,便于测试)
 * - getOrientedDimensions     计算 EXIF 方向修正后输出尺寸(纯函数,便于测试)
 * - getOutputFilename         根据目标格式生成输出文件名
 * - 类型 ImageFormat
 */

/** 支持的输出图片格式(MIME) */
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp'

/* =========================================================================
 * 纯函数(无 DOM 依赖,便于单元测试)
 * ========================================================================= */

/**
 * 格式化文件大小为人类可读字符串(B / KB / MB / GB)。
 *
 * @param bytes 字节数
 * @returns 形如 "512 B" / "1.50 KB" / "2.40 MB" 的字符串
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * 计算按最大宽高保持比例缩放后的尺寸。
 *
 * 规则:仅在超过限制时缩小,不放大。先按最大宽度约束,再按最大高度约束,
 * 保证最终尺寸同时满足两个上限且保持原始宽高比。
 *
 * @param width   原始宽度
 * @param height  原始高度
 * @param maxW    最大宽度(<=0 表示不限制)
 * @param maxH    最大高度(<=0 表示不限制)
 */
export function calculateResize(
  width: number,
  height: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  let w = Math.max(1, Math.round(width))
  let h = Math.max(1, Math.round(height))

  // 无任何限制
  if ((!maxW || maxW <= 0) && (!maxH || maxH <= 0)) {
    return { width: w, height: h }
  }

  // 先约束宽度
  if (maxW > 0 && w > maxW) {
    const ratio = maxW / w
    w = maxW
    h = Math.max(1, Math.round(height * ratio))
  }

  // 再约束高度(使用更新后的 w)
  if (maxH > 0 && h > maxH) {
    const ratio = maxH / h
    h = maxH
    w = Math.max(1, Math.round(w * ratio))
  }

  return { width: w, height: h }
}

/**
 * 计算 EXIF 方向修正后的输出尺寸。
 *
 * orientation 5-8 涉及 90° 旋转,输出宽高互换;1-4 保持原始宽高。
 *
 * @param width       原始宽度
 * @param height      原始高度
 * @param orientation EXIF Orientation(1-8),其它值视为 1
 */
export function getOrientedDimensions(
  width: number,
  height: number,
  orientation: number,
): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width }
  }
  return { width, height }
}

/**
 * 根据目标格式生成输出文件名(替换扩展名)。
 *
 * @param originalName 原始文件名
 * @param format       目标 MIME 格式
 */
export function getOutputFilename(
  originalName: string,
  format: ImageFormat,
): string {
  const dot = originalName.lastIndexOf('.')
  const base = dot > 0 ? originalName.slice(0, dot) : originalName
  const ext =
    format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp'
  return `${base}.${ext}`
}

/* =========================================================================
 * EXIF Orientation 解析(手动解析 JPEG APP1 段,无第三方库)
 * ========================================================================= */

/**
 * 读取 16 位无符号整数(按指定字节序)。
 */
function readUint16(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number {
  if (offset < 0 || offset + 1 >= bytes.length) return 0
  return littleEndian
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1]
}

/**
 * 读取 32 位无符号整数(按指定字节序)。
 */
function readUint32(
  bytes: Uint8Array,
  offset: number,
  littleEndian: boolean,
): number {
  if (offset < 0 || offset + 3 >= bytes.length) return 0
  return littleEndian
    ? (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
        0
    : ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
        0
}

/**
 * 从 JPEG 字节流解析 EXIF Orientation。
 *
 * 解析流程:
 * 1. 校验 SOI 标记(0xFFD8)
 * 2. 遍历 JPEG 段,定位 APP1(0xFFE1)段
 * 3. 校验 "Exif\0\0" 头,进入 TIFF 头
 * 4. 读取字节序(II/MM)、魔数 0x002A、IFD0 偏移
 * 5. 遍历 IFD0 条目,找到 Orientation 标签(0x0112)并返回其值
 *
 * 非 JPEG、无 EXIF、无 Orientation 标签均返回 1(正常)。
 */
function parseExifOrientationFromBuffer(bytes: Uint8Array): number {
  // 校验 SOI 标记
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return 1
  }

  let offset = 2 // 跳过 SOI
  // 遍历 JPEG 段
  while (offset + 1 < bytes.length) {
    // 段以 0xFF 开头
    if (bytes[offset] !== 0xff) break
    // 跳过连续填充 0xFF
    let marker = bytes[offset + 1]
    while (marker === 0xff && offset + 2 < bytes.length) {
      offset++
      marker = bytes[offset + 1]
    }

    // SOI(0xD8) / EOI(0xD9) 无长度字段
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }
    // SOS(0xDA):扫描数据开始,后续为图像数据,EXIF 不会在之后
    if (marker === 0xda) break

    // 读取段长度(大端,包含 2 字节长度字段本身)
    if (offset + 3 >= bytes.length) break
    const segLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
    if (segLength < 2) break

    // APP1 段(0xE1):可能包含 EXIF
    if (marker === 0xe1) {
      const dataStart = offset + 4 // 跳过 FF E1 + 长度(2)
      // 校验 "Exif\0\0"(6 字节)
      if (
        dataStart + 6 <= bytes.length &&
        bytes[dataStart] === 0x45 && // E
        bytes[dataStart + 1] === 0x78 && // x
        bytes[dataStart + 2] === 0x69 && // i
        bytes[dataStart + 3] === 0x66 && // f
        bytes[dataStart + 4] === 0x00 &&
        bytes[dataStart + 5] === 0x00
      ) {
        return parseTiffIfdOrientation(bytes, dataStart + 6)
      }
    }

    offset += 2 + segLength
  }

  return 1
}

/**
 * 解析 TIFF 头与 IFD0,返回 Orientation 值。
 *
 * @param bytes     完整字节流
 * @param tiffStart TIFF 头起始偏移("Exif\0\0" 之后)
 */
function parseTiffIfdOrientation(bytes: Uint8Array, tiffStart: number): number {
  if (tiffStart + 8 > bytes.length) return 1

  // 字节序:II(0x4949)= 小端,MM(0x4D4D)= 大端
  let littleEndian: boolean
  if (bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49) {
    littleEndian = true
  } else if (bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d) {
    littleEndian = false
  } else {
    return 1
  }

  // 魔数 0x002A
  const magic = readUint16(bytes, tiffStart + 2, littleEndian)
  if (magic !== 0x002a) return 1

  // IFD0 偏移(相对 tiffStart)
  const ifd0Offset = readUint32(bytes, tiffStart + 4, littleEndian)
  const ifd0Start = tiffStart + ifd0Offset
  if (ifd0Start + 2 > bytes.length) return 1

  const entryCount = readUint16(bytes, ifd0Start, littleEndian)
  let entryOffset = ifd0Start + 2

  for (let i = 0; i < entryCount; i++) {
    if (entryOffset + 12 > bytes.length) break
    const tag = readUint16(bytes, entryOffset, littleEndian)
    const type = readUint16(bytes, entryOffset + 2, littleEndian)
    const count = readUint32(bytes, entryOffset + 4, littleEndian)

    // Orientation 标签 0x0112,类型 SHORT(3),数量 1
    if (tag === 0x0112 && type === 3 && count === 1) {
      const value = readUint16(bytes, entryOffset + 8, littleEndian)
      if (value >= 1 && value <= 8) return value
      return 1
    }
    entryOffset += 12
  }

  return 1
}

/**
 * 从 JPEG 文件读取 EXIF Orientation 标签(1-8)。
 *
 * 非 JPEG 文件、无 EXIF 数据、无 Orientation 标签均返回 1(正常方向)。
 * 仅读取文件头部(前 64KB)用于解析,避免读取整张大图。
 *
 * @param file 浏览器 File 对象
 */
export async function readExifOrientation(file: File): Promise<number> {
  // 快速跳过非 JPEG(按 MIME 与扩展名)
  const isJpeg =
    file.type === 'image/jpeg' ||
    file.type === 'image/jpg' ||
    /\.jpe?g$/i.test(file.name)
  if (!isJpeg) return 1

  const headerSize = Math.min(file.size, 65536)
  if (headerSize <= 0) return 1
  const buffer = await file.slice(0, headerSize).arrayBuffer()
  return parseExifOrientationFromBuffer(new Uint8Array(buffer))
}

/* =========================================================================
 * DOM 相关函数(浏览器环境,仅客户端调用)
 * ========================================================================= */

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'))
    }, 30000)
    img.onload = () => {
      clearTimeout(timeout)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

function drawImageWithOrientation(
  img: HTMLImageElement,
  orientation: number,
): HTMLCanvasElement {
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  const dims = getOrientedDimensions(width, height, orientation)
  canvas.width = dims.width
  canvas.height = dims.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.width = width
    canvas.height = height
    const fallbackCtx = canvas.getContext('2d')
    if (fallbackCtx) fallbackCtx.drawImage(img, 0, 0, width, height)
    return canvas
  }

  switch (orientation) {
    case 2:
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      break
    case 3:
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      break
    case 4:
      ctx.translate(0, height)
      ctx.scale(1, -1)
      break
    case 5:
      ctx.rotate(0.5 * Math.PI)
      ctx.scale(1, -1)
      break
    case 6:
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(0, -height)
      break
    case 7:
      ctx.rotate(0.5 * Math.PI)
      ctx.translate(width, -height)
      ctx.scale(-1, 1)
      break
    case 8:
      ctx.rotate(-0.5 * Math.PI)
      ctx.translate(-width, 0)
      break
    default:
      break
  }

  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

export async function loadImageWithOrientation(
  file: File,
): Promise<HTMLCanvasElement> {
  const orientation = await readExifOrientation(file)
  const url = URL.createObjectURL(file)
  try {
    const img = await loadHtmlImage(url)
    return drawImageWithOrientation(img, orientation)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let completed = false
    const timeout = setTimeout(() => {
      if (completed) return
      completed = true
      console.warn('canvasToBlob: toBlob timeout, falling back to toDataURL')
      try {
        const dataUrl = canvas.toDataURL(type, quality)
        fetch(dataUrl)
          .then((r) => r.blob())
          .then(resolve)
          .catch((e) => reject(new Error('Canvas 转 Blob 失败: ' + e.message)))
      } catch (e) {
        reject(new Error('Canvas 转 Blob 失败: ' + (e as Error).message))
      }
    }, 5000)
    canvas.toBlob(
      (blob) => {
        if (completed) return
        completed = true
        clearTimeout(timeout)
        if (blob) resolve(blob)
        else {
          console.warn('canvasToBlob: toBlob returned null, falling back to toDataURL')
          try {
            const dataUrl = canvas.toDataURL(type, quality)
            fetch(dataUrl)
              .then((r) => r.blob())
              .then(resolve)
              .catch((e) => reject(new Error('Canvas 转 Blob 失败: ' + e.message)))
          } catch (e) {
            reject(new Error('Canvas 转 Blob 失败: ' + (e as Error).message))
          }
        }
      },
      type,
      quality,
    )
  })
}

/**
 * 按最大宽高缩放 canvas(保持原始比例,仅缩小不放大),
 * 返回新的 canvas。
 *
 * @param source 源 canvas
 * @param maxW   最大宽度(<=0 表示不限制)
 * @param maxH   最大高度(<=0 表示不限制)
 */
export function resizeCanvas(
  source: HTMLCanvasElement,
  maxW: number,
  maxH: number,
): HTMLCanvasElement {
  const { width: sw, height: sh } = source
  const { width: tw, height: th } = calculateResize(sw, sh, maxW, maxH)

  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return source

  // 尺寸未变化时直接拷贝,保证返回独立 canvas
  ctx.drawImage(source, 0, 0, tw, th)
  return canvas
}

/**
 * 触发浏览器下载一个 Blob。
 *
 * @param blob     要下载的数据
 * @param filename 下载文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟回收,确保下载已触发
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
