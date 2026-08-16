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
      {
        question: 'JSON和JSONP有什么区别？',
        answer: 'JSON是一种轻量级数据交换格式，JSONP（JSON with Padding）是一种跨域数据传输方案，通过动态script标签包裹JSON数据实现跨域请求。JSONP已被CORS取代，现代开发中推荐使用JSON+CORS。',
      },
      {
        question: 'JSON支持注释吗？',
        answer: '标准JSON不支持注释。如需在配置文件中使用注释，可考虑JSONC（VS Code支持）或JSON5格式。本工具遵循标准JSON规范，不支持注释解析。',
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
      {
        question: '贪婪匹配和非贪婪匹配有什么区别？',
        answer: '贪婪匹配（如 .*）尽可能匹配更多字符，非贪婪匹配（如 .*?）尽可能匹配更少字符。例如对字符串 "a(b)c(d)e"，\\(.*\\) 贪婪匹配整个 "(b)c(d)"，而 \\(.*?\\) 非贪婪匹配 "(b)"。',
      },
      {
        question: '如何匹配中文？',
        answer: '使用 Unicode 属性转义 \\p{Han} 可匹配所有汉字，或使用 [\\u4e00-\\u9fa5] 匹配常用汉字。需开启 u 标志位。',
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
      {
        question: '什么是Unix时间戳？',
        answer: 'Unix时间戳是从1970年1月1日00:00:00 UTC开始经过的秒数（或毫秒数），是跨平台最通用的时间表示方式。32位系统的时间戳将在2038年溢出。',
      },
      {
        question: '如何获取当前时间戳？',
        answer: 'JavaScript中使用 Date.now() 获取毫秒级时间戳，Math.floor(Date.now()/1000) 获取秒级时间戳。Python中使用 import time; time.time() 获取秒级时间戳。',
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
      {
        question: 'encodeURI和encodeURIComponent有什么区别？',
        answer: 'encodeURI用于编码完整URL，不编码保留字符（如 :/?#@!$&\'()*+,;=）；encodeURIComponent用于编码URL参数，会编码所有特殊字符。构建查询字符串时应使用encodeURIComponent。',
      },
      {
        question: 'URL中的中文如何编码？',
        answer: 'URL中的中文使用UTF-8编码后再进行百分号编码，例如"中"字编码为%E4%B8%AD。现代浏览器和服务器通常自动处理中文URL编码。',
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
      {
        question: 'JWT的Payload是加密的吗？',
        answer: '不是。JWT的Header和Payload使用Base64URL编码，任何人都可以解码查看。JWT的安全性依赖Signature签名验证，不要在Payload中放置密码等敏感信息。',
      },
      {
        question: 'JWT和Session有什么区别？',
        answer: 'Session存储在服务端，通过Cookie中的Session ID关联，适合传统Web应用。JWT存储在客户端，自带用户信息，无需服务端查询，适合API和微服务架构。JWT是无状态的，更易于水平扩展。',
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
      {
        question: 'Base64是加密吗？',
        answer: 'Base64是编码而非加密，任何人都可以解码，不具备安全性。Base64用于在文本协议中传输二进制数据，如邮件附件、Data URI图片等场景。',
      },
      {
        question: 'Base64编码后数据会变大吗？',
        answer: '会。Base64编码后的数据比原始数据大约33%（每3字节编码为4个字符）。对于大文件，Base64编码会增加传输和存储开销。',
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
      {
        question: 'MD5和SHA256有什么区别？',
        answer: 'MD5输出128位（32位十六进制），已被证明存在碰撞漏洞，不适合安全场景。SHA256输出256位（64位十六进制），目前安全可靠，推荐用于密码存储和数字签名。',
      },
      {
        question: '哈希可以逆向解密吗？',
        answer: '哈希是单向函数，不可逆向解密。相同输入始终产生相同输出，但无法从输出反推输入。所谓"MD5解密"是通过彩虹表暴力匹配，而非真正的解密。',
      },
    ],
  },
  cron: {
    slug: 'cron',
    name: 'Cron表达式生成器',
    description: '免费在线Cron表达式生成与解析工具，支持5段/6段格式互转、中文解释、未来触发时间预览、常用模板一键填入，免登录打开即用，本地计算精准高效。',
    keywords: 'Cron表达式,Cron生成器,Cron解析,定时任务,crontab',
    category: 'developer',
    faq: [
      {
        question: 'Cron表达式工具支持5段和6段格式吗？',
        answer: '支持标准5段（分 时 日 月 周）和6段（秒 分 时 日 月 周）格式切换，自动适配解析逻辑。',
      },
      {
        question: '有常用Cron模板吗？',
        answer: '内置每分钟、每小时、每天凌晨、每周一、每月1号等常用定时任务模板，点击即可一键填入。',
      },
      {
        question: '能预览未来触发时间吗？',
        answer: '支持预览未来5次（可配置）触发时间，方便验证Cron表达式是否正确。',
      },
      {
        question: 'Cron表达式中的特殊字符是什么意思？',
        answer: '* 表示任意值，, 列举多个值（如 1,3,5），- 表示范围（如 1-5），/ 表示步进（如 */5 表示每5个单位），? 仅在日或周字段使用，表示不指定。',
      },
      {
        question: 'Cron和Quartz Cron有什么区别？',
        answer: '标准Unix Cron为5段格式（分 时 日 月 周），Quartz Cron为6-7段格式（秒 分 时 日 月 周 年），支持更多特性如L（最后一天）、W（最近工作日）、#（第几周）等扩展字符。',
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
      {
        question: '压缩后画质损失大吗？',
        answer: 'JPG质量设为75-85时肉眼几乎无差异，可减小60-70%文件体积。PNG使用无损压缩，不丢失任何信息。建议根据使用场景选择合适的质量参数。',
      },
      {
        question: 'PNG转WEBP能减小多少体积？',
        answer: 'PNG转WEBP无损模式通常可减小26%体积，有损模式可减小更多。WEBP同时支持透明通道，是现代网站图片优化的首选格式。',
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
      {
        question: '裁剪后画质会降低吗？',
        answer: '不会。裁剪使用Canvas API直接处理原始像素数据，导出为PNG时无损，导出为JPG时可自定义质量参数。裁剪不涉及缩放，不会降低画质。',
      },
      {
        question: '支持哪些社交平台的标准尺寸？',
        answer: '内置微信头像640x640、公众号封面900x383、微博配图1080x1080、Instagram 1080x1080、YouTube缩略图1280x720等常用尺寸，可直接选择使用。',
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
      {
        question: '转换后画质会损失吗？',
        answer: '转PNG和WEBP无损模式不会损失画质。转JPG为有损压缩，建议质量设为85以上。格式转换在浏览器本地使用Canvas API完成，原图不上传服务器。',
      },
      {
        question: 'WEBP格式兼容性如何？',
        answer: 'WEBP已被Chrome、Firefox、Safari、Edge等主流浏览器支持，覆盖率超过97%。如需兼容老旧浏览器，建议提供JPG/PNG回退方案，使用<picture>标签实现格式协商。',
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
      {
        question: '二维码能容纳多少数据？',
        answer: '二维码容量取决于版本（1-40）和纠错等级。版本10-L最大可编码约1700位数字或约400个汉字。建议长链接先缩短再生成二维码，避免过于密集影响识别。',
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
      { question: 'AI抠图效果不理想怎么办？', answer: '抠图效果取决于原图背景复杂度和光线条件。建议使用纯色背景拍摄的正面照片，光线均匀无阴影。复杂背景下抠图可能需要多次尝试。' },
    ],
  },
}

/**
 * 获取工具静态元数据，不存在时返回 null
 */
export function getToolStaticMeta(slug: string): ToolStaticMeta | null {
  return toolStaticMeta[slug] || null
}
