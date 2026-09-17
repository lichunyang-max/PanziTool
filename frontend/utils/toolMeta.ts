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

  // ===== 第二批：开发者工具扩展（静态元数据） =====
  'hex-encode': {
    slug: 'hex-encode',
    name: 'Hex十六进制编解码',
    description: '免费在线Hex十六进制编解码工具，支持字符串与十六进制互转、多种分隔符格式（空格/0x/\\x前缀）、字节调试，本地浏览器运算不上传，免登录打开即用，保障数据安全。',
    keywords: 'Hex编码,十六进制转换,Hex转字符串,字符串转Hex,字节调试',
    category: 'developer',
    faq: [
      {
        question: 'Hex工具支持哪些分隔符格式？',
        answer: '支持四种分隔格式：无分隔（连续，适合哈希值展示）、空格分隔（适合人工阅读字节流）、0x前缀（C/Java等语言中十六进制字面量写法）、\\x前缀（Python字节串、正则表达式及转义场景）。可根据目标场景灵活切换。',
      },
      {
        question: '中文编码后的Hex为什么特别长？',
        answer: '英文字母、数字等ASCII字符通常只占1个字节，而一个中文字符在UTF-8编码下占3个字节，对应6个十六进制字符。所以中文转换结果明显更长，这是正常现象。',
      },
      {
        question: '解码时提示"非法的十六进制字符"怎么办？',
        answer: '请检查输入是否包含非十六进制字符（合法字符为0-9、A-F、a-f）。本工具会自动清理常见的空格、逗号及0x/\\x前缀，但其他非法字符会导致解析失败。同时需确保字符数量为偶数，因为每两个十六进制字符表示一个字节。',
      },
      {
        question: '数据会被上传到服务器吗？',
        answer: '不会。本工具的编码与解码逻辑完全运行在浏览器中（基于TextEncoder/TextDecoder），所有数据只在本地内存中处理，关闭页面后即消失，可放心处理敏感内容。',
      },
    ],
  },
  'unicode-convert': {
    slug: 'unicode-convert',
    name: 'Unicode转中文',
    description: '免费在线Unicode编码转换工具，\\uXXXX转义与中文互转，支持混合文本解析，快速还原日志乱码，本地浏览器处理免登录即用，保障数据安全。',
    keywords: 'Unicode转中文,中文转Unicode,\\uXXXX转义,Unicode解码,日志乱码',
    category: 'developer',
    faq: [
      {
        question: '日志里的中文变成了\\uXXXX是乱码吗？',
        answer: '不是乱码，是Unicode转义。很多日志框架和序列化库（如Log4j、fastjson、Jackson默认配置）为保证ASCII兼容性，会把非ASCII字符转成\\uXXXX形式输出。把内容粘贴到本工具即可一键还原为中文。',
      },
      {
        question: '输入里同时有中文和\\uXXXX转义能处理吗？',
        answer: '可以。Unicode→中文模式只替换文本中的\\uXXXX转义序列，其余字符（包括已是中文的部分）原样保留，混合内容也能正确解析。',
      },
      {
        question: '转换成Unicode后英文字母也会变成\\uXXXX吗？',
        answer: '不会。中文→Unicode模式下，可打印的ASCII字符（字母、数字、常见英文符号）会保留原样，只有中文及其他非ASCII字符才会被转成\\uXXXX，保证结果可读，也符合JSON等格式的常见输出习惯。',
      },
      {
        question: '支持emoji和生僻字吗？',
        answer: '\\uXXXX四位转义仅覆盖基本多文种平面（BMP）内的字符。大部分常用汉字都在该范围内，可以正常转换；但emoji等增补平面的字符码点超过U+FFFF，在JS中需要用代理对（两个连续的\\u转义）表示，超出本工具的转换范围。',
      },
    ],
  },
  'base-convert': {
    slug: 'base-convert',
    name: '进制转换器',
    description: '免费在线进制转换工具，支持2/8/10/16进制互转，基于BigInt大数支持，位运算、颜色值、权限掩码调试好帮手，本地浏览器运算免登录打开即用。',
    keywords: '进制转换,二进制转十进制,十六进制转换,八进制转换,BigInt',
    category: 'developer',
    faq: [
      {
        question: '支持多大的数字？',
        answer: '本工具使用BigInt进行解析与转换，理论上没有位数上限，输入几百位的超长数值也能得到精确结果，不会出现JavaScript普通数值类型的精度丢失问题。',
      },
      {
        question: '十六进制输入需要带0x前缀吗？',
        answer: '不需要。选择「十六进制」作为源进制后，直接输入FFFF即可。本工具也兼容带0x/0X前缀的输入，前缀会被自动忽略。',
      },
      {
        question: '支持负数和小数吗？',
        answer: '目前仅支持非负整数。进制转换中小数的处理方式不唯一（存在舍入误差），为避免歧义，本工具聚焦整数转换场景；位运算、颜色值、权限掩码等常见需求均为整数。',
      },
      {
        question: '为什么二进制结果很长？',
        answer: '一个十六进制字符对应4位二进制，一个十进制位大约对应3.3位二进制。数值越大，二进制表示越长，这是进制的固有特性。例如255的十六进制是FF（2位），二进制则是11111111（8位）。',
      },
    ],
  },
  'image-base64': {
    slug: 'image-base64',
    name: '图片Base64互转',
    description: '免费在线图片Base64互转工具，图片转Base64字符串、Base64还原图片预览，支持PNG/JPG/GIF/WebP，输出Data URI可直接用于CSS/HTML，本地浏览器处理不上传，免登录即用。',
    keywords: '图片转Base64,Base64转图片,图片Base64转换,Data URI,图片编码',
    category: 'developer',
    faq: [
      {
        question: '支持哪些图片格式？有大小限制吗？',
        answer: '支持PNG、JPG、GIF、WebP、SVG、BMP等主流格式，单张图片最大5MB。由于编码结果约为原文件的1.33倍，过大的图片生成的字符串会非常长，复制和使用都不方便，因此设置了上限。',
      },
      {
        question: '输出的Base64可以直接用在CSS或HTML里吗？',
        answer: '可以。工具输出的是完整的Data URI（以data:image/xxx;base64,开头），可直接用于CSS的url()、HTML的src属性，或在Markdown等支持Data URI的场景中使用。',
      },
      {
        question: 'Base64转图片时必须带data:image/...前缀吗？',
        answer: '不是必须。粘贴完整的Data URI可以直接预览；粘贴纯Base64字符串时，工具会自动补上默认的PNG前缀进行解析。如果预览异常，可以尝试手动补充正确的MIME类型前缀。',
      },
      {
        question: '图片会被上传到服务器吗？',
        answer: '不会。整个编码与解码过程均通过浏览器本地API（FileReader、Image对象）完成，图片数据始终留在你的设备上，适合处理截图、设计稿等隐私内容。',
      },
    ],
  },
  'xml-formatter': {
    slug: 'xml-formatter',
    name: 'XML格式化校验',
    description: '免费在线XML格式化校验工具，支持美化、压缩、语法校验、错误行号定位，CDATA原样保留，适配SOAP接口报文调试，本地浏览器处理不上传，免登录即用。',
    keywords: 'XML格式化,XML美化,XML校验,XML压缩,SOAP报文',
    category: 'developer',
    faq: [
      {
        question: '格式化后XML声明会变成两行吗？',
        answer: '不会。本工具会把XML声明（<?xml version="1.0"?>）、注释、DOCTYPE单独成行输出，标签内容按层级缩进，声明始终保持在第一行。如果声明前出现了空行或BOM字符，部分严格的解析器会报错，建议粘贴前先去掉。',
      },
      {
        question: 'CDATA里的内容会被格式化破坏吗？',
        answer: '不会。CDATA（<![CDATA[...]]>）中的内容是纯文本，格式化时原样保留，不做缩进和转义处理，其中的换行、空格都会与输入保持一致。',
      },
      {
        question: '校验通过但接口仍报错是什么原因？',
        answer: '语法校验只能保证XML结构合法，接口报错常见原因还有：缺少命名空间声明、必填字段缺失、字段顺序不符合XSD约束、编码声明与实际编码不一致等。建议对照接口文档的Schema（XSD/WSDL）逐项核对。',
      },
    ],
  },
  'yaml-formatter': {
    slug: 'yaml-formatter',
    name: 'YAML格式化校验',
    description: '免费在线YAML格式化校验工具，支持美化、语法校验、缩进错误行号定位，适配K8s、docker-compose多文档配置调试，本地浏览器处理不上传，免登录即用。',
    keywords: 'YAML格式化,YAML校验,YAML美化,docker-compose,K8s配置',
    category: 'developer',
    faq: [
      {
        question: '格式化后键的顺序和注释变了？',
        answer: '本工具的原理是「解析为对象再输出」，因此键会按内部顺序重新排列，注释和锚点（&anchor/*alias）信息会丢失。如果需要保留注释，建议使用编辑器的格式化功能；本工具更适合做语法校验和缩进修复。',
      },
      {
        question: '为什么报错提示的行号和实际内容对不上？',
        answer: 'js-yaml的报错行号通常指向「发现问题的位置」，而问题根源可能在上一行，例如上一行缩进多了空格、缺少冒号等。排查时建议连同报错行的上一行一起检查。',
      },
      {
        question: '支持K8s多文档（---分隔）格式吗？',
        answer: '支持。输入中包含---分隔的多个文档时，会逐个校验并合并格式化输出，每个文档之间保留---分隔符，方便直接粘贴回K8s的单个YAML文件。',
      },
    ],
  },
  'csv-json-convert': {
    slug: 'csv-json-convert',
    name: 'CSV ↔ JSON转换',
    description: '免费在线CSV与JSON互转工具，表格数据与JSON数组互转，支持逗号/分号/Tab分隔符，正确处理引号内转义，测试数据导入导出利器，本地浏览器处理免登录即用。',
    keywords: 'CSV转JSON,JSON转CSV,CSV转换,表格数据转换,Excel导入导出',
    category: 'developer',
    faq: [
      {
        question: '为什么Excel打开导出的CSV中文乱码？',
        answer: 'Excel在Windows下默认按ANSI（GBK）编码读取CSV，而本工具导出的文件是UTF-8。解决办法：用「数据→从文本/CSV导入」并选择UTF-8编码，或直接把文件后缀改成.txt再导入。macOS版Excel一般能直接识别UTF-8。',
      },
      {
        question: 'JSON转CSV时各行对象的键不一致怎么办？',
        answer: '工具会扫描整个数组，把所有出现过的键合并为表头。某个对象缺少的键对应单元格留空。注意：仅支持对象数组（如[{"a":1}]），嵌套对象和数组会被序列化为JSON字符串放入单元格。',
      },
      {
        question: 'CSV转JSON时数字会被自动转为数字类型吗？',
        answer: '会。纯数字（含小数、负数）会转为Number，"true"/"false"转为Boolean，空字符串转为空串保持文本。如果需要全部保留为字符串（例如手机号、以0开头的编号），转换后请自行处理，或使用带引号的字段。',
      },
    ],
  },
  'uuid-generator': {
    slug: 'uuid-generator',
    name: 'UUID/GUID生成器',
    description: '免费在线UUID生成器，支持v4/v7版本批量生成，多种格式输出（去连字符/大写/大括号），测试主键、请求ID一键搞定，基于Web Crypto API密码学安全随机数，本地生成免登录即用。',
    keywords: 'UUID生成,GUID生成,UUID v4,UUID v7,唯一标识,主键生成',
    category: 'developer',
    faq: [
      {
        question: 'UUID真的不会重复吗？重复概率有多大？',
        answer: '理论上存在重复可能，但概率小到可以忽略。以v4为例，可用随机位有122个，总组合数约5.3×10^36。如果每秒生成10亿个UUID，连续生成100年，出现至少一次重复的概率仍不足十亿分之一。工程实践中可以直接认为"不会重复"。',
      },
      {
        question: 'v4和v7应该选哪个？',
        answer: '需要作为数据库主键、需要按时间排序、关心写入性能的场景选v7；纯粹的随机标识（请求ID、会话令牌、去重键）选v4即可，生态兼容性最好。注意v7的前48位含毫秒时间戳，如果不希望ID泄露生成时间（例如对外暴露的单号），应避免使用v7或做二次转换。',
      },
      {
        question: '生成的UUID安全吗？能当密码或密钥用吗？',
        answer: '本工具使用Web Crypto API的密码学安全随机数生成器，UUID本身不可预测，作为标识符是安全的。但不建议直接当密码用：v4 UUID只有122位熵且格式固定，而专用密码生成器可以控制字符集和长度。作为API密钥时，建议配合过期时间和权限控制使用。',
      },
      {
        question: '大括号、大写这些格式变体分别用在什么场景？',
        answer: '标准形式是小写带连字符（如550e8400-e29b-41d4-a716-446655440000）。大括号包裹（{550e8400-...}）是微软GUID的传统显示格式，常见于Windows注册表、COM组件；大写形式常见于.NET/一些老系统；去除连字符的32位连续形式常见于数据库CHAR(32)存储、HTML的id属性等。',
      },
    ],
  },
  'mock-data': {
    slug: 'mock-data',
    name: 'Mock随机数据生成',
    description: '免费在线Mock数据生成工具，批量生成手机号、姓名、身份证号、地址、邮箱等模拟数据，支持JSON/CSV/SQL输出，身份证号通过校验位验证，本地生成不上传，免登录即用。',
    keywords: 'Mock数据,模拟数据生成,手机号生成,身份证号生成,测试数据,假数据',
    category: 'developer',
    faq: [
      {
        question: '生成的身份证号是真实的吗？能通过校验吗？',
        answer: '不是真实的。工具按国家标准GB 11643的规则随机生成：6位地区码+8位随机出生日期+3位顺序码+按ISO 7064 MOD 11-2算法计算的校验位。因此它能通过前端和大多数后端的格式校验（便于测试校验逻辑），但对应的地址、生日均为随机虚构，查询人口库会无此号码。',
      },
      {
        question: 'SQL输出的INSERT语句怎么用？',
        answer: '生成结果形如INSERT INTO mock_data (name, phone, ...) VALUES (...);，可以直接复制到MySQL、PostgreSQL等数据库客户端执行。默认表名是mock_data，如需插入自己的表，把语句中的表名和字段名替换为目标表结构即可；如果字段类型不同（例如日期列需要DATE类型而非字符串），注意对应调整引号。',
      },
      {
        question: '生成的手机号会打到真实用户吗？',
        answer: '手机号按大陆号段规则随机生成（1开头、第二位3-9），理论上可能与真实号码撞号。测试发送短信、拨打电话等会触达真实用户的功能时，请务必使用13000000000这类约定的测试号或运营商提供的测试通道，不要把Mock手机号用于真实外呼、真实下发。',
      },
    ],
  },
  'string-toolkit': {
    slug: 'string-toolkit',
    name: '字符串工具箱',
    description: '免费在线字符串处理工具箱，去空格、大小写转换、驼峰下划线互转、字符统计、行排序去重、反转等一站搞定，支持链式操作，本地浏览器处理免登录即用。',
    keywords: '字符串处理,去空格,大小写转换,驼峰转下划线,字符统计,行排序去重',
    category: 'developer',
    faq: [
      {
        question: '怎么连续执行多个操作？',
        answer: '本工具支持链式操作：执行一次处理后，点击结果区的"应用到输入"按钮，结果会回填到输入框，统计信息同步刷新，然后就可以继续执行下一个操作。例如先把多行文本"去空行"，再"行排序"，最后"去重"，三步即可得到干净的列表。',
      },
      {
        question: '中文排序是按拼音排的吗？',
        answer: '不是。本工具的行排序按字符的Unicode码点比较，中文会按码点顺序排列，同姓的名字看起来接近拼音序但并不严格等于拼音排序。如果需要严格拼音排序，可以在代码中使用 localeCompare 方法并指定 "zh-Hans-CN" 区域参数（依赖运行环境的ICU数据）。',
      },
      {
        question: '驼峰转下划线时数字会被处理吗？',
        answer: '不会。转换只处理大写字母边界，例如userName1会转换为user_name1，HTTPResponse会转换为h_t_t_p_response——如果原本想得到http_response，这种连续大写的缩写词（如HTTP、URL、ID）本身就不适合直接用正则转换，建议先手动把缩写改为首字母大写（HttpResponse）再转换。',
      },
    ],
  },
  'color-converter': {
    slug: 'color-converter',
    name: '颜色转换器',
    description: '免费在线颜色格式转换工具，HEX/RGB/HSL色值互转，实时预览，配合取色器与随机色，前端样式调试、设计稿色值转换必备，本地浏览器处理免登录即用。',
    keywords: '颜色转换,HEX转RGB,RGB转HSL,色值转换,前端调试,取色器',
    category: 'developer',
    faq: [
      {
        question: 'HEX的三位简写（如#F53）和六位（#FF5533）有什么关系？',
        answer: '三位简写是六位的压缩形式，每一位重复一次即可展开：#F53等价于#FF5533。只有R、G、B三组各自两位相同时才能简写。',
      },
      {
        question: 'HSL中的色相（H）为什么是0-360？',
        answer: '色相表示颜色在色环上的角度位置：0°是红色，120°是绿色，240°是蓝色，360°回到红色。饱和度和亮度则是百分比。',
      },
      {
        question: '怎么快速生成同一色系的不同深浅？',
        answer: '使用HSL格式，保持色相（H）和饱和度（S）不变，调整亮度（L）即可。例如hsl(244, 75%, 40%)与hsl(244, 75%, 70%)是同一色系的深浅两个层级，常用于主题色和hover态。',
      },
    ],
  },
  'html-escape': {
    slug: 'html-escape',
    name: 'HTML转义反转义',
    description: '免费在线HTML转义工具，特殊字符（<>&"\'）转义与还原，正确处理替换顺序防二次转义，防止XSS，页面标签解析调试必备，本地浏览器处理免登录即用。',
    keywords: 'HTML转义,HTML反转义,XSS防护,HTML实体,特殊字符转义',
    category: 'developer',
    faq: [
      {
        question: '为什么转义后&amp;出现在最前面被替换？',
        answer: '因为&是实体的引导字符，如果先替换其他字符，已生成的实体中的&会被再次转义。所以标准做法是先替换&为&amp;，再处理其他字符。',
      },
      {
        question: '反转义时遇到未知实体怎么办？',
        answer: '本工具只还原常见的预定义实体（&amp;lt;gt;quot;#39;以及部分命名实体如&amp;nbsp;）。未知实体会保持原样输出，不会报错。',
      },
      {
        question: '前端框架里还需要手动转义吗？',
        answer: 'React、Vue等现代框架默认对插值内容做转义，一般无需手动处理。但在使用v-html、dangerouslySetInnerHTML或服务端模板直接拼接HTML时，仍必须对用户输入做转义以防XSS。',
      },
    ],
  },
  'js-css-beautify': {
    slug: 'js-css-beautify',
    name: 'JS/CSS美化压缩',
    description: '免费在线JS/CSS美化压缩工具，还原压缩混淆代码为可读格式，支持2/4空格缩进，正确处理字符串与正则字面量，阅读线上资源更轻松，本地浏览器处理免登录即用。',
    keywords: 'JS美化,CSS美化,JS压缩,CSS压缩,代码格式化,代码还原',
    category: 'developer',
    faq: [
      {
        question: '美化后的代码能完全还原成原始代码吗？',
        answer: '不能。压缩过程中注释和原始换行已被丢弃，美化只能根据语法结构重新排版。如果压缩时还混淆了变量名（如webpack生产构建），变量名也无法还原。',
      },
      {
        question: '压缩JavaScript会不会破坏代码功能？',
        answer: '本工具采用逐字符扫描并跟踪字符串/正则/注释状态的方案，对常规代码安全。但极端情况（如正则字面量中包含//、字符串中包含换行）可能误判，压缩后建议自行验证功能。生产环境建议使用terser、esbuild等成熟工具。',
      },
      {
        question: '为什么CSS压缩后体积没有明显减小？',
        answer: '如果原始CSS本身已经比较紧凑（没有注释和多余空格），压缩空间有限。CSS压缩的主要收益来自去除注释、换行和规则间空白，进一步缩减需要合并选择器、缩短颜色值等优化，本工具不涉及。',
      },
    ],
  },
  'timezone-calculator': {
    slug: 'timezone-calculator',
    name: '时区时间计算器',
    description: '免费在线时区换算工具，多时区时间对照、时间差计算，基于Intl API自动处理夏令时，排查跨时区业务bug，本地浏览器运算免登录即用。',
    keywords: '时区转换,时区计算,时间差计算,夏令时,UTC,IANA时区',
    category: 'developer',
    faq: [
      {
        question: '为什么纽约和北京的时差有时是12小时，有时是13小时？',
        answer: '纽约实行夏令时：夏季为UTC-4（EDT），与北京时间（UTC+8）相差12小时；冬季为UTC-5（EST），相差13小时。本工具按具体日期自动计算正确偏移。',
      },
      {
        question: '时区缩写（CST、EST）为什么不建议使用？',
        answer: '时区缩写有歧义。例如CST同时代表中国标准时间（UTC+8）、美国中部时间（UTC-6）和古巴标准时间（UTC-5）。开发中应使用IANA时区标识（如Asia/Shanghai、America/New_York）。',
      },
      {
        question: 'Unix时间戳有时区吗？',
        answer: '没有。Unix时间戳表示自1970-01-01 00:00:00 UTC以来的秒数（或毫秒数），是全球同一的绝对时刻，不随时区变化。不同时区展示同一时间戳，得到的"墙上时间"不同，但对应的瞬间相同。',
      },
    ],
  },
}

/**
 * 获取工具静态元数据，不存在时返回 null
 */
export function getToolStaticMeta(slug: string): ToolStaticMeta | null {
  return toolStaticMeta[slug] || null
}
