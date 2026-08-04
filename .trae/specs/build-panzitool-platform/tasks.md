# Tasks

> 里程碑与 PRD 对齐：M1（骨架+后端/数据库+统计/点赞）→ M2（7 个开发者工具+计数/点赞展示）→ M3（3 个图片工具+广告/统计上线+部署交付）。
> 任务顺序大致对应里程碑，可并行的任务已标注。
> 已融合后端专家评审意见（事件表拆分、tools 冗余计数、API 规范、SSR 策略、防刷容错、运维治理）与前端专家评审意见（ToolLayout 布局组件、toolRegistry 注册机制、懒加载、错误边界、SSR 降级、page\_view 客户端上报、点赞 localStorage 同步、runtimeConfig、JSON-LD/canonical/OG、a11y、EXIF、ReDoS 防护、前端测试）。

## 里程碑 1：项目骨架 + 后端/数据库基础 + 统计/点赞基础

* [x] Task 1: 初始化前端 Nuxt3 工程骨架（含 runtimeConfig 与工程化基础）

  * [x] SubTask 1.1: 使用 Nuxt3 + TypeScript 初始化 `frontend/`，配置 SSR、目录结构、基础布局组件

  * [x] SubTask 1.2: 配置 `runtimeConfig`（`apiBase` 服务端内网地址、`public.apiBase` 客户端公开地址、`public.baiduTongjiId`、广告位 key 等），避免硬编码

  * [x] SubTask 1.3: 配置 SEO 基础能力（useSeoMeta、全局 title/description 模板、trailing slash 规范全站无尾斜杠）

  * [x] SubTask 1.4: 配置前端开发环境（ESLint/Prettier、Vitest、运行脚本、环境变量）

  * 验证：`npm run dev` 可启动，首页可访问，SSR 生效，runtimeConfig 多环境切换正常 ✅

* [x] Task 2: 初始化后端 Spring Boot 工程骨架（含 API 规范基础设施）

  * [x] SubTask 2.1: 使用 Spring Boot 3.x + JDK 17 初始化 `backend/`，配置 Spring Data JPA、Flyway、PostgreSQL 驱动

  * [x] SubTask 2.2: 实现统一响应信封格式（`{code, data}` / `{code, message}`）与全局异常处理

  * [x] SubTask 2.3: 配置 CORS（生产仅允许 `https://www.panzipool.com`，开发 localhost）

  * [x] SubTask 2.4: 启用 JSR-303 Bean Validation 全局校验

  * [x] SubTask 2.5: 集成 springdoc-openapi 提供 OpenAPI/Swagger 文档（`/api/v1/docs`）

  * [x] SubTask 2.6: 配置 `/actuator/health` 健康检查端点

  * [x] SubTask 2.7: 配置后端开发环境（Maven/Gradle、application.yml、运行脚本）

  * 验证：后端可启动，`/actuator/health` 返回 UP，OpenAPI 文档可访问，统一响应格式生效 ✅

* [x] Task 3: 设计并实现数据库迁移（Flyway）—— 事件表拆分 + 冗余计数

  * [x] SubTask 3.1: 编写 tools 表迁移（工具元数据：id、slug、名称、分类、关键词、描述、启用标志、**use\_count**、**like\_count**、created\_at、updated\_at；slug 唯一索引、(category, use\_count) 复合索引）

  * [x] SubTask 3.2: 编写 tool\_event\_logs 表迁移（原始事件日志：id、tool\_id、anon\_id、event\_type、created\_at；(tool\_id, created\_at)、(anon\_id, created\_at) 索引）

  * [x] SubTask 3.3: 编写 tool\_event\_daily 表迁移（按天聚合：tool\_id、event\_date、event\_type、count；对 (tool\_id, event\_date, event\_type) 唯一约束）

  * [x] SubTask 3.4: 编写 tool\_likes 表迁移（点赞：tool\_id、anon\_id、created\_at；对 (tool\_id, anon\_id) 唯一约束）

  * [x] SubTask 3.5: 编写 site\_visitor\_daily 表迁移（站点日统计：stat\_date、pv、uv、created\_at）

  * 验证：Flyway 迁移执行成功，表结构与索引与 spec 一致 ✅

* [x] Task 4: 实现匿名统计事件上报 API（含防刷与容错）

  * [x] SubTask 4.1: 实现 `POST /api/v1/events` 接口，event\_type 白名单校验（page\_view/tool\_use/copy/download）

  * [x] SubTask 4.2: 写入 tool\_event\_logs，同步更新 tools.use\_count

  * [x] SubTask 4.3: 实现按天聚合逻辑（定时任务/触发器聚合到 tool\_event\_daily）

  * [x] SubTask 4.4: 实现基础频率限制（同一 IP/anon\_id 每分钟上限）

  * [x] SubTask 4.5: 编写单元测试与集成测试（含非法 event\_type 拒绝、频率限制）

  * 验证：可成功上报事件并查询聚合结果，非法事件被拒绝，频率限制生效 ✅

* [x] Task 5: 实现点赞 API 与防刷（含响应语义）

  * [x] SubTask 5.1: 实现 `POST /api/v1/tools/{slug}/like` 接口，基于 anon\_id 限制一设备一次

  * [x] SubTask 5.2: 依赖 (tool\_id, anon\_id) 唯一约束处理重复点赞（不可取消）

  * [x] SubTask 5.3: 实现响应语义（首次点赞返回 200 + like\_count；重复点赞返回 409 Conflict）

  * [x] SubTask 5.4: 点赞成功同步更新 tools.like\_count

  * [x] SubTask 5.5: 编写单元测试与集成测试（覆盖首次点赞、重复点赞 409、计数同步）

  * 验证：首次点赞返回 200 与总数，重复点赞返回 409，tools.like\_count 同步更新 ✅

* [x] Task 6: 实现工具元数据与计数查询 API（读取冗余计数）

  * [x] SubTask 6.1: 实现 `GET /api/v1/tools` 列表接口（支持分类、热门/最新排序，读取 use\_count）

  * [x] SubTask 6.2: 实现 `GET /api/v1/tools/{slug}` 详情接口（含 use\_count、like\_count）

  * [x] SubTask 6.3: 初始化工具元数据种子数据（10 个工具的 slug/名称/分类/关键词）

  * 验证：列表与详情接口返回正确数据，排序使用 (category, use\_count) 索引 ✅

* [x] Task 7: 实现站点基础框架 + 前端架构（首页/分类/搜索/SEO/隐私/SSR/工程化）

  * [x] SubTask 7.1: 封装统一 API 客户端 composable（`useApi`），拦截层解包 `{code, data}` 信封，`code !== 0` 抛业务错误

  * [x] SubTask 7.2: 封装 ToolLayout 通用布局组件（面包屑、交互区插槽、说明、示例、FAQ、计数/点赞、广告位插槽）与 toolRegistry（slug→组件 映射）+ 动态路由 `/tools/[slug].vue`

  * [x] SubTask 7.3: 封装通用 UI 原子组件（CopyButton、ClearButton、ExampleButton、TextInputArea、OutputArea）与前端错误边界

  * [x] SubTask 7.4: 实现工具交互组件懒加载机制（defineAsyncComponent/动态 import，首页不加载工具代码）

  * [x] SubTask 7.5: 实现首页（分类入口、搜索框、热门/最新工具区块、推荐工具卡片）

  * [x] SubTask 7.6: 实现分类页（`/category/developer`、`/category/image`，支持热门/最新排序）

  * [x] SubTask 7.7: 实现 SSR 数据获取：工具详情页 useFetch/useAsyncData 在 SSR 获取计数，含降级策略（后端不可用时计数显示占位，不阻塞首屏）；工具列表用 getCachedData/SWR 缓存（60s）

  * [x] SubTask 7.8: 实现全站本地搜索（工具名/关键词匹配，结果跳转）

  * [x] SubTask 7.9: 实现 SEO：sitemap.xml、robots.txt、JSON-LD 结构化数据（WebApplication 类型）、canonical URL（无尾斜杠）、OG 标签

  * [x] SubTask 7.10: 实现关于页 `/about` 与隐私政策页 `/privacy`（图片本地处理/不上传、百度统计用途=运营分析、自建统计用途=站内展示、广告免责）

  * [x] SubTask 7.11: 前端封装匿名 anon\_id 生成（localStorage UUID）、liked\_tools 列表管理、事件上报客户端（非阻塞 fire-and-forget + sendBeacon + page\_view 路由去重）

  * 验证：首页/分类页/搜索/关于/隐私页可访问，SSR HTML 含计数或降级占位，SEO 元信息与 JSON-LD 正确，工具代码懒加载 ✅

## 里程碑 2：核心开发者工具（7 个）+ 计数/点赞展示

* [x] Task 8: 实现 JSON 格式化/压缩/校验工具

  * [x] SubTask 8.1: 实现工具纯函数（格式化/压缩/校验）并提取至 utils，编写 Vitest 单元测试

  * [x] SubTask 8.2: 实现 JSON 工具 UI（输入/输出、格式化/压缩、CopyButton/ClearButton/ExampleButton、大输入防护 >1MB 警告）

  * [x] SubTask 8.3: 实现 JSON.parse 校验与错误提示（行列/片段）

  * [x] SubTask 8.4: 工具页 SEO（title/description、说明、示例、FAQ、JSON-LD）+ 通过 ToolLayout 接入统计/点赞（核心操作触发 tool\_use、复制触发 copy）

  * 验证：合法 JSON 格式化/压缩正常，非法 JSON 提示行列，大输入有警告，单测通过 ✅

* [x] Task 9: 实现 URL 编码/解码工具

  * [x] SubTask 9.1: 实现工具纯函数并提取至 utils，编写单元测试

  * [x] SubTask 9.2: 实现 URL 工具 UI（Encode/Decode 切换、CopyButton/ClearButton/ExampleButton）

  * [x] SubTask 9.3: 实现 encodeURIComponent/decodeURIComponent 与异常处理

  * [x] SubTask 9.4: 工具页 SEO + 接入统计/点赞

  * 验证：编码/解码正常，异常输入友好提示，单测通过 ✅

* [x] Task 10: 实现 Base64 编码/解码工具（文本）

  * [x] SubTask 10.1: 实现工具纯函数并提取至 utils，编写单元测试

  * [x] SubTask 10.2: 实现 Base64 工具 UI（编码/解码、CopyButton/ClearButton/ExampleButton）

  * [x] SubTask 10.3: 实现 UTF-8 字符正确处理（TextEncoder/TextDecoder）

  * [x] SubTask 10.4: 工具页 SEO + 接入统计/点赞

  * 验证：中文等 UTF-8 字符编码/解码正确，单测通过 ✅

* [x] Task 11: 实现时间戳转换工具

  * [x] SubTask 11.1: 实现工具纯函数并提取至 utils，编写单元测试

  * [x] SubTask 11.2: 实现时间戳 UI（时间戳输入、日期输入、转换、当前时间戳、CopyButton）

  * [x] SubTask 11.3: 实现秒/毫秒自动识别与 Date 转换、非法输入校验；同时展示本地时区与 UTC 时间并标注时区

  * [x] SubTask 11.4: 工具页 SEO + 接入统计/点赞

  * 验证：时间戳与日期互转正确，时区显示清晰，单测通过 ✅

* [x] Task 12: 实现正则表达式测试工具

  * [x] SubTask 12.1: 实现正则 UI（正则输入、flags 选择、测试文本、结果区）

  * [x] SubTask 12.2: 实现 RegExp 匹配（try-catch 包裹执行保护）、match 列表与分组展示、文本高亮命中片段

  * [x] SubTask 12.3: 实现非法正则错误提示与 ReDoS 风险 UI/文档提示

  * [x] SubTask 12.4: 工具页 SEO + 接入统计/点赞

  * 验证：匹配/分组/高亮正常，非法正则友好提示，ReDoS 风险有提示 ✅

* [x] Task 13: 实现 JWT 解析工具

  * [x] SubTask 13.1: 实现工具纯函数（分段/解码/解析）并提取至 utils，编写单元测试

  * [x] SubTask 13.2: 实现 JWT UI（输入、解析按钮、Header/Payload 输出、CopyButton）

  * [x] SubTask 13.3: 实现按点分段、base64url 解码、JSON 解析与美化、错误处理

  * [x] SubTask 13.4: 实现 exp/iat 等字段转可读时间 + 安全提示（不上传/不验签）

  * [x] SubTask 13.5: 工具页 SEO + 接入统计/点赞

  * 验证：合法 JWT 解析正确，exp/iat 转可读时间，非法 JWT 友好提示，单测通过 ✅

* [x] Task 14: 实现哈希计算工具（MD5/SHA）

  * [x] SubTask 14.1: 实现工具纯函数并提取至 utils，编写单元测试

  * [x] SubTask 14.2: 实现哈希 UI（输入、算法选择、输出、CopyButton）

  * [x] SubTask 14.3: 实现 Web Crypto API 计算 SHA1/SHA256，引入轻量库计算 MD5（懒加载库）；明确仅支持文本哈希

  * [x] SubTask 14.4: 工具页 SEO + 接入统计/点赞

  * 验证：MD5/SHA1/SHA256 计算结果正确，单测通过 ✅

* [x] Task 15: 7 个工具统一接入计数/点赞展示

  * [x] SubTask 15.1: 在每个工具详情页（通过 ToolLayout）展示使用次数与点赞次数（SSR 获取 + 降级）

  * [x] SubTask 15.2: 实现点赞按钮交互（客户端读取 liked\_tools 判断状态、防重复、409 同步修正 localStorage、乐观更新 like\_count）

  * [x] SubTask 15.3: 关键操作（格式化/转换/复制/下载）触发 tool\_use/copy/download 事件上报（非阻塞 + sendBeacon）

  * 验证：工具页正确展示计数（含降级），点赞防刷生效，关键事件上报成功 ✅

## 里程碑 3：图片工具（3 个）+ 广告与第三方统计上线 + 部署交付

* [x] Task 16: 实现图片压缩工具（本地处理）

  * [x] SubTask 16.1: 实现压缩 UI（拖拽上传、参数：质量/最大宽高、预览、前后大小对比、下载）

  * [x] SubTask 16.2: 实现 EXIF 方向读取与修正（blueimp-load-image 或手动解析）

  * [x] SubTask 16.3: 实现 Canvas 重编码本地压缩逻辑（jpg/png/webp，含 EXIF 修正），确保不上传服务器

  * [x] SubTask 16.4: 实现多文件支持（列表逐个压缩与导出）

  * [x] SubTask 16.5: 工具页 SEO + 隐私说明 + 接入统计/点赞（下载触发 download 事件）

  * 验证：单张/多张压缩正常（含 EXIF 修正），前后大小对比准确，下载可用 ✅

* [x] Task 17: 实现图片裁剪/改尺寸工具（本地处理）

  * [x] SubTask 17.1: 实现裁剪 UI（上传、裁剪框、比例选择、尺寸设置、预览、下载）

  * [x] SubTask 17.2: 实现 EXIF 方向修正 + Canvas 裁剪与重采样，导出 png/jpg

  * [x] SubTask 17.3: 工具页 SEO + 接入统计/点赞

  * 验证：裁剪与导出正常（含 EXIF 修正），比例/尺寸设置生效 ✅

* [x] Task 18: 实现图片格式转换工具（本地处理）

  * [x] SubTask 18.1: 实现转换 UI（上传、选择目标格式、预览、下载）

  * [x] SubTask 18.2: 实现 EXIF 方向修正 + Canvas 导出不同 mime，处理 png→jpg 透明背景提示

  * [x] SubTask 18.3: 工具页 SEO + 接入统计/点赞

  * 验证：png/jpg/webp 互转正常（含 EXIF 修正），png→jpg 提示透明背景丢失 ✅

* [x] Task 19: 实现广告位集成（预留+可配置）

  * [x] SubTask 19.1: 规划首页/分类页/工具页广告位位置与尺寸（顶部横幅、侧边栏、文末）

  * [x] SubTask 19.2: 封装可配置广告组件（开关、广告位 key，通过 runtimeConfig.public 管理）

  * [x] SubTask 19.3: 实现异步注入第三方脚本（不阻塞首屏）与降级策略（未配置/加载失败不影响布局）

  * [x] SubTask 19.4: 添加隐私/免责声明链接

  * [x] SubTask 19.5: 首页广告位集成 — 在热门工具和最新上架之间插入 `homeMiddle` 广告位

  * [x] SubTask 19.6: JSON 格式化工具页广告位集成 — 在页面底部插入 `jsonBottom` 广告位

  * [x] SubTask 19.7: 正则测试工具页广告位集成 — 在分组信息和匹配结果之间插入 `regexMiddle` 广告位

  * [x] SubTask 19.8: 时间戳转换工具页广告位集成 — 在时区选择和常用时间戳参考之间插入 `timestampMiddle` 广告位

  * [x] SubTask 19.9: URL 编码解码工具页广告位集成 — 在常见问题和常见特殊字符编码对照表之间插入 `urlMiddle` 广告位 ✅

  * [x] SubTask 19.10: JWT 解析工具页广告位集成 — 在 JWT 算法参考功能上面插入 `jwtTop` 广告位 ✅

  * [x] SubTask 19.11: Base64 编码工具页广告位集成 — 在页面底部插入 `base64Bottom` 广告位 ✅

  * [x] SubTask 19.12: 哈希计算工具页广告位集成 — 在哈希算法对比和文件哈希计算之间插入 `hashMiddle` 广告位 ✅

  * [x] SubTask 19.13: 图片压缩工具页广告位集成 — 在页面底部插入 `imageCompressBottom` 广告位 ✅

  * [x] SubTask 19.14: 图片裁剪工具页广告位集成 — 在本地处理保障和常见问题功能之间插入 `imageCropMiddle` 广告位 ✅

  * [x] SubTask 19.15: 格式转换工具页广告位集成 — 在本地处理保障和格式参考表功能之间插入 `imageConvertMiddle` 广告位 ✅

  * 验证：广告位可配置，未配置时降级不影响布局 ✅

* [x] Task 20: 接入百度统计（PV/工具使用）—— 职责边界明确

  * [x] SubTask 20.1: 接入百度统计脚本（hm.js?id=06c8d960aee8a68f0a9a229ff4a18ceb，通过 runtimeConfig.public 管理，仅用于运营分析）

  * [x] SubTask 20.2: 配置单页应用路由切换 PV 统计

  * [x] SubTask 20.3: 关键事件埋点（格式化/转换/下载/复制）

  * [x] SubTask 20.4: 隐私政策补充百度统计用途（运营分析）与自建统计用途（站内展示）分别说明

  * 验证：百度统计后台可看到 PV 与关键事件，隐私政策职责边界清晰 ✅

* [x] Task 21: 实现运维与数据治理能力

  * [x] SubTask 21.1: 配置 PostgreSQL 定期备份（pg\_dump 脚本或云数据库自动备份）与恢复流程文档

  * [x] SubTask 21.2: 后端配置结构化日志（JSON 格式，记录关键操作与错误）

  * [x] SubTask 21.3: 实现 tool\_event\_logs 原始日志保留策略（90 天后归档或仅保留聚合数据）

  * 验证：备份脚本可执行，日志为 JSON 格式，日志保留策略生效 ✅

* [x] Task 22: 前端测试与可访问性完善

  * [x] SubTask 22.1: 完善前端核心工具纯函数单元测试（Vitest，覆盖 JSON/Base64/时间戳/JWT/哈希等）

  * [x] SubTask 22.2: 关键工具页编写组件渲染测试

  * [x] SubTask 22.3: 完善 a11y 基础（键盘可操作 Tab/Enter、label、aria-label、颜色对比度 WCAG AA）

  * 验证：前端测试全部通过，a11y 基础达标 ✅

* [x] Task 23: Docker 容器化与部署交付

  * [x] SubTask 23.1: 编写前端 Dockerfile（Nuxt3 构建 + 运行）

  * [x] SubTask 23.2: 编写后端 Dockerfile（Spring Boot 构建 + 运行）

  * [x] SubTask 23.3: 编写 nginx 反代配置（含裸域 301 到 www、强制 HTTPS、trailing slash 统一无尾斜杠）

  * [x] SubTask 23.4: 编写 docker-compose.yml（nginx + nuxt + java-api + postgres）

  * [x] SubTask 23.5: 编写部署文档（腾讯云、域名/DNS/HTTPS 证书配置、备份恢复流程说明）

  * 验证：`docker-compose up -d` 一键启动，站点可访问，裸域 301 与 HTTPS 生效，trailing slash 统一 ✅

# Task Dependencies

* Task 3（数据库迁移）依赖 Task 2（后端骨架含 API 规范基础设施）

* Task 4、Task 5、Task 6 依赖 Task 3，三者可并行

* Task 7 依赖 Task 1（前端骨架含 runtimeConfig）与 Task 6（计数查询 API）；SubTask 7.7（SSR 数据获取）依赖 Task 6；SubTask 7.11（前端上报客户端）依赖 Task 4、Task 5

* Task 8 \~ Task 14（7 个工具）依赖 Task 7（含 ToolLayout/toolRegistry/原子组件/懒加载），彼此可并行

* Task 15 依赖 Task 8 \~ Task 14 完成

* Task 16 \~ Task 18（3 个图片工具）依赖 Task 7，彼此可并行

* Task 19、Task 20 可并行，依赖 Task 7

* Task 21（运维治理）依赖 Task 3（数据库迁移）、Task 4（事件上报）

* Task 22（前端测试与 a11y）依赖 Task 8 \~ Task 14（工具纯函数已提取）

* Task 23（部署）依赖前端、后端、数据库、运维治理全部就绪（Task 15、Task 16\~18、Task 19、Task 20、Task 21、Task 22）

## 额外任务：广告系统优化与数据库迁移维护

* [x] Task 24: 广告系统优化与数据库迁移维护

  * [x] SubTask 24.1: 删除 V9 数据库迁移文件（V9\_\_reset\_tool\_counts\_to\_zero.sql），检查代码引用

  * [x] SubTask 24.2: 创建广告推广数据库表（V10\_\_create\_ad\_promotion\_table.sql），包含完整表结构和索引

  * [x] SubTask 24.3: 修复 Flyway 迁移历史表问题（V6 checksum、V9/V10 记录清理）

  * [x] SubTask 24.4: 优化多个工具页面广告位（移除底部广告位，保留中间广告位）

  * [x] SubTask 24.5: 调整首页广告位，添加阿里云轻量云服务器广告内容

  * [x] SubTask 24.6: 创建 StaticAdCard 组件实现静态广告展示

  * [x] SubTask 24.7: 启动前后端程序并验证功能正常

  * 验证：前后端程序正常运行，广告位展示正确，数据库表结构完整 ✅

## 新增任务：首页广告动态数据源实现

- [x] Task 25: 首页广告动态数据源实现
  - [x] SubTask 25.1: 创建 `AdPromotion` 实体类和 `AdPromotionRepository`
  - [x] SubTask 25.2: 创建 `AdResponse` DTO 和 `AdController` 实现广告查询 API
  - [x] SubTask 25.3: 前端首页使用 `useAsyncData` 在 SSR 阶段调用广告 API
  - [x] SubTask 25.4: 修改 `index.vue` 模板为动态数据绑定，使用 `product_description`、`product_url`、`ad_url` 字段
  - [x] SubTask 25.5: 实现 `v-if="adData"` 条件渲染，无数据时静默隐藏
  - 验证：首页广告位可动态从数据库获取并渲染，无数据时静默隐藏 ✅

## 新增任务：工具页底部广告动态数据源实现

- [x] Task 26: 工具页底部广告动态数据源实现
  - [x] SubTask 26.1: 修改 `ToolLayout.vue` 组件，在 SSR 阶段调用广告 API（`GET /api/v1/ads?locationSymbol=tool_footer`）获取底部广告数据
  - [x] SubTask 26.2: 将工具页底部广告位从 `AdSlot` 组件改为 `StaticAdCard` 组件，使用获取到的 `product_description`、`product_url`、`ad_url` 字段动态渲染
  - [x] SubTask 26.3: 实现 `v-if` 条件渲染，无广告数据时静默隐藏，不影响页面布局
  - 验证：开发者工具和图片工具详情页底部广告位可动态从数据库获取并渲染，无数据时静默隐藏 ✅

## 新增任务：开发者工具中间广告动态数据源实现

- [x] Task 27: 开发者工具中间广告动态数据源实现
  - [x] SubTask 27.1: 修改 `RegexTesterTool.vue`，将中间广告位从 `AdSlot` 改为动态获取 `dev_tool_middle` 广告数据并使用 `StaticAdCard` 渲染
  - [x] SubTask 27.2: 修改 `TimestampTool.vue`，将中间广告位从 `AdSlot` 改为动态获取 `dev_tool_middle` 广告数据并使用 `StaticAdCard` 渲染
  - [x] SubTask 27.3: 修改 `UrlEncodeTool.vue`，将中间广告位从 `AdSlot` 改为动态获取 `dev_tool_middle` 广告数据并使用 `StaticAdCard` 渲染
  - [x] SubTask 27.4: 修改 `JwtDecoderTool.vue`，将中间广告位从 `AdSlot` 改为动态获取 `dev_tool_middle` 广告数据并使用 `StaticAdCard` 渲染
  - [x] SubTask 27.5: 修改 `HashTool.vue`，将中间广告位从 `AdSlot` 改为动态获取 `dev_tool_middle` 广告数据并使用 `StaticAdCard` 渲染
  - 验证：5 个开发者工具页面中间广告位可动态从数据库获取并渲染，无数据时静默隐藏 ✅

## 新增任务：插入图片工具中部广告数据

- [x] Task 28: 插入淘宝联盟广告数据（img_tool_middle）
  - [x] SubTask 28.1: 创建 `V13__insert_img_tool_middle_ad.sql` 迁移脚本
  - [x] SubTask 28.2: 重启后端执行 Flyway 迁移
  - [x] SubTask 28.3: 验证广告数据正确插入
  - 验证：`GET /api/v1/ads?locationSymbol=img_tool_middle` 返回正确的广告数据 ✅

## 新增任务：图片工具中间广告动态数据源实现

- [x] Task 29: 图片工具中间广告动态数据源实现
  - [x] SubTask 29.1: 修改 `ImageCropTool.vue`，在 SSR 阶段调用 `/api/v1/ads?locationSymbol=img_tool_middle` 获取广告数据，将中间广告位从 `AdSlot` 改为 `StaticAdCard` 渲染
  - [x] SubTask 29.2: 修改 `ImageConvertTool.vue`，在 SSR 阶段调用 `/api/v1/ads?locationSymbol=img_tool_middle` 获取广告数据，将中间广告位从 `AdSlot` 改为 `StaticAdCard` 渲染
  - 验证：图片裁剪和格式转换页面中间广告位可动态从数据库获取并渲染，无数据时静默隐藏 ✅

## 新增任务：移动端适配基础架构

- [x] Task 30: 移动端设备检测与布局切换
  - **Priority**: high
  - **Depends On**: Task 1（前端骨架）
  - **Description**: 
    - 创建 `composables/useDevice.ts` composable，用于检测设备类型（移动/桌面）
    - 创建 `middleware/device-detect.global.ts` 全局中间件，在 SSR 阶段检测 User-Agent 并设置响应式状态
    - 创建 `layouts/mobile.vue` 移动端基础布局（Header + 内容区 + Footer + 底部导航）
    - 修改现有布局逻辑，实现 PC/移动端自动切换
  - **Acceptance Criteria Addressed**: AC-30.1, AC-30.7
  - **Test Requirements**:
    - `programmatic` TR-30.1.1: 中间件正确识别移动端 User-Agent（iPhone, Android, Mobile 等）
    - `programmatic` TR-30.1.2: 中间件将爬虫 User-Agent 识别为桌面设备（确保 SEO）
    - `human-judgement` TR-30.1.3: 移动设备访问网站时加载移动端布局
    - `human-judgement` TR-30.1.4: 桌面设备访问网站时保持 PC 端布局不变

- [x] Task 31: 移动端通用组件开发
  - **Priority**: high
  - **Depends On**: Task 30
  - **Description**:
    - 创建 `components/mobile/MobileHeader.vue`：移动端顶部导航（Logo + 返回按钮）
    - 创建 `components/mobile/MobileFooter.vue`：移动端页脚
    - 创建 `components/mobile/MobileBottomNav.vue`：移动端底部导航栏（首页、工具、关于，active 状态高亮）
    - 创建 `components/mobile/MobileToolLayout.vue`：移动端工具页通用布局（面包屑 + 标题 + 使用统计 + 内容区 + 广告位）
    - 创建 `components/mobile/MobileToolCard.vue`：移动端工具卡片组件（2列网格 + 竖排列表两种模式）
    - 创建 `components/mobile/MobileAdCard.vue`：移动端广告卡片组件
  - **Acceptance Criteria Addressed**: AC-30.2, AC-30.4
  - **Test Requirements**:
    - `human-judgement` TR-31.1: MobileHeader 样式与 panzi-tools-mobile 设计一致
    - `human-judgement` TR-31.2: MobileBottomNav 三个入口正确显示，当前页高亮
    - `human-judgement` TR-31.3: MobileToolLayout 布局完整，包含所有必要区块
    - `human-judgement` TR-31.4: MobileToolCard 支持网格和列表两种展示模式

## 新增任务：移动端页面实现（P0 优先级）

- [x] Task 32: 移动端核心页面实现（P0）
  - **Priority**: high
  - **Depends On**: Task 31
  - **Description**:
    - **SubTask 32.1**: 创建 `pages/mobile/index.vue` 移动端首页（热门工具 2 列网格 + 广告 + 最新上架列表）
    - **SubTask 32.2**: 创建 `pages/mobile/dev-tools.vue` 开发者工具列表页（Tab 切换 + 竖排列表）
    - **SubTask 32.3**: 创建 `pages/mobile/image-tools.vue` 图片工具列表页
    - **SubTask 32.4**: 创建 `pages/mobile/tools/[slug].vue` 移动端工具详情页动态路由
    - **SubTask 32.5**: 实现移动端路由映射逻辑，根据设备类型自动路由到移动端页面
  - **Acceptance Criteria Addressed**: AC-30.2, AC-30.3
  - **Test Requirements**:
    - `human-judgement` TR-32.1: 移动端首页与 panzi-tools-mobile/pages/index.html 设计一致
    - `human-judgement` TR-32.2: 移动端分类页与 panzi-tools-mobile/pages/dev-tools.html 设计一致
    - `human-judgement` TR-32.3: 移动端工具页与 panzi-tools-mobile/pages/json-format.html 设计一致
    - `programmatic` TR-32.4: 移动端页面正确显示工具使用次数和点赞数
    - `programmatic` TR-32.5: 移动端页面底部导航栏正确显示

## 新增任务：移动端工具组件实现（P0 优先级）

- [x] Task 33: 移动端开发者工具组件实现（P0）
  - **Priority**: high
  - **Depends On**: Task 32
  - **Description**:
    - **SubTask 33.1**: 创建 `components/mobile/tools/MobileJsonFormatter.vue` JSON 格式化工具
    - **SubTask 33.2**: 创建 `components/mobile/tools/MobileUrlEncode.vue` URL 编码解码工具
    - **SubTask 33.3**: 创建 `components/mobile/tools/MobileBase64.vue` Base64 编码工具
    - **SubTask 33.4**: 创建 `components/mobile/tools/MobileTimestamp.vue` 时间戳转换工具
    - **SubTask 33.5**: 创建 `components/mobile/tools/MobileRegexTester.vue` 正则测试工具
    - **SubTask 33.6**: 创建 `components/mobile/tools/MobileJwtDecoder.vue` JWT 解析工具
    - **SubTask 33.7**: 创建 `components/mobile/tools/MobileHash.vue` 哈希计算工具
    - 每个工具组件复用 PC 端的业务逻辑（utils/tools/），仅重写 UI 层
    - 每个工具组件接入统计上报、点赞功能、广告展示
  - **Acceptance Criteria Addressed**: AC-30.3, AC-30.5, AC-30.6
  - **Test Requirements**:
    - `programmatic` TR-33.1: 移动端 JSON 格式化功能与 PC 端结果一致
    - `programmatic` TR-33.2: 移动端 URL 编码解码功能与 PC 端结果一致
    - `programmatic` TR-33.3: 移动端 Base64 编码解码功能与 PC 端结果一致
    - `programmatic` TR-33.4: 移动端时间戳转换功能与 PC 端结果一致
    - `programmatic` TR-33.5: 移动端正则测试功能与 PC 端结果一致
    - `programmatic` TR-33.6: 移动端 JWT 解析功能与 PC 端结果一致
    - `programmatic` TR-33.7: 移动端哈希计算功能与 PC 端结果一致
    - `programmatic` TR-33.8: 所有移动端工具页面统计事件正常上报
    - `human-judgement` TR-33.9: 所有移动端工具页面样式与静态设计一致

## 新增任务：移动端工具组件实现（P1 优先级）

- [x] Task 34: 移动端图片工具及辅助页面实现（P1）
  - **Priority**: medium
  - **Depends On**: Task 32
  - **Description**:
    - **SubTask 34.1**: 创建 `components/mobile/tools/MobileImageCompress.vue` 图片压缩工具
    - **SubTask 34.2**: 创建 `components/mobile/tools/MobileImageCrop.vue` 图片裁剪工具
    - **SubTask 34.3**: 创建 `components/mobile/tools/MobileImageConvert.vue` 格式转换工具
    - **SubTask 34.4**: 创建 `pages/mobile/about.vue` 关于页
    - **SubTask 34.5**: 创建 `pages/mobile/privacy.vue` 隐私政策页
    - 图片工具需确保本地处理逻辑在移动端正常工作（Canvas API 兼容性）
  - **Acceptance Criteria Addressed**: AC-30.3, AC-30.5, AC-30.10
  - **Test Requirements**:
    - `programmatic` TR-34.1: 移动端图片压缩功能正常（上传、压缩、下载）
    - `programmatic` TR-34.2: 移动端图片裁剪功能正常
    - `programmatic` TR-34.3: 移动端格式转换功能正常
    - `human-judgement` TR-34.4: 移动端关于页与隐私政策页样式正确
    - `human-judgement` TR-34.5: 图片工具在移动端触控操作流畅

## 新增任务：移动端适配集成测试与优化

- [x] Task 35: 移动端适配集成测试与优化
  - **Priority**: high
  - **Depends On**: Task 33, Task 34
  - **Description**:
    - **SubTask 35.1**: 配置移动端专属路由规则，确保 SEO 友好
    - **SubTask 35.2**: 实现移动端组件懒加载（defineAsyncComponent），首屏不加载 PC 端组件
    - **SubTask 35.3**: 添加移动端专属 SEO 元数据（viewport、OG 等）
    - **SubTask 35.4**: 验证移动端广告数据动态获取（中间广告 + 底部广告）
    - **SubTask 35.5**: 验证移动端百度统计上报正常
    - **SubTask 35.6**: 验证移动端点赞功能正常
    - **SubTask 35.7**: 性能优化：确保移动端首屏资源 < 200KB，关键 CSS 内联
  - **Acceptance Criteria Addressed**: AC-30.5, AC-30.6, AC-30.8, AC-30.10
  - **Test Requirements**:
    - `programmatic` TR-35.1: 移动端页面正确获取并展示广告数据
    - `programmatic` TR-35.2: 移动端百度统计 PV 和事件正常上报
    - `programmatic` TR-35.3: 移动端点赞功能正常（首次点赞、重复点赞）
    - `programmatic` TR-35.4: 移动端首屏资源加载时间 < 2s（4G 网络模拟）
    - `human-judgement` TR-35.5: 移动端页面无横向滚动，布局自适应
    - `human-judgement` TR-35.6: PC 端功能不受移动端适配影响

# Task Dependencies (移动端)

* Task 30（设备检测与布局切换）依赖 Task 1（前端骨架）
* Task 31（通用组件）依赖 Task 30
* Task 32（核心页面 P0）依赖 Task 31
* Task 33（工具组件 P0）依赖 Task 32
* Task 34（图片工具 + 辅助页面 P1）依赖 Task 32
* Task 35（集成测试与优化）依赖 Task 33、Task 34

移动端任务可与现有任务并行执行，不影响 PC 端功能。

## 新增里程碑：意见反馈 + 管理后台 + Cron 工具（PRD panzitool2）

> 对应 PRD `prd/panzitool2.md`：在现有工具类网站基础上扩展三大新功能。
> 里程碑 M1（意见反馈前台留言板）→ M2（站长管理后台）→ M3（Cron 表达式工具）。
> M2 依赖 M1 的留言数据模型；M3（Cron 工具）独立，可与 M1/M2 并行。

### 里程碑 M1：意见反馈（前台公开留言板）

* [x] Task 36: 实现意见反馈公开留言板（前台）

  * [x] SubTask 36.1: 编写 feedback_messages 表 Flyway 迁移（id、content、nickname 可空、contact 可空、ip、status visible/hidden/deleted、admin_reply 可空、reply_at、reply_by、created_at、updated_at；(status, created_at) 复合索引、created_at 索引）

  * [x] SubTask 36.2: 实现 FeedbackMessage 实体与 Repository（Spring Data JPA），支持按 status 分页查询、按 id 查询

  * [x] SubTask 36.3: 实现留言提交接口 `POST /api/v1/feedback`（content 必填长度校验、nickname/contact 可选长度校验、后端获取 IP、基础限流同一 IP 1 分钟最多 3 条、XSS 输出转义）

  * [x] SubTask 36.4: 实现公开留言查询接口 `GET /api/v1/feedback?page=N&size=M`（返回 status=visible 的留言倒序分页、含 admin_reply/reply_at、XSS 转义防护）

  * [x] SubTask 36.5: 编写单元测试与集成测试（提交成功、内容校验失败、频率限制、公开查询分页、隐藏留言不展示）

  * [x] SubTask 36.6: 前端顶部导航在"关于我们"后新增"意见反馈"入口（PC 端 AppHeader 与移动端 MobileHeader/MobileBottomNav）

  * [x] SubTask 36.7: 实现 `/feedback` 留言板页面（留言提交表单 content 必填+nickname/contact 可选、基础校验与成功提示、公开留言列表时间倒序分页、每条展示内容/时间/昵称/站长回复）

  * [x] SubTask 36.8: 实现移动端 `/mobile/feedback` 留言板页面（复用 PC 端 API 与逻辑，移动端布局）

  * [x] SubTask 36.9: 留言板页面 SEO（title/description）与隐私说明（留言公开展示提示）

  * 验证：留言提交成功并展示、空内容/超长内容校验失败、频率限制生效、隐藏/删除留言不展示、分页正常 ✅

### 里程碑 M2：站长管理后台（登录+回复+内容治理）

> 设计参考：`panzitool-extension/pages/admin-login.html`（登录页）、`admin-messages.html`（列表页）、`admin-message-detail.html`（详情与回复页）。
> 技术选型：后端无 Spring Security 依赖，采用**轻量级自实现方案**（环境变量凭据 + BCrypt 比对 + HandlerInterceptor 鉴权 + 内存会话/限流），避免引入新框架。
> 包路径：`com.panzipool.api.web.admin.*`（entity/dto/service/controller）+ `com.panzipool.api.config.AdminAuthInterceptor`。

* [ ] Task 37: 实现站长管理后台（登录+回复+内容治理）

#### 阶段一：后端认证与鉴权基础设施

  * [x] SubTask 37.1: 管理员凭据配置与会话存储
    - 在 `application.yml` 新增 `admin.username`、`admin.password-hash`（BCrypt 哈希值）配置项；`.env.example` / `docker-compose.yml` 补充 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` 环境变量
    - 创建 `backend/src/main/java/com/panzipool/api/web/admin/config/AdminProperties.java`（`@ConfigurationProperties(prefix = "admin")`，字段 username、passwordHash、sessionTimeoutMinutes=120）
    - 创建 `backend/src/main/java/com/panzipool/api/web/admin/session/AdminSessionStore.java`：内存会话存储（`ConcurrentHashMap<String, AdminSession>`），session token 用 `UUID.randomUUID()` 生成；AdminSession 含 token、username、expireAt；提供 create/get/remove/cleanup 方法；过期自动清理
    - 在 `pom.xml` 确认 `spring-security-crypto` 依赖（BCryptPasswordEncoder），若无需新增 `<dependency>`（`org.springframework.security:spring-security-crypto`，无需完整 spring-security）

  * [x] SubTask 37.2: 管理员登录接口 `POST /api/v1/admin/login`
    - 创建 `backend/src/main/java/com/panzipool/api/web/admin/controller/AdminAuthController.java`（`@Tag(name = "Admin Auth")`、`@RequestMapping("/admin")`）
    - 创建 DTO：`AdminLoginRequest`（username、password，均 @NotBlank）、`AdminLoginResponse`（token、username、expireAt）
    - 创建 `AdminAuthService`：`login(username, password, ip)` 方法——校验用户名匹配 + BCrypt 比对密码哈希；成功则通过 AdminSessionStore 创建会话并返回 token；失败抛 BusinessException(401, "账号或密码错误")
    - 登录失败限流：同一 IP 5 分钟内最多 5 次失败（复用 FeedbackService 的滑动窗口模式，`ConcurrentHashMap<String, Deque<Long>>`），超限返回 429
    - 登录成功时清除该 IP 的失败计数
    - 接口返回 `ApiResponse<AdminLoginResponse>`，同时通过 `ResponseCookie` 设置 `admin_token` cookie（HttpOnly、SameSite=Strict、Path=/api/v1/admin、Max-Age=7200、Secure 根据 profile 决定）

  * [x] SubTask 37.3: 管理员鉴权拦截器
    - 创建 `backend/src/main/java/com/panzipool/api/config/AdminAuthInterceptor.java` 实现 `HandlerInterceptor`
    - `preHandle`：从 cookie 读取 `admin_token`（缺失则从 `Authorization: Bearer <token>` 头读取），通过 AdminSessionStore 校验有效性；无效返回 401 JSON（`ApiResponse.error(401, "未登录或会话已过期")`）
    - 注册拦截器：在 `WebMvcConfigurer`（若不存在则创建 `com.panzipool.api.config.WebMvcConfig`）的 `addInterceptors` 中注册，路径模式 `/**` 作用于 `com.panzipool.api.web.admin.controller` 包下的所有控制器
    - 排除登录接口 `/admin/login` 本身
    - 将当前管理员用户名存入 `request.setAttribute("adminUser", username)` 供 controller 读取

  * [x] SubTask 37.4: 登出接口 `POST /api/v1/admin/logout`
    - 在 `AdminAuthController` 新增 `POST /admin/logout`：从 cookie/header 读取 token，调用 `AdminSessionStore.remove(token)`，清除 cookie（Max-Age=0），返回 `ApiResponse.success(null)`

  * [x] SubTask 37.5: 当前管理员信息接口 `GET /api/v1/admin/me`（可选，供前端校验登录态）
    - 返回 `{ username, expireAt }`，用于前端路由守卫判断是否已登录

  * [x] SubTask 37.6: CSRF 防护（SameSite cookie 方案）
    - 由于采用 SameSite=Strict cookie，天然防范 CSRF，无需额外 token 机制
    - 在 AdminAuthInterceptor 的 preHandle 中校验 `Origin`/`Referer` 头（可选加固）：若请求来源域名与配置的允许域名不匹配则拒绝

#### 阶段二：后端留言管理 API

  * [x] SubTask 37.7: 管理员留言管理 Service
    - 创建 `backend/src/main/java/com/panzipool/api/web/admin/service/AdminFeedbackService.java`
    - 方法：
      - `listFeedback(page, size, status, keyword)`：支持按 status 筛选（visible/hidden/deleted/null=全部）+ keyword 内容模糊搜索（`contentContaining`），按 createdAt 倒序分页；返回 `Page<AdminFeedbackItem>`（含完整字段：id/content/nickname/contact/ip/status/adminReply/replyAt/replyBy/createdAt）
      - `getFeedbackDetail(id)`：按 id 查询，不存在抛 404
      - `replyFeedback(id, replyContent, adminUser)`：更新 adminReply、replyAt=now、replyBy=adminUser；不存在抛 404
      - `updateStatus(id, newStatus)`：切换 visible↔hidden↔deleted；不存在抛 404
    - 扩展 `FeedbackMessageRepository`：新增 `findByStatusAndContentContainingOrderByCreatedAtDesc`、`findByContentContainingOrderByCreatedAtDesc`

  * [x] SubTask 37.8: 管理员留言管理 Controller
    - 创建 `backend/src/main/java/com/panzipool/api/web/admin/controller/AdminFeedbackController.java`（`@Tag(name = "Admin Feedback")`、`@RequestMapping("/admin/feedback")`）
    - `GET /admin/feedback`：参数 page(默认0)、size(默认10)、status(可选)、keyword(可选)；返回 `ApiResponse<Page<AdminFeedbackItem>>`
    - `GET /admin/feedback/{id}`：返回 `ApiResponse<AdminFeedbackDetail>`
    - `PUT /admin/feedback/{id}/reply`：`@RequestBody AdminReplyRequest{reply: @NotBlank @Size(max=1000)}`；从 request attribute 读取 adminUser；返回 `ApiResponse<AdminFeedbackDetail>`
    - `PUT /admin/feedback/{id}/status`：`@RequestBody AdminStatusRequest{status: @Pattern("visible|hidden|deleted")}`；返回 `ApiResponse<AdminFeedbackDetail>`
    - 创建 DTO：`AdminFeedbackItem`、`AdminFeedbackDetail`、`AdminReplyRequest`、`AdminStatusRequest`

#### 阶段三：前端后台页面（参考 panzitool-extension 设计）

  * [x] SubTask 37.9: 创建后台布局与路由守卫
    - 创建 `frontend/layouts/admin.vue`：参考 `admin-messages.html` 的 header（深色 slate-900 背景、shield 图标、标题"盘子工具站 管理后台"、退出登录按钮）
    - 创建 `frontend/middleware/admin-auth.ts`：检查 cookie/localStorage 中的 admin_token，无则重定向到 `/admin/login`；可通过调用 `GET /api/v1/admin/me` 校验会话有效性
    - 在 `nuxt.config.ts` 的 `runtimeConfig.public` 中无需新增（复用 apiBase）

  * [x] SubTask 37.10: 实现 `/admin/login` 登录页
    - 创建 `frontend/pages/admin/login.vue`：参考 `admin-login.html` 设计
    - 布局：深色 header（shield 图标 + "盘子工具站 管理后台" + 返回首页链接）+ 居中登录卡片 + footer
    - 登录表单：账号输入框、密码输入框、错误提示区（隐藏，红色背景）、登录按钮（主色背景）
    - 提交逻辑：`POST /api/v1/admin/login`（credentials: 'include' 以接收 cookie），成功后 `navigateTo('/admin/feedback')`；失败展示错误提示
    - 表单校验：账号/密码非空
    - useHead 设置 title "站长登录 - 盘子工具站"

  * [x] SubTask 37.11: 实现 `/admin/feedback` 留言管理列表页
    - 创建 `frontend/pages/admin/feedback.vue`：参考 `admin-messages.html` 设计
    - 设置 `definePageMeta({ layout: 'admin', middleware: 'admin-auth' })`
    - 左侧侧边栏：留言管理（高亮）、广告管理（预留 disabled）
    - 顶部工具栏：搜索框（搜索留言内容或昵称）+ 状态下拉筛选（全部/已回复/待回复/已隐藏）+ 刷新按钮
    - 留言表格：列 = 留言内容(max-w-md truncate)/昵称/时间/状态(标签：待回复=黄、已回复=绿、已隐藏=灰)/操作(查看/回复/隐藏|恢复)
    - 分页：总数显示 + 上一页/页码/下一页按钮
    - API：`GET /api/v1/admin/feedback?page&size&status&keyword`，SSR 用 useAsyncData 获取
    - 状态筛选/搜索/分页变化时重新请求（watch + refresh）
    - 点击"查看"跳转 `/admin/feedback/[id]`；点击"回复"跳转详情页；点击"隐藏/恢复"直接调用 `PUT /admin/feedback/{id}/status` 并刷新
    - useHead 设置 title "留言管理 - 管理后台"

  * [x] SubTask 37.12: 实现 `/admin/feedback/[id]` 留言详情与回复页
    - 创建 `frontend/pages/admin/feedback/[id].vue`：参考 `admin-message-detail.html` 设计
    - 设置 `definePageMeta({ layout: 'admin', middleware: 'admin-auth' })`
    - 返回链接："返回留言列表"
    - 留言详情卡片：状态标签 + 时间 + 留言者 + 联系方式 + 留言内容（whitespace-pre-wrap 保留换行）
    - 操作栏：隐藏留言按钮（eye-off 图标）、删除按钮（trash-2 图标，红色）
    - 回复编辑卡片：标题"站长回复" + textarea（rows=5，placeholder"输入回复内容..."）+ 保存回复按钮（send 图标，主色）
    - 历史回复卡片（若已有回复）：展示回复内容 + 回复时间 + 删除回复按钮（清空 adminReply）
    - API：`GET /api/v1/admin/feedback/{id}` 获取详情；`PUT /admin/feedback/{id}/reply` 保存回复；`PUT /admin/feedback/{id}/status` 更新状态
    - 操作成功后展示 toast/提示并刷新数据
    - useHead 设置 title "留言详情 - 管理后台"

  * [x] SubTask 37.13: 实现登出功能
    - 在 admin layout 的"退出登录"按钮调用 `POST /api/v1/admin/logout`，成功后跳转 `/admin/login`
    - 前端清理 localStorage 中的 admin 状态（如有）
    - 按钮 Loading 态禁用 + try/catch 保证 API 失败时仍可清理本地状态

#### 阶段四：测试与联调

  * [x] SubTask 37.14: 后端单元测试与集成测试
    - 测试 AdminAuthService.login：正确凭据返回 token、错误密码抛 401、错误用户名抛 401
    - 测试 AdminAuthInterceptor：无 token 返回 401、无效 token 返回 401、有效 token 通过
    - 测试 AdminFeedbackService.listFeedback：status 筛选、keyword 搜索、分页
    - 测试 AdminFeedbackService.replyFeedback：更新 adminReply/replyAt/replyBy 正确
    - 测试 AdminFeedbackService.updateStatus：visible→hidden→deleted→visible 状态流转正确
    - 测试登录失败限流：同一 IP 5 次失败后第 6 次返回 429

  * 验证：管理员登录成功/失败、未认证访问 401、留言列表筛选/分页/搜索、回复保存并同步前台、隐藏/删除/恢复生效、登录失败限流、登出后会话失效 ✅

### 里程碑 M3：Cron 表达式工具

* [x] Task 38: 实现 Cron 表达式工具（开发者工具新增）

  * [x] SubTask 38.1: 实现工具纯函数（Cron 解析与校验、中文解释生成、未来触发时间计算）并提取至 `utils/tools/cron.ts`，编写 Vitest 单元测试

  * [x] SubTask 38.2: 实现 Cron 工具 UI（表达式输入区、5段/6段格式切换、字段含义提示与示例、校验结果/错误提示区）

  * [x] SubTask 38.3: 实现人类可读中文解释输出区（覆盖通配符/列表/范围/步长/特殊字符语法）

  * [x] SubTask 38.4: 实现未来触发时间预览（默认 10 次可配置、基于当前时间计算、时区标注、复制/下载可选）

  * [x] SubTask 38.5: 实现常用模板区（每分钟/每小时整点/每天凌晨/每周一/每月1日/工作日9点等，一键填入并触发校验/解释/预览）

  * [x] SubTask 38.6: 实现一键复制 Cron 表达式与解释文本（复用 CopyButton 原子组件）

  * [x] SubTask 38.7: toolRegistry 注册 cron 工具（slug=cron）、后端 tools 表插入元数据种子数据（Flyway）

  * [x] SubTask 38.8: 工具页 SEO（title/description、说明、示例、FAQ、JSON-LD）+ 接入统计/点赞（核心操作触发 tool_use、复制触发 copy）

  * [x] SubTask 38.9: 实现移动端 Cron 工具组件 `components/mobile/tools/MobileCron.vue`（复用 PC 端 utils/tools/cron.ts 业务逻辑、移动端布局、接入移动端 toolRegistry）

  * 验证：5段/6段切换正常、合法/非法表达式校验、中文解释准确、触发时间预览正确、模板一键填入、复制正常、单测通过 ✅

# Task Dependencies（新增里程碑）

* Task 36（意见反馈前台）依赖 Task 2（后端骨架含 API 规范）、Task 7（前端骨架含 ToolLayout/导航）

* Task 37（管理后台）依赖 Task 36（留言数据模型与 API）

* Task 38（Cron 工具）独立，可与 Task 36、Task 37 并行；依赖 Task 7（前端骨架含 toolRegistry）

