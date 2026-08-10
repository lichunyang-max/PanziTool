-- ============================================================================
-- 测试数据重置脚本：在每个 ToolControllerTest 测试方法前执行
-- ----------------------------------------------------------------------------
-- 由于 ToolControllerLikeTest（Task 5）的 @BeforeEach 会删除所有工具并仅插入 1 个，
-- 两个测试类共享同一 Spring 上下文与 H2 数据库，因此需要在 ToolControllerTest
-- 每个测试方法前重置工具种子数据，保证 10 个工具完整。
--
-- 执行顺序：先删除子表数据（避免 FK 约束冲突），再删除 tools，最后重新插入种子数据。
-- ============================================================================

-- 清理子表数据
DELETE FROM tool_likes;
DELETE FROM tool_event_logs;
DELETE FROM tool_event_daily;

-- 清理 tools 表
DELETE FROM tools;

-- 重置 IDENTITY 序列（H2 兼容语法），保证 id 从 1 开始
ALTER TABLE tools ALTER COLUMN id RESTART WITH 1;

-- 重新插入 10 个工具种子数据（与原 V6__seed_tools_data.sql 一致）
INSERT INTO tools (slug, name, category, keywords, description, enabled, use_count, like_count, created_at, updated_at)
VALUES
    ('json-formatter', 'JSON格式化', 'developer',
     'json,format,beautify,minify,validate',
     'JSON美化、压缩、语法校验，错误定位提示',
     TRUE, 12300, 892, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('url-encode', 'URL编码解码', 'developer',
     'url,encode,decode,uri,component',
     'URL Encode/Decode，一键复制',
     TRUE, 5100, 312, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('base64', 'Base64编码', 'developer',
     'base64,encode,decode,utf8',
     '文本Base64编解码，UTF-8支持',
     TRUE, 4300, 256, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('timestamp', '时间戳转换', 'developer',
     'timestamp,unix,date,time,转换',
     '秒/毫秒时间戳与日期互转',
     TRUE, 6200, 423, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('regex-tester', '正则测试', 'developer',
     'regex,regexp,正则,匹配,高亮',
     '正则匹配、高亮、分组信息展示',
     TRUE, 8700, 651, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('jwt-decoder', 'JWT解析', 'developer',
     'jwt,json,web,token,decode',
     'Header/Payload解析，过期时间提示',
     TRUE, 4800, 287, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('hash', '哈希计算', 'developer',
     'hash,md5,sha1,sha256,摘要',
     'MD5/SHA1/SHA256哈希计算',
     TRUE, 3900, 198, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('image-compress', '图片压缩', 'image',
     'image,compress,压缩,jpg,png,webp',
     '本地压缩JPG/PNG/WEBP，不上传',
     TRUE, 3500, 412, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('image-crop', '图片裁剪', 'image',
     'image,crop,裁剪,resize,尺寸',
     '裁剪、旋转、自定义尺寸导出',
     TRUE, 2800, 301, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('image-convert', '格式转换', 'image',
     'image,convert,转换,png,jpg,webp',
     'PNG/JPG/WEBP互转，透明背景处理',
     TRUE, 2300, 187, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('qr-code', '二维码生成器', 'developer',
     'qr,二维码,生成,logo,在线二维码',
     '文本/链接/WiFi/邮箱二维码生成，支持自定义颜色、Logo嵌入与PNG/SVG导出',
     TRUE, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 初始化广告种子数据
INSERT INTO ad_promotion (ad_union, ad_union_symbol, ad_placement, pid, product_description, product_url, ad_url, ad_start, ad_end, ad_enabled, ad_location, ad_location_symbol, created_at, updated_at)
VALUES
    ('阿里云', 'promotion.aliyuncs.com', '首页中部横幅', 'mm_10463602253_3429100_25890111',
     '阿里云轻量云服务器｜建站、程序测试优选，到手68元起',
     'https://img.alicdn.com/imgextra/i4/2200723868159/O1CN01xxxxxx.png',
     'https://www.aliyun.com/minisite/goods?userCode=xxx',
     CURRENT_TIMESTAMP, DATEADD('YEAR', 1, CURRENT_TIMESTAMP),
     TRUE, '网站首页中部广告位', 'home_middle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('京东', 'union.jd.com', '开发者工具中部', '1000001897_1000001785_12910090',
     '京东云开发者工具｜代码托管、CI/CD、监控告警一站式服务',
     'https://img14.360buyimg.com/imagetools/jfs/t1/xxx.jpg',
     'https://u.jd.com/jda_xxx',
     CURRENT_TIMESTAMP, DATEADD('YEAR', 1, CURRENT_TIMESTAMP),
     TRUE, '开发者工具中部广告位', 'dev_tool_middle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    ('京东', 'union.jd.com', '图片工具中部', '1000001897_1000001785_12910091',
     '京东云对象存储｜图片处理、CDN加速、安全防护',
     'https://img14.360buyimg.com/imagetools/jfs/t1/xxx2.jpg',
     'https://u.jd.com/jda_xxx2',
     CURRENT_TIMESTAMP, DATEADD('YEAR', 1, CURRENT_TIMESTAMP),
     TRUE, '图片工具中部广告位', 'img_tool_middle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);