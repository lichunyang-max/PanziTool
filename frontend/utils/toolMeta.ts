/**
 * toolMeta.ts - 工具静态元数据（降级数据源）
 *
 * 用途：
 * - 预渲染（nuxt generate）时 API 不可用，提供完整的名称、描述、FAQ
 * - 客户端水合后 API 数据会覆盖这些降级值（use_count / like_count 等）
 * - 保证百度爬虫抓取到的是有意义的中文内容，而非 slug 空壳
 */

export interface ToolFaqItem {
  question: string
  answer: string
}

export interface ToolStaticMeta {
  slug: string
  name: string
  description: string
  keywords: string
  category: 'developer' | 'image'
  faq: ToolFaqItem[]
}

export const toolStaticMeta: Record<string, ToolStaticMeta> = {
  'json-formatter': {
    slug: 'json-formatter',
    name: 'JSON格式化',
    description: '免费在线JSON格式化工具，支持美化、压缩、语法校验、错误定位，免登录打开即用，代码本地处理安全可靠。',
    keywords: 'JSON格式化,JSON美化,JSON压缩,JSON校验',
    category: 'developer',
    faq: [
      {
        question: 'JSON格式化工具有哪些功能？',
        answer: '支持JSON美化（缩进格式化）、压缩（去除空白）、语法校验（错误行列定位）三大核心功能，全部在浏览器本地处理，不上传服务器。',
      },
      {
        question: '数据是否安全？',
        answer: '所有JSON数据均在浏览器本地处理，不会上传到服务器，完全保障数据隐私安全。',
      },
      {
        question: '支持多大的JSON文件？',
        answer: '支持处理1MB以内的JSON文本，超过1MB会显示警告提示，建议缩减输入以获得更好性能。',
      },
    ],
  },
  'regex-tester': {
    slug: 'regex-tester',
    name: '正则表达式测试',
    description: '免费在线正则表达式测试工具，支持实时匹配、结果高亮、分组信息展示，内置常用正则模板，免登录打开即用，本地运算保障数据安全。',
    keywords: '正则测试,正则表达式,正则匹配,在线正则',
    category: 'developer',
    faq: [
      {
        question: '正则测试工具支持哪些标志位？',
        answer: '支持 g（全局匹配）、i（忽略大小写）、m（多行模式）、s（dotAll）、u（Unicode）五种标志位，可自由组合。',
      },
      {
        question: '如何查看匹配分组信息？',
        answer: '执行匹配后，分组信息卡片会展示每个捕获组的内容和索引，方便调试复杂正则表达式。',
      },
      {
        question: '是否有 ReDoS 防护？',
        answer: '工具使用 try-catch 包裹执行，最大匹配数限制为 10000，防止灾难性回溯导致浏览器卡死。',
      },
    ],
  },
  timestamp: {
    slug: 'timestamp',
    name: '时间戳转换',
    description: '免费在线Unix时间戳转换工具，支持秒/毫秒级互转、多时区切换、常用时间参考，免登录打开即用，本地计算精准高效。',
    keywords: '时间戳转换,Unix时间戳,时间转换,在线时间戳',
    category: 'developer',
    faq: [
      {
        question: '支持秒级和毫秒级时间戳吗？',
        answer: '支持秒级和毫秒级Unix时间戳互转，自动识别时间戳类型，可手动切换。',
      },
      {
        question: '支持哪些时区？',
        answer: '支持UTC、北京时间（UTC+8）等常用时区切换，方便不同地区的开发者使用。',
      },
    ],
  },
  'url-encode': {
    slug: 'url-encode',
    name: 'URL编码解码',
    description: '免费在线URL编码解码工具，支持UrlEncode/Decode互转、批量处理、多种编码函数，附特殊字符对照表，免登录打开即用，本地处理数据安全。',
    keywords: 'URL编码解码,UrlEncode,UrlDecode,URL转换',
    category: 'developer',
    faq: [
      {
        question: 'URL编码解码工具支持哪些功能？',
        answer: '支持UrlEncode编码、UrlDecode解码、批量处理，以及encodeURIComponent/decodeURIComponent等多种编码函数。',
      },
      {
        question: '有特殊字符对照表吗？',
        answer: '内置常用特殊字符的编码对照表，方便快速查询空格、中文、符号等字符的编码结果。',
      },
    ],
  },
  'jwt-decoder': {
    slug: 'jwt-decoder',
    name: 'JWT解析工具',
    description: '免费在线JWT解析工具，快速解密JWT Token头部与载荷信息，附全量算法参考，本地解析不上传，保障接口调试数据安全。',
    keywords: 'JWT解析,JWT解密,Token解析,JWT校验',
    category: 'developer',
    faq: [
      {
        question: 'JWT解析工具会上传Token吗？',
        answer: '不会。所有JWT Token均在浏览器本地解析，不上传服务器，保障接口调试数据安全。',
      },
      {
        question: '支持哪些JWT算法？',
        answer: '支持解析HS256、HS384、HS512、RS256等常见算法的JWT Token，展示Header和Payload详情。',
      },
    ],
  },
  base64: {
    slug: 'base64',
    name: 'Base64编码解码',
    description: '免费在线Base64编码解码工具，支持文本与图片文件互转，兼容UTF-8编码，免登录打开即用，本地浏览器处理保障数据安全。',
    keywords: 'Base64编码,Base64解码,Base64转换,图片Base64',
    category: 'developer',
    faq: [
      {
        question: 'Base64工具支持图片转换吗？',
        answer: '支持将图片文件转换为Base64编码字符串，也支持将Base64字符串解码还原为图片。',
      },
      {
        question: '兼容中文编码吗？',
        answer: '完全兼容UTF-8编码，中文文本可正确进行Base64编解码。',
      },
    ],
  },
  hash: {
    slug: 'hash',
    name: '哈希计算',
    description: '免费在线哈希计算工具，支持MD5/SHA1/SHA256等多种算法，文本与文件均可计算，本地浏览器运算不上传，保障数据安全，免登录即用。',
    keywords: '哈希计算,MD5加密,SHA256,在线加密',
    category: 'developer',
    faq: [
      {
        question: '哈希计算工具支持哪些算法？',
        answer: '支持MD5、SHA1、SHA256、SHA512等多种哈希算法，可同时计算多种算法结果。',
      },
      {
        question: '可以计算文件的哈希值吗？',
        answer: '支持拖拽或选择文件计算哈希值，文件在浏览器本地读取，不上传服务器。',
      },
    ],
  },
  'image-compress': {
    slug: 'image-compress',
    name: '图片压缩',
    description: '免费在线图片压缩工具，支持JPG/PNG/WEBP批量压缩，自定义尺寸与画质，本地浏览器处理不上传服务器，保护隐私，免登录一键下载。',
    keywords: '图片压缩,在线压缩图片,JPG压缩,PNG压缩',
    category: 'image',
    faq: [
      {
        question: '图片压缩支持哪些格式？',
        answer: '支持JPG、PNG、WEBP格式的图片压缩，可自定义压缩质量和输出尺寸。',
      },
      {
        question: '图片会上传到服务器吗？',
        answer: '不会。所有图片压缩均在浏览器本地使用Canvas处理，不上传服务器，保护隐私安全。',
      },
      {
        question: '支持批量压缩吗？',
        answer: '支持批量上传多张图片同时压缩，一键下载压缩后的图片。',
      },
    ],
  },
  'image-crop': {
    slug: 'image-crop',
    name: '图片裁剪',
    description: '免费在线图片裁剪工具，支持自定义尺寸、多比例裁剪、旋转翻转，本地浏览器处理不上传，免登录一键导出高清原图。',
    keywords: '图片裁剪,在线裁剪图片,图片旋转,自定义尺寸',
    category: 'image',
    faq: [
      {
        question: '图片裁剪支持哪些比例？',
        answer: '支持自由裁剪和1:1、4:3、16:9等常用比例裁剪，可自定义裁剪尺寸。',
      },
      {
        question: '可以旋转和翻转图片吗？',
        answer: '支持90度旋转和水平/垂直翻转，方便调整图片方向后再裁剪。',
      },
    ],
  },
  'image-convert': {
    slug: 'image-convert',
    name: '图片格式转换',
    description: '免费在线图片格式转换工具，支持PNG/JPG/WEBP无损互转，保留透明背景，本地浏览器处理不上传，免登录批量转换。',
    keywords: '图片格式转换,PNG转JPG,WEBP转换,在线转格式',
    category: 'image',
    faq: [
      {
        question: '图片格式转换支持哪些格式？',
        answer: '支持PNG、JPG、WEBP三种格式互转，可根据需要选择输出格式。',
      },
      {
        question: 'PNG转JPG会丢失透明背景吗？',
        answer: 'PNG转JPG时透明背景会变为白色，如需保留透明背景请使用WEBP或PNG格式输出。',
      },
    ],
  },
  'qr-code': {
    slug: 'qr-code',
    name: '二维码生成器',
    description: '免费在线二维码生成工具，支持文本/链接/WiFi/邮箱内容、自定义颜色尺寸、纠错等级与 Logo 嵌入，本地生成不上传，免登录打开即用，隐私安全有保障。',
    keywords: '二维码生成,二维码制作,在线二维码,WiFi二维码,二维码Logo',
    category: 'developer',
    faq: [
      {
        question: '二维码生成工具支持哪些内容类型？',
        answer: '支持纯文本、网址链接、WiFi 信息和邮箱地址四种类型。WiFi 二维码扫描后可直接连接网络，邮箱二维码可预填收件人和主题。',
      },
      {
        question: '数据是否安全？',
        answer: '所有二维码均在浏览器本地生成，内容不会上传到服务器，隐私安全有保障。',
      },
      {
        question: '如何选择纠错等级？',
        answer: '纠错等级越高抗污损能力越强但数据密度越高。嵌入 Logo 时建议选择 Q 或 H 等级以保证可识别性。',
      },
      {
        question: '可以自定义二维码样式吗？',
        answer: '可自定义前景色、背景色、尺寸、边距，并支持上传 Logo 图片嵌入，保持深色前景配浅色背景可提高扫码成功率。',
      },
    ],
  },
  'id-photo': {
    slug: 'id-photo',
    name: 'AI证件照',
    description: '免费在线AI证件照制作工具，支持一键抠图换底色、九种标准尺寸规格（一寸/二寸等）300DPI高清输出，浏览器本地处理不上传，免登录即用，保护隐私安全。',
    keywords: 'AI证件照,证件照制作,证件照换底色,一寸照,二寸照,在线证件照',
    category: 'image',
    faq: [
      { question: 'AI证件照工具支持哪些底色？', answer: '支持白、浅蓝、深蓝、红色、渐变、浅灰六种常见证件照底色，制作后可随时切换实时预览。' },
      { question: '支持哪些证件照尺寸？', answer: '支持一寸、小一寸、大一寸、二寸、小二寸、大二寸、三寸、四寸、五寸共九种标准规格，按300DPI换算像素输出。' },
      { question: '照片会传到服务器吗？', answer: '不会。人像抠图与合成全部在浏览器本地使用AI模型完成，照片数据不会离开您的设备。' },
      { question: '支持哪些图片格式？', answer: '支持JPG、JPEG、PNG格式上传，图片长宽需小于8000像素。' },
    ],
  },
}

/**
 * 获取工具静态元数据，不存在时返回 null
 */
export function getToolStaticMeta(slug: string): ToolStaticMeta | null {
  return toolStaticMeta[slug] || null
}
