import { describe, expect, it, vi } from 'vitest'
import {
  calculateResize,
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  getOrientedDimensions,
  getOutputFilename,
  readExifOrientation,
  resizeCanvas,
  type ImageFormat,
} from './image'

/**
 * image.ts 单元测试
 *
 * - 纯函数(formatFileSize / calculateResize / getOrientedDimensions /
 *   getOutputFilename)直接断言返回值。
 * - EXIF 解析(readExifOrientation)通过手动构造包含 EXIF Orientation 标签的
 *   最小 JPEG 字节流进行验证,覆盖小端(II)与大端(MM)字节序、1-8 全部方向。
 * - DOM 相关函数(canvasToBlob / resizeCanvas / downloadBlob)在 happy-dom 环境
 *   下通过 mock canvas.toBlob 等方式测试其 Promise 包装与流程逻辑。
 */

/* =========================================================================
 * 辅助:构造包含 EXIF Orientation 的最小 JPEG 字节流
 * ========================================================================= */

/**
 * 构造一个最小 JPEG 字节流,其 APP1 EXIF 段包含指定 Orientation 值。
 *
 * 结构:
 *   FF D8                         SOI
 *   FF E1 LL LL                   APP1 段(长度大端)
 *   45 78 69 66 00 00             "Exif\0\0"
 *   <TIFF 头 + IFD0 Orientation>  按指定字节序
 *   FF D9                         EOI
 *
 * @param orientation 方向值(1-8)
 * @param byteOrder   'LE'(II 小端)或 'BE'(MM 大端)
 */
function buildJpegWithOrientation(
  orientation: number,
  byteOrder: 'LE' | 'BE' = 'LE',
): Uint8Array {
  const parts: number[] = []

  // SOI
  parts.push(0xff, 0xd8)

  // EXIF payload = "Exif\0\0" + TIFF 头(8) + IFD0(2 + 12 = 14)
  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] // "Exif\0\0"

  // TIFF 头
  const tiffHeader: number[] = []
  if (byteOrder === 'LE') {
    tiffHeader.push(0x49, 0x49) // "II"
    tiffHeader.push(0x2a, 0x00) // 0x002A LE
    tiffHeader.push(0x08, 0x00, 0x00, 0x00) // IFD0 offset = 8 LE
  } else {
    tiffHeader.push(0x4d, 0x4d) // "MM"
    tiffHeader.push(0x00, 0x2a) // 0x002A BE
    tiffHeader.push(0x00, 0x00, 0x00, 0x08) // IFD0 offset = 8 BE
  }

  // IFD0:1 个条目
  const ifd: number[] = []
  if (byteOrder === 'LE') {
    ifd.push(0x01, 0x00) // count = 1 LE
    ifd.push(0x12, 0x01) // tag 0x0112 LE
    ifd.push(0x03, 0x00) // type SHORT(3) LE
    ifd.push(0x01, 0x00, 0x00, 0x00) // count = 1 LE
    ifd.push(orientation & 0xff, (orientation >> 8) & 0xff, 0x00, 0x00) // value LE
  } else {
    ifd.push(0x00, 0x01) // count = 1 BE
    ifd.push(0x01, 0x12) // tag 0x0112 BE
    ifd.push(0x00, 0x03) // type SHORT(3) BE
    ifd.push(0x00, 0x00, 0x00, 0x01) // count = 1 BE
    ifd.push((orientation >> 8) & 0xff, orientation & 0xff, 0x00, 0x00) // value BE
  }

  const payload = [...exifHeader, ...tiffHeader, ...ifd]
  const segLength = 2 + payload.length // 长度字段含自身 2 字节
  parts.push(0xff, 0xe1)
  parts.push((segLength >> 8) & 0xff, segLength & 0xff) // 长度大端
  parts.push(...payload)

  // EOI
  parts.push(0xff, 0xd9)

  return new Uint8Array(parts)
}

/** 构造一个无 EXIF 的 JPEG(仅 SOI + 一个非 APP1 段 + EOI) */
function buildJpegWithoutExif(): Uint8Array {
  const parts: number[] = [0xff, 0xd8] // SOI
  // APP0 段(JFIF),非 EXIF
  const app0Payload = [0x4a, 0x46, 0x49, 0x46, 0x00] // "JFIF\0"
  const segLength = 2 + app0Payload.length
  parts.push(0xff, 0xe0)
  parts.push((segLength >> 8) & 0xff, segLength & 0xff)
  parts.push(...app0Payload)
  parts.push(0xff, 0xd9) // EOI
  return new Uint8Array(parts)
}

/** 从 Uint8Array 构造 File 对象 */
function bytesToFile(
  bytes: Uint8Array,
  name: string,
  type: string,
): File {
  return new File([bytes], name, { type })
}

/* =========================================================================
 * formatFileSize
 * ========================================================================= */

describe('formatFileSize', () => {
  it('0 字节返回 "0 B"', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('小于 1KB 返回 B', () => {
    expect(formatFileSize(1)).toBe('1 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('1KB 边界返回 KB', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB')
  })

  it('1536 字节返回 1.50 KB', () => {
    expect(formatFileSize(1536)).toBe('1.50 KB')
  })

  it('1MB 边界返回 MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB')
  })

  it('2.4 MB 返回 "2.40 MB"', () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2.40 MB')
  })

  it('1GB 边界返回 GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB')
  })

  it('负数与非数字返回 "0 B"', () => {
    expect(formatFileSize(-100)).toBe('0 B')
    expect(formatFileSize(Number.NaN)).toBe('0 B')
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe('0 B')
  })
})

/* =========================================================================
 * calculateResize(resizeCanvas 的纯函数核心)
 * ========================================================================= */

describe('calculateResize', () => {
  it('无限制时保持原尺寸', () => {
    expect(calculateResize(4000, 3000, 0, 0)).toEqual({
      width: 4000,
      height: 3000,
    })
  })

  it('仅限制宽度时按比例缩小', () => {
    // 4000x3000 -> maxW 1920 -> 1920x1440
    expect(calculateResize(4000, 3000, 1920, 0)).toEqual({
      width: 1920,
      height: 1440,
    })
  })

  it('仅限制高度时按比例缩小', () => {
    // 4000x3000 -> maxH 1080 -> 1440x1080
    expect(calculateResize(4000, 3000, 0, 1080)).toEqual({
      width: 1440,
      height: 1080,
    })
  })

  it('同时限制宽高且宽度为主导约束', () => {
    // 4000x3000,maxW 1920,maxH 1080
    // 先按宽:1920x1440;1440 > 1080,再按高:1440x1080
    expect(calculateResize(4000, 3000, 1920, 1080)).toEqual({
      width: 1440,
      height: 1080,
    })
  })

  it('同时限制宽高且高度为主导约束', () => {
    // 3000x4000,maxW 1920,maxH 1080
    // 先按宽:1920x2560;2560 > 1080,再按高:810x1080
    expect(calculateResize(3000, 4000, 1920, 1080)).toEqual({
      width: 810,
      height: 1080,
    })
  })

  it('尺寸小于限制时不放大', () => {
    expect(calculateResize(800, 600, 1920, 1080)).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('尺寸刚好等于限制时不变', () => {
    expect(calculateResize(1920, 1080, 1920, 1080)).toEqual({
      width: 1920,
      height: 1080,
    })
  })

  it('宽度限制大于原始宽度时按高度约束', () => {
    // 2000x4000,maxW 1920,maxH 1000
    // 先按宽:1920x3840;3840 > 1000,再按高:500x1000
    expect(calculateResize(2000, 4000, 1920, 1000)).toEqual({
      width: 500,
      height: 1000,
    })
  })
})

/* =========================================================================
 * getOrientedDimensions(EXIF 方向尺寸计算)
 * ========================================================================= */

describe('getOrientedDimensions', () => {
  it('orientation 1-4 保持原宽高', () => {
    expect(getOrientedDimensions(4000, 3000, 1)).toEqual({
      width: 4000,
      height: 3000,
    })
    expect(getOrientedDimensions(4000, 3000, 2)).toEqual({
      width: 4000,
      height: 3000,
    })
    expect(getOrientedDimensions(4000, 3000, 3)).toEqual({
      width: 4000,
      height: 3000,
    })
    expect(getOrientedDimensions(4000, 3000, 4)).toEqual({
      width: 4000,
      height: 3000,
    })
  })

  it('orientation 5-8 宽高互换', () => {
    expect(getOrientedDimensions(4000, 3000, 5)).toEqual({
      width: 3000,
      height: 4000,
    })
    expect(getOrientedDimensions(4000, 3000, 6)).toEqual({
      width: 3000,
      height: 4000,
    })
    expect(getOrientedDimensions(4000, 3000, 7)).toEqual({
      width: 3000,
      height: 4000,
    })
    expect(getOrientedDimensions(4000, 3000, 8)).toEqual({
      width: 3000,
      height: 4000,
    })
  })

  it('未知 orientation 视为正常(1)', () => {
    expect(getOrientedDimensions(4000, 3000, 0)).toEqual({
      width: 4000,
      height: 3000,
    })
    expect(getOrientedDimensions(4000, 3000, 9)).toEqual({
      width: 4000,
      height: 3000,
    })
  })
})

/* =========================================================================
 * getOutputFilename
 * ========================================================================= */

describe('getOutputFilename', () => {
  it('JPEG 输出替换为 jpg 扩展名', () => {
    expect(getOutputFilename('photo.png', 'image/jpeg')).toBe('photo.jpg')
    expect(getOutputFilename('photo.webp', 'image/jpeg')).toBe('photo.jpg')
  })

  it('PNG 输出替换为 png 扩展名', () => {
    expect(getOutputFilename('photo.jpg', 'image/png')).toBe('photo.png')
  })

  it('WEBP 输出替换为 webp 扩展名', () => {
    expect(getOutputFilename('photo.jpg', 'image/webp')).toBe('photo.webp')
  })

  it('无扩展名时追加扩展名', () => {
    expect(getOutputFilename('photo', 'image/jpeg')).toBe('photo.jpg')
  })

  it('保留文件名中的多个点', () => {
    expect(getOutputFilename('my.photo.file.png', 'image/webp')).toBe(
      'my.photo.file.webp',
    )
  })
})

/* =========================================================================
 * readExifOrientation
 * ========================================================================= */

describe('readExifOrientation', () => {
  it('非 JPEG 文件返回 1', async () => {
    const png = bytesToFile(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      'image.png',
      'image/png',
    )
    expect(await readExifOrientation(png)).toBe(1)
  })

  it('无 EXIF 的 JPEG 返回 1', async () => {
    const jpeg = bytesToFile(
      buildJpegWithoutExif(),
      'noexif.jpg',
      'image/jpeg',
    )
    expect(await readExifOrientation(jpeg)).toBe(1)
  })

  it('小端(II)字节序:1-8 全部方向', async () => {
    for (let o = 1; o <= 8; o++) {
      const jpeg = bytesToFile(
        buildJpegWithOrientation(o, 'LE'),
        `orient-${o}.jpg`,
        'image/jpeg',
      )
      expect(await readExifOrientation(jpeg)).toBe(o)
    }
  })

  it('大端(MM)字节序:1-8 全部方向', async () => {
    for (let o = 1; o <= 8; o++) {
      const jpeg = bytesToFile(
        buildJpegWithOrientation(o, 'BE'),
        `orient-be-${o}.jpg`,
        'image/jpeg',
      )
      expect(await readExifOrientation(jpeg)).toBe(o)
    }
  })

  it('按扩展名识别 JPEG(无 MIME 类型)', async () => {
    const jpeg = bytesToFile(
      buildJpegWithOrientation(6, 'LE'),
      'photo.JPG',
      '',
    )
    expect(await readExifOrientation(jpeg)).toBe(6)
  })

  it('空文件返回 1', async () => {
    const empty = bytesToFile(new Uint8Array(0), 'empty.jpg', 'image/jpeg')
    expect(await readExifOrientation(empty)).toBe(1)
  })

  it('损坏的 JPEG(无 SOI)返回 1', async () => {
    const broken = bytesToFile(
      new Uint8Array([0x00, 0x00, 0xff, 0xe1]),
      'broken.jpg',
      'image/jpeg',
    )
    expect(await readExifOrientation(broken)).toBe(1)
  })
})

/* =========================================================================
 * canvasToBlob(mock toBlob,测试 Promise 包装)
 * ========================================================================= */

describe('canvasToBlob', () => {
  it('应在 toBlob 回调返回 blob 时 resolve', async () => {
    const canvas = document.createElement('canvas')
    const fakeBlob = new Blob(['data'], { type: 'image/jpeg' })
    canvas.toBlob = vi.fn(
      (cb: BlobCallback) => cb(fakeBlob),
    ) as typeof canvas.toBlob

    const result = await canvasToBlob(canvas, 'image/jpeg', 0.8)
    expect(result).toBe(fakeBlob)
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.8,
    )
  })

  it('应在 toBlob 回调返回 null 时 reject', async () => {
    const canvas = document.createElement('canvas')
    canvas.toBlob = vi.fn(
      (cb: BlobCallback) => cb(null),
    ) as typeof canvas.toBlob

    await expect(canvasToBlob(canvas, 'image/png')).rejects.toThrow(
      'Canvas 转 Blob 失败',
    )
  })

  it('未传 quality 时不应将 quality 传给 toBlob', async () => {
    const canvas = document.createElement('canvas')
    const fakeBlob = new Blob(['data'], { type: 'image/png' })
    canvas.toBlob = vi.fn(
      (cb: BlobCallback) => cb(fakeBlob),
    ) as typeof canvas.toBlob

    await canvasToBlob(canvas, 'image/png')
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/png',
      undefined,
    )
  })
})

/* =========================================================================
 * resizeCanvas(mock getContext,测试尺寸应用)
 * ========================================================================= */

describe('resizeCanvas', () => {
  it('应创建目标尺寸的 canvas 并调用 drawImage', () => {
    const source = document.createElement('canvas')
    source.width = 4000
    source.height = 3000

    const drawImageSpy = vi.fn()
    const ctxMock = { drawImage: drawImageSpy } as unknown as CanvasRenderingContext2D
    const createdCanvases: HTMLCanvasElement[] = []

    // 拦截 document.createElement('canvas') 返回可控 canvas
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const c = realCreate('canvas')
        c.getContext = vi.fn(
          () => ctxMock,
        ) as typeof c.getContext
        createdCanvases.push(c)
        return c
      }
      return realCreate(tag)
    })

    const result = resizeCanvas(source, 1920, 0)

    expect(createdCanvases).toHaveLength(1)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1440)
    expect(drawImageSpy).toHaveBeenCalledWith(source, 0, 0, 1920, 1440)

    vi.restoreAllMocks()
  })

  it('无 2D 上下文时回退返回源 canvas', () => {
    const source = document.createElement('canvas')
    source.width = 100
    source.height = 100

    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const c = realCreate('canvas')
        c.getContext = vi.fn(() => null) as typeof c.getContext
        return c
      }
      return realCreate(tag)
    })

    const result = resizeCanvas(source, 50, 50)
    expect(result).toBe(source)

    vi.restoreAllMocks()
  })
})

/* =========================================================================
 * downloadBlob(测试流程不抛错)
 * ========================================================================= */

describe('downloadBlob', () => {
  it('应创建锚点并触发点击,不抛出错误', () => {
    const blob = new Blob(['data'], { type: 'image/jpeg' })
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake-url')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

    expect(() => downloadBlob(blob, 'result.jpg')).not.toThrow()

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
    expect(revokeObjectURLSpy).not.toHaveBeenCalled() // 延迟回收,同步阶段未调用

    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
  })
})

/* =========================================================================
 * 类型导出验证(编译期保障)
 * ========================================================================= */

describe('ImageFormat 类型', () => {
  it('应接受三种 MIME 格式', () => {
    const formats: ImageFormat[] = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]
    expect(formats).toHaveLength(3)
  })
})
