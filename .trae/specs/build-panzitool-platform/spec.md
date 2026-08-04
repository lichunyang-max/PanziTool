# 盘子工具（PanziTool）在线工具聚合站 Spec

## Why

面向中文用户的在线工具聚合站目前分散、体验参差。本平台将开发者高频工具（JSON/URL/Base64/时间戳/正则/JWT/哈希，约占 70%）与轻量图片工具（压缩/裁剪改尺寸/格式转换，约占 30%）聚合到统一站点，无需安装、隐私优先（图片本地处理），并通过分类与搜索快速触达，辅以匿名使用统计与点赞帮助用户识别热门工具，为后续迭代提供数据支撑。

## What Changes

本变更从零构建一个全栈工具聚合站点，包含以下能力：

- **站点基础框架**：首页、分类页（开发者工具/图片工具）、工具详情页路由；面包屑导航与站内链接结构；全站本地搜索（工具名/关键词）；基础 SEO（独立 URL、title/description、sitemap.xml、robots.txt、**JSON-LD 结构化数据**、canonical URL 与 trailing slash 规范、OG 标签）；关于页与隐私政策页（强调图片本地处理/不上传）。
- **匿名使用统计与点赞系统（后端+数据库）**：数据模型拆分为 `tools`（工具元数据，含 use_count/like_count 冗余计数字段）、`tool_event_logs`（原始事件日志）、`tool_event_daily`（按天聚合统计）、`tool_likes`（点赞，对 (tool_id, anon_id) 唯一约束）、`site_visitor_daily`（按日 PV/UV 估算）；事件上报 API（page_view / tool_use / copy / download）；点赞 API（同一 anon_id 对同一工具仅一次、不可取消，基于 (tool_id, anon_id) 唯一约束防刷）；工具页展示使用次数与点赞次数（读取冗余计数，避免实时 COUNT）；匿名 ID 通过 localStorage 生成 UUID（MVP 基础防刷，不抵御伪造）。
- **7 个开发者工具**：JSON 格式化/压缩/校验、URL 编码/解码、Base64 编码/解码（文本，UTF-8）、时间戳转换（秒/毫秒互转）、正则表达式测试（flags + 高亮 + 分组）、JWT 解析（Header/Payload + exp/iat 可读时间 + 安全提示）、哈希计算（MD5/SHA1/SHA256，Web Crypto + 轻量 MD5 库）。
- **3 个图片工具（本地处理，不上传）**：图片压缩（质量/最大宽高、多文件、前后大小对比、下载、**EXIF 方向修正**）、图片裁剪/改尺寸（裁剪框/比例/自定义尺寸、Canvas 重采样、png/jpg 导出）、图片格式转换（png/jpg/webp 互转、透明背景提示）。
- **前端架构（Nuxt3 SSR）**：工具页通用布局组件（ToolLayout）+ 工具注册机制（toolRegistry）；工具交互组件懒加载（代码分割，首屏不加载工具代码）；SSR 数据获取含降级策略（后端不可用时页面仍渲染）；统一 API 客户端封装（信封解包）；前端错误边界；runtimeConfig 环境配置管理；前端测试策略（纯函数单测）。
- **广告位集成（预留+可配置）**：首页/分类页/工具页广告位规划；可配置广告组件（开关、广告位 key）；异步注入第三方脚本不阻塞首屏；未配置或加载失败时降级不影响布局；隐私/免责声明链接。
- **统计分析接入**：接入百度统计（hm.js?id=06c8d960aee8a68f0a9a229ff4a18ceb）**仅用于运营分析**（PV/UV、用户行为路径）；自建后端统计**仅用于站内展示**（工具使用次数、点赞次数）；单页应用路由切换 PV 统计；关键事件埋点（格式化/转换/下载/复制）；隐私政策分别说明统计用途。
- **部署交付**：Docker 容器化（docker-compose：nginx 反代 + nuxt 前端 + Java API + postgres）；腾讯云部署；域名 www.panzipool.com 主站，裸域 panzipool.com 301 跳转、强制 HTTPS；PostgreSQL 定期备份；后端结构化日志。
- **意见反馈公开留言板（前台）**：顶部导航在"关于我们"后新增"意见反馈"入口；公开留言板页面支持用户提交留言（内容必填、昵称/联系方式可选）；留言与站长回复在公开页面展示（时间倒序、分页）；基础安全（同 IP 限流、内容长度限制、XSS 输出转义）。
- **站长管理后台（留言管理与回复）**：新增 `/admin` 后台入口与基础布局；管理员登录认证（账号密码、环境变量配置、单管理员、会话管理 cookie/token）；留言管理列表（搜索/筛选）；回复功能（新增/更新回复、记录回复时间与回复人）；内容治理（软删除/隐藏/恢复不当内容）；基础鉴权与安全（接口鉴权、防 CSRF、登录失败限流）。
- **Cron 表达式工具（开发者工具新增）**：开发者工具列表/导航新增 Cron 表达式入口；支持 5 段（分 时 日 月 周）与 6 段（秒 分 时 日 月 周）格式切换；表达式解析与合法性校验（范围、特殊字符、步长、列表）；人类可读中文解释（如"每周一到周五 09:30 执行"）；未来触发时间预览（默认 10 次，可配置）；常用模板与一键复制。

技术栈：前端 Nuxt3（Vue3 + TypeScript，SSR/SEO）；后端 Spring Boot 3.x + JDK 17；ORM Spring Data JPA + Flyway 迁移；数据库 PostgreSQL；Docker 部署。

**范围声明（Out of Scope）**：MVP 不含管理后台与报表后台；工具元数据通过 Flyway 种子数据或配置文件管理；后台报表为未来需求。anon_id 为客户端生成，MVP 防刷仅为基础级（同设备一次），不抵御恶意伪造，后续可叠加 IP+设备指纹。哈希工具 MVP 仅支持文本哈希，文件哈希为后续需求。图片工具大图处理迁移到 Web Worker 为后续优化项。

## Impact

- Affected specs: 无（Greenfield 项目，本 spec 为初始规格基线）
- Affected code: 全新代码库
  - 前端：`frontend/`（Nuxt3 应用，工具页面、ToolLayout 通用布局、toolRegistry 注册表、useApi 统一客户端、runtimeConfig 配置、统计/广告组件、SSR 数据获取层、错误边界、通用 UI 原子组件、**意见反馈留言板页面、管理后台页面、Cron 表达式工具页面**）
  - 后端：`backend/`（Spring Boot 应用，统计/点赞 API、Flyway 迁移、统一响应/异常处理、输入校验、OpenAPI 文档、**留言/回复 API、管理员认证与鉴权、留言管理 API**）
  - 部署：`docker-compose.yml`、`nginx/`、`Dockerfile`（前端/后端）
- 外部依赖：百度统计（hm.js?id=06c8d960aee8a68f0a9a229ff4a18ceb）、第三方广告平台（待定）、腾讯云基础设施、域名 www.panzipool.com

## ADDED Requirements

### Requirement: API 设计规范

系统 SHALL 遵循统一的 API 设计规范：所有后端接口统一加版本前缀 `/api/v1/`；统一响应信封格式；所有接口做服务端输入校验（JSR-303 Bean Validation）；CORS 仅允许前端域名（生产 `https://www.panzipool.com`，开发 localhost）；后端 SHALL 提供 OpenAPI/Swagger 文档。前端 SHALL 封装统一 API 客户端 composable（`useApi`），在拦截层解包 `{code, data}` 信封，`code !== 0` 时抛出业务错误，上层使用方无需感知信封格式。

#### Scenario: 统一响应格式
- **WHEN** 任意 API 调用成功
- **THEN** 返回 `{ "code": 0, "data": {...} }`
- **WHEN** 任意 API 调用失败
- **THEN** 返回 `{ "code": <业务错误码>, "message": "<友好提示>" }`

#### Scenario: 输入校验
- **WHEN** 客户端提交非法入参（如非法 event_type、格式错误的 slug、超长字符串）
- **THEN** 返回校验错误响应，拒绝处理

### Requirement: 前端配置与环境管理

系统 SHALL 使用 Nuxt3 `runtimeConfig` 管理环境相关配置，避免硬编码。SSR 阶段使用内网后端地址（`runtimeConfig.apiBase`，服务端专用，如 Docker 内网 `http://java-api:8080`），客户端阶段使用公开地址（`runtimeConfig.public.apiBase`，如 `https://www.panzipool.com/api`）。百度统计 ID、广告位 key 等也通过 `runtimeConfig.public` 管理。

#### Scenario: 多环境配置
- **WHEN** 应用在不同环境（开发/生产）运行
- **THEN** 通过 runtimeConfig 自动加载对应环境的后端地址、统计 ID、广告位 key，无需修改代码

### Requirement: 站点信息架构与路由

系统 SHALL 提供首页、分类页（开发者工具/图片工具）、工具详情页的清晰路由结构，并支持面包屑导航与站内链接结构以利于 SEO 与用户导航。

#### Scenario: 用户访问首页
- **WHEN** 用户访问站点根路径 `/`
- **THEN** 展示分类入口、搜索框、热门/最新工具区块、推荐工具卡片布局

#### Scenario: 用户访问分类页
- **WHEN** 用户访问 `/category/developer` 或 `/category/image`
- **THEN** 展示对应分类下的工具列表，并支持按热门/最新排序

#### Scenario: 用户访问工具详情页
- **WHEN** 用户访问工具独立 URL（如 `/tools/json-formatter`）
- **THEN** 展示该工具的交互界面、使用说明、示例与（可选）FAQ

### Requirement: 工具页通用布局组件与注册机制

系统 SHALL 封装统一的工具页布局组件（ToolLayout），包含：面包屑导航、工具交互区插槽、使用说明区、示例区、FAQ 区（可选）、使用次数/点赞展示、广告位插槽。各工具页通过插槽注入专属交互逻辑，保证视觉与结构一致性。系统 SHALL 采用工具注册机制（`toolRegistry.ts`，slug → 组件 映射），配合 Nuxt 动态路由 `/tools/[slug].vue` 与后端 tools 表元数据驱动侧边栏/搜索/首页卡片，避免每加一个工具改多处。

#### Scenario: 工具页统一布局
- **WHEN** 用户访问任意工具详情页
- **THEN** 页面使用 ToolLayout 组件渲染，包含面包屑、交互区、说明、示例、计数/点赞、广告位等统一区块

#### Scenario: 新增工具
- **WHEN** 开发者新增一个工具
- **THEN** 在 toolRegistry 注册 slug→组件映射，并在后端 tools 表插入元数据，前端路由与首页/搜索自动识别

### Requirement: 全站搜索

系统 SHALL 提供全站搜索能力（MVP 阶段前端本地搜索优先），支持按工具名与关键词匹配，并在搜索结果中跳转到对应工具页。

#### Scenario: 搜索匹配工具
- **WHEN** 用户在搜索框输入关键词（如"json"或"时间戳"）
- **THEN** 实时展示匹配的工具列表，点击可进入对应工具页

### Requirement: 基础 SEO

系统 SHALL 为每个工具提供独立 URL、独立 title/description，并提供 sitemap.xml、robots.txt、**JSON-LD 结构化数据（WebApplication 类型，含 name/description/applicationCategory/url，MVP 应实现）**、**canonical URL 与 trailing slash 规范（全站统一无尾斜杠，通过 `<link rel="canonical">` 与 nginx 重定向强制）**、**OG 标签（og:title/og:description/og:url/og:type，利于社交分享）** 以利于搜索引擎收录。

#### Scenario: 搜索引擎抓取
- **WHEN** 搜索引擎爬虫访问 `/sitemap.xml`
- **THEN** 返回包含所有工具页 URL 的 sitemap
- **WHEN** 爬虫访问 `/robots.txt`
- **THEN** 返回正确的爬取规则与 sitemap 引用

#### Scenario: 结构化数据与 canonical
- **WHEN** 爬虫访问工具详情页
- **THEN** HTML 含 WebApplication 类型 JSON-LD 结构化数据与 canonical 链接（无尾斜杠）

### Requirement: 关于与隐私政策页面

系统 SHALL 提供关于页（站点介绍、联系/反馈方式）与隐私政策页（明确声明图片本地处理/不上传、统计用途说明、广告免责声明）。

#### Scenario: 用户查看隐私政策
- **WHEN** 用户访问 `/privacy`
- **THEN** 展示隐私政策，分别说明：图片工具本地处理不上传、百度统计用途（运营分析）、自建后端统计用途（站内展示计数）、广告位免责

### Requirement: 匿名使用统计数据模型

系统 SHALL 设计并维护以下数据库表，迁移通过 Flyway 管理：

- `tools`：工具元数据（id、slug、名称、分类、关键词、描述、启用标志、**use_count 使用次数冗余字段**、**like_count 点赞次数冗余字段**、created_at、updated_at）
- `tool_event_logs`：原始事件日志（id、tool_id、anon_id、event_type、created_at）
- `tool_event_daily`：按天聚合统计（tool_id、event_date、event_type、count，对 (tool_id, event_date, event_type) 唯一约束）
- `tool_likes`：点赞（id、tool_id、anon_id、created_at，对 (tool_id, anon_id) 唯一约束）
- `site_visitor_daily`：站点日统计（stat_date、pv、uv 按 anon_id 去重、created_at）

关键索引策略：
- `tool_event_logs`：(tool_id, created_at)、(anon_id, created_at)
- `tool_event_daily`：(tool_id, event_date, event_type) 唯一索引
- `tool_likes`：(tool_id, anon_id) 唯一约束
- `tools`：slug 唯一索引、(category, use_count) 复合索引（支持分类热门排序）

#### Scenario: 数据库迁移
- **WHEN** 后端应用启动
- **THEN** Flyway 自动执行迁移脚本创建上述表结构与索引

#### Scenario: 原始日志聚合
- **WHEN** tool_event_logs 写入事件后
- **THEN** 通过定时任务/触发器聚合到 tool_event_daily 表，详情页与列表页查询只读 daily 表与 tools 冗余计数

### Requirement: 匿名统计事件上报 API

系统 SHALL 提供事件上报接口 `POST /api/v1/events`，支持 page_view / tool_use / copy / download 事件类型（白名单校验），前端在关键操作时触发上报。事件按天聚合存储。接口 SHALL 做基础频率限制（同一 IP/anon_id 每分钟上限）。前端事件上报 SHALL 为非阻塞 fire-and-forget，失败静默丢弃，不影响用户操作。**`page_view` 事件 SHALL 在客户端水合后上报（携带真实用户 IP 由后端获取），不在 SSR 阶段上报**，以避免 SSR 服务端 IP 导致频率限制失效。前端事件上报客户端 SHALL 维护轻量队列，页面卸载前通过 `navigator.sendBeacon` 发送剩余事件；page_view 在路由切换时去重（同一路由短时间内不重复上报）。

事件触发时机定义：
- `page_view`：进入工具页时触发（客户端水合后）
- `tool_use`：执行工具核心操作时触发（如点击格式化/转换/解析按钮）
- `copy`：点击复制按钮时触发
- `download`：点击下载按钮时触发（图片工具）

#### Scenario: 上报工具使用事件
- **WHEN** 前端在工具页触发 tool_use 事件（携带 tool_id、anon_id、事件类型）
- **THEN** 后端记录该事件到 tool_event_logs 表，同步更新 tools.use_count，按天聚合到 tool_event_daily 可统计使用次数

#### Scenario: 非法事件类型被拒绝
- **WHEN** 客户端提交不在白名单内的 event_type
- **THEN** 返回校验错误，拒绝记录

### Requirement: 点赞 API 与防刷

系统 SHALL 提供点赞接口 `POST /api/v1/tools/{slug}/like`，基于 localStorage 生成的匿名 anon_id 限制同一匿名用户对同一工具仅能点赞一次且不可取消。tool_likes 表对 (tool_id, anon_id) 施加唯一约束以防重复。

响应语义：
- 首次点赞：返回 `200` + `{ like_count: N }`
- 重复点赞：返回 `409 Conflict` + 错误消息

**前端点赞状态同步策略**：
- 进入工具页时，SSR 不查"当前用户是否已点赞"；客户端水合后读取 localStorage 的 `liked_tools` 列表判断按钮状态
- 点击点赞：调用 API，成功（200）则加入 localStorage 列表并乐观更新 like_count；若返回 409（说明 localStorage 被清但后端有记录），则同步修正 localStorage 为已点赞状态

**局限性说明**：anon_id 为客户端 localStorage 生成 UUID，可被清除/伪造；MVP 防刷为基础级（同设备一次），不抵御恶意伪造，后续可叠加 IP+设备指纹。

#### Scenario: 首次点赞
- **WHEN** 匿名用户（anon_id）首次对某工具点赞
- **THEN** 返回 200，记录点赞，返回该工具点赞总数，同步更新 tools.like_count；前端加入 localStorage liked_tools 列表

#### Scenario: 重复点赞被拒绝
- **WHEN** 同一 anon_id 再次对同一工具点赞
- **THEN** 返回 409 Conflict，点赞数不变；点赞不可取消；前端同步修正 localStorage 为已点赞状态

### Requirement: 工具元数据与计数查询 API

系统 SHALL 提供 `GET /api/v1/tools` 列表接口（支持分类、热门/最新排序）与 `GET /api/v1/tools/{slug}` 详情接口（含使用次数、点赞次数）。计数查询 SHALL 读取 tools 表冗余计数字段（use_count/like_count），避免实时 COUNT 聚合。工具元数据种子数据通过 Flyway 初始化（10 个工具的 slug/名称/分类/关键词）。工具列表数据为低频变动，前端可接受短时缓存（如 Nuxt `getCachedData` 或 SWR 策略，60s 内复用），减少 SSR 阶段对后端的重复请求。

#### Scenario: 查看工具使用次数
- **WHEN** 用户进入某工具详情页
- **THEN** 页面展示该工具累计使用次数（tools.use_count）与点赞次数（tools.like_count）

#### Scenario: 按热门排序
- **WHEN** 用户在分类页选择按热门排序
- **THEN** 列表按 tools.use_count 降序返回，使用 (category, use_count) 索引

### Requirement: SSR 数据获取策略

系统 SHALL 明确 Nuxt3 SSR 模式下的数据获取方式：工具详情页的使用次数/点赞次数在 SSR 阶段通过服务端调用后端 API 获取（useFetch/useAsyncData），保证 HTML 含数据利于 SEO；点赞交互为客户端行为（水合后触发）。SSR 阶段为服务端到服务端调用，不走浏览器 CORS。

**SSR 降级策略**：SSR 阶段调用后端 API 失败（超时/5xx）时，工具详情页 SHALL 仍正常渲染（工具交互功能可用），计数区域显示占位或默认值（如"-"），不阻塞首屏。Nuxt `useFetch` 配合 `default` 选项与 try-catch 实现降级。

**数据一致性说明**：计数为"展示型数据"，允许 SSR 与客户端存在短时不一致；点赞成功后客户端本地乐观更新 like_count，无需重新拉取。

#### Scenario: SSR 渲染含计数
- **WHEN** 搜索引擎或用户首次访问工具详情页
- **THEN** SSR 返回的 HTML 已包含使用次数/点赞次数（利于 SEO 与结构化数据）

#### Scenario: SSR 后端不可用降级
- **WHEN** SSR 阶段调用后端 API 失败（超时/5xx）
- **THEN** 工具详情页仍正常渲染（工具交互功能可用），计数区域显示占位或默认值，不阻塞首屏

#### Scenario: 点赞为客户端行为
- **WHEN** 用户点击点赞按钮
- **THEN** 在客户端水合后调用点赞 API，无需重新 SSR

### Requirement: 前端工程化（懒加载/错误边界/原子组件/测试）

系统 SHALL 遵循前端工程化规范：

- **懒加载与代码分割**：工具交互组件 SHALL 懒加载（Nuxt `defineAsyncComponent` 或动态 import），只有进入对应工具页才加载该工具的专属代码与依赖库（如 cropper 库、MD5 库）；首页不加载任何工具交互代码，保证首屏性能。
- **错误边界**：每个工具页 SHALL 包裹错误边界（Nuxt ErrorBoundary 或自定义），工具内异常被捕获并展示友好错误，不影响站点导航与其他功能。
- **通用 UI 原子组件**：封装 `CopyButton`、`ClearButton`、`ExampleButton`、`TextInputArea`、`OutputArea` 等通用组件，保证交互一致性。
- **前端测试策略**：前端核心工具逻辑 SHALL 提取为纯函数（composables/utils），并编写单元测试（Vitest）；关键工具页编写组件渲染测试。
- **可访问性（a11y）**：MVP 应保证键盘可操作（Tab 导航、Enter 触发）、输入框有 label、按钮有 aria-label、颜色对比度达标（WCAG AA）。

#### Scenario: 工具组件懒加载
- **WHEN** 用户访问首页
- **THEN** 首屏 bundle 不含任何工具交互组件代码，仅进入工具页时才加载

#### Scenario: 工具异常隔离
- **WHEN** 某工具运行时抛出异常（如非法输入导致）
- **THEN** 错误边界捕获异常，展示友好错误提示，站点导航与其他功能不受影响

#### Scenario: 前端单元测试
- **WHEN** 运行前端测试
- **THEN** 核心工具纯函数（JSON 格式化、Base64 编解码、时间戳转换等）单元测试通过

### Requirement: JSON 格式化/压缩/校验工具

系统 SHALL 提供 JSON 工具，支持格式化（可配置缩进）、压缩输出、语法校验与错误提示（行列/片段）、复制、清空、示例填充，并具备独立路由、title/description、使用说明与 FAQ。工具 SHALL 对输入长度做基础限制（如超过 1MB 提示警告），避免超大 JSON 阻塞主线程。

#### Scenario: 格式化合法 JSON
- **WHEN** 用户输入合法 JSON 并点击格式化
- **THEN** 输出美化后的 JSON（可配置缩进）

#### Scenario: 校验非法 JSON
- **WHEN** 用户输入非法 JSON 并点击校验
- **THEN** 提示错误位置（行列）与友好片段提示

#### Scenario: 大输入防护
- **WHEN** 用户粘贴超大 JSON（超过 1MB）
- **THEN** 提示警告，建议减小输入或后续使用 Web Worker 解析

### Requirement: URL 编码/解码工具

系统 SHALL 提供 URL 工具，使用 encodeURIComponent/decodeURIComponent 实现编码/解码，支持 Encode/Decode 切换、复制、清空、示例，并处理异常输入提示。

#### Scenario: URL 编码
- **WHEN** 用户输入含特殊字符的字符串并点击 Encode
- **THEN** 输出 URL 编码结果

#### Scenario: 异常解码
- **WHEN** 用户输入非法的 URL 编码字符串并点击 Decode
- **THEN** 提示友好的错误信息

### Requirement: Base64 编码/解码工具（文本）

系统 SHALL 提供 Base64 文本工具，正确处理 UTF-8 字符（中文等），支持编码/解码、复制、清空、示例，并具备独立路由与说明。

#### Scenario: 中文 Base64 编码
- **WHEN** 用户输入中文字符串并点击编码
- **THEN** 输出正确的 Base64 结果（UTF-8 处理）

### Requirement: 时间戳转换工具

系统 SHALL 提供时间戳工具，支持秒/毫秒时间戳与日期时间互转，自动识别秒/毫秒，提供当前时间戳一键获取与复制，并校验非法输入。工具 SHALL 默认使用浏览器本地时区展示，同时显示 UTC 时间，并标注时区信息。

#### Scenario: 时间戳转日期
- **WHEN** 用户输入时间戳并点击转换
- **THEN** 输出对应日期时间（自动识别秒/毫秒，同时展示本地时区与 UTC 时间）

#### Scenario: 获取当前时间戳
- **WHEN** 用户点击"获取当前时间戳"
- **THEN** 展示当前时间戳（秒/毫秒）并提供复制

### Requirement: 正则表达式测试工具

系统 SHALL 提供正则工具，支持正则输入、flags 选择（g/i/m/s/u 等）、测试文本输入，执行 RegExp 匹配并展示 match 列表与分组，在文本中高亮命中片段，并对非法正则提示错误。工具 SHALL 设置执行保护（try-catch 包裹执行），并对 ReDoS 风险在 UI/文档提示。

#### Scenario: 正则匹配与高亮
- **WHEN** 用户输入正则、flags 与测试文本
- **THEN** 展示匹配列表、分组信息，并在文本中高亮命中片段

#### Scenario: 非法正则提示
- **WHEN** 用户输入非法正则
- **THEN** 提示友好的错误信息

### Requirement: JWT 解析工具

系统 SHALL 提供 JWT 工具，按点分段、base64url 解码并 JSON 解析 Header 与 Payload（美化输出），将 exp/iat 等字段转换为可读时间，提供复制，并在页面说明安全提示（不上传/不验签）。

#### Scenario: 解析合法 JWT
- **WHEN** 用户输入合法 JWT 并点击解析
- **THEN** 展示美化后的 Header 与 Payload，并将 exp/iat 转为可读时间

#### Scenario: 解析非法 JWT
- **WHEN** 用户输入非法 JWT
- **THEN** 提示友好的错误信息

### Requirement: 哈希计算工具（MD5/SHA）

系统 SHALL 提供哈希工具，对文本计算 MD5、SHA1、SHA256 等哈希值，SHA 系列使用 Web Crypto API，MD5 使用轻量库，支持算法选择、复制与示例。**MVP 仅支持文本哈希，文件哈希（需流式读取+分块计算）为后续需求。**

#### Scenario: 计算 SHA256
- **WHEN** 用户输入文本并选择 SHA256
- **THEN** 输出对应的 SHA256 哈希值

### Requirement: 图片压缩工具（本地处理）

系统 SHALL 提供图片压缩工具，在浏览器本地（Canvas 重编码或库）压缩 jpg/png/webp，支持质量/最大宽高设置、拖拽上传、预览、前后大小对比、多文件逐个导出下载。默认不上传服务器。**工具 SHALL 在上传后读取并修正 EXIF 方向（如通过 blueimp-load-image 或手动解析），保证预览与导出方向正确。** 工具 SHALL 提供"重新压缩"按钮（位于工具栏全部下载按钮旁边），支持对所有文件批量重新压缩；同时在每个文件项的删除按钮旁边提供单独的"图片压缩"按钮，支持对单个文件重新压缩。

#### Scenario: 压缩单张图片
- **WHEN** 用户上传图片并设置质量/最大宽高后压缩
- **THEN** 在本地完成压缩（含 EXIF 方向修正），展示预览与前后大小对比，并提供下载

#### Scenario: 多文件压缩
- **WHEN** 用户一次选择多张图片
- **THEN** 以列表形式逐个压缩并支持逐个导出

#### Scenario: 批量重新压缩
- **WHEN** 用户调整压缩参数后点击"重新压缩"按钮
- **THEN** 所有文件按照新参数重新压缩，显示压缩进度与结果

#### Scenario: 单文件重新压缩
- **WHEN** 用户点击某文件项旁的"图片压缩"按钮
- **THEN** 该文件单独重新压缩，不影响其他文件

### Requirement: 图片裁剪/改尺寸工具（本地处理）

系统 SHALL 提供图片裁剪工具，支持裁剪框、比例选择、自定义尺寸设置，通过 Canvas 裁剪与重采样导出 png/jpg，提供预览与下载。**工具 SHALL 修正 EXIF 方向。**

#### Scenario: 裁剪并导出
- **WHEN** 用户上传图片、设置裁剪框与比例/尺寸后导出
- **THEN** 本地完成裁剪与重采样（含 EXIF 方向修正），提供 png/jpg 下载

### Requirement: 图片格式转换工具（本地处理）

系统 SHALL 提供图片格式转换工具，在本地将图片在 png/jpg/webp 之间转换，提供预览与下载，并在 png 转 jpg 时提示透明背景将丢失。**工具 SHALL 修正 EXIF 方向。**

#### Scenario: png 转 jpg
- **WHEN** 用户上传 png 并选择转换为 jpg
- **THEN** 本地完成转换（含 EXIF 方向修正），提示透明背景将变为白色/丢失，提供下载

### Requirement: 广告位集成（预留+可配置）

系统 SHALL 在首页/分类页/工具页预留广告位，封装可配置广告组件（支持开关、广告位 key），异步注入第三方脚本不阻塞首屏，未配置或加载失败时降级不影响布局，并提供隐私/免责声明链接。

**首页广告动态数据源需求：**

系统 SHALL 支持首页广告位（`homeMiddle`）从数据库 `ad_promotion` 表动态获取广告信息。查询条件为 `ad_location_symbol = 'home_middle'` 且 `ad_enabled = true`。返回字段包含 `product_description`（广告描述）、`product_url`（广告图片地址）、`ad_url`（广告跳转地址）。后端需提供广告查询 API，前端首页在 SSR 阶段调用该 API 获取数据并渲染广告组件。

#### Scenario: 首页广告动态获取
- **WHEN** 用户访问首页
- **THEN** 前端通过 API 查询 `ad_promotion` 表中 `ad_location_symbol='home_middle'` 且 `ad_enabled=true` 的广告记录
- **THEN** 使用返回的 `product_description`、`product_url`、`ad_url` 字段渲染 `StaticAdCard` 组件
- **THEN** 若无符合条件的广告记录，则该广告位静默隐藏

**工具页底部广告动态数据源需求：**

系统 SHALL 支持开发者工具和图片工具详情页底部广告位（`toolBottom`）从数据库 `ad_promotion` 表动态获取广告信息。查询条件为 `ad_location_symbol = 'tool_footer'` 且 `ad_enabled = true`。返回字段包含 `product_description`（广告描述）、`product_url`（广告图片地址）、`ad_url`（广告跳转地址）。前端 `ToolLayout` 组件在 SSR 阶段调用广告 API 获取数据并渲染广告组件，无广告数据时静默隐藏。

#### Scenario: 工具页底部广告动态获取
- **WHEN** 用户访问任意开发者工具或图片工具详情页
- **THEN** 前端通过 API 查询 `ad_promotion` 表中 `ad_location_symbol='tool_footer'` 且 `ad_enabled=true` 的广告记录
- **THEN** 使用返回的 `product_description`、`product_url`、`ad_url` 字段渲染广告组件
- **THEN** 若无符合条件的广告记录，则该广告位静默隐藏，不影响页面布局

**开发者工具中间广告动态数据源需求：**

系统 SHALL 支持以下 5 个开发者工具页面的中间广告位从数据库 `ad_promotion` 表动态获取广告信息。查询条件为 `ad_location_symbol = 'dev_tool_middle'` 且 `ad_enabled = true`。返回字段包含 `product_description`（广告描述）、`product_url`（广告图片地址）、`ad_url`（广告跳转地址）。各工具组件在 SSR 阶段调用广告 API 获取数据并渲染 `StaticAdCard` 组件，无广告数据时静默隐藏。

涉及的工具页面和广告位位置：
1. 正则测试页面（`regex-tester`）：匹配结果和分组信息之间的广告位
2. 时间戳转换页面（`timestamp`）：时区选择和常用时间戳参考之间的广告位
3. URL 编码解码页面（`url-encode`）：常见特殊字符编码对照表和常见问题之间的广告位
4. JWT 解析页面（`jwt-decoder`）：JWT 令牌输入和 JWT 算法参考之间的广告位
5. 哈希计算页面（`hash`）：文件哈希计算和哈希算法对比之间的广告位

#### Scenario: 开发者工具中间广告动态获取
- **WHEN** 用户访问任意上述 5 个开发者工具页面
- **THEN** 前端通过 API 查询 `ad_promotion` 表中 `ad_location_symbol='dev_tool_middle'` 且 `ad_enabled=true` 的广告记录
- **THEN** 使用返回的 `product_description`、`product_url`、`ad_url` 字段渲染 `StaticAdCard` 组件
- **THEN** 若无符合条件的广告记录，则该广告位静默隐藏，不影响页面布局

**图片工具中间广告动态数据源需求：**

系统 SHALL 支持以下 2 个图片工具页面的中间广告位从数据库 `ad_promotion` 表动态获取广告信息。查询条件为 `ad_location_symbol = 'img_tool_middle'` 且 `ad_enabled = true`。返回字段包含 `product_description`（广告描述）、`product_url`（广告图片地址）、`ad_url`（广告跳转地址）。各工具组件在 SSR 阶段调用广告 API 获取数据并渲染 `StaticAdCard` 组件，无广告数据时静默隐藏。

涉及的工具页面和广告位位置：
1. 图片裁剪页面（`image-crop`）：本地处理保障和常见问题之间的广告位
2. 格式转换页面（`image-convert`）：本地处理保障和格式参考表之间的广告位

#### Scenario: 图片工具中间广告动态获取
- **WHEN** 用户访问任意上述 2 个图片工具页面
- **THEN** 前端通过 API 查询 `ad_promotion` 表中 `ad_location_symbol='img_tool_middle'` 且 `ad_enabled=true` 的广告记录
- **THEN** 使用返回的 `product_description`、`product_url`、`ad_url` 字段渲染 `StaticAdCard` 组件
- **THEN** 若无符合条件的广告记录，则该广告位静默隐藏，不影响页面布局

**广告位详细规划：**

**首页广告位：**
- `homeTop`：首页顶部横幅广告位
- `homeMiddle`：首页热门工具和最新上架之间的广告位

**开发者工具广告位：**
- `jsonBottom`：JSON 格式化页面底部广告位
- `regexMiddle`：正则测试页面分组信息和匹配结果之间的广告位
- `timestampMiddle`：时间戳转换页面时区选择和常用时间戳参考之间的广告位
- `urlMiddle`：URL 编码解码页面常见问题和常见特殊字符编码对照表之间的广告位
- `jwtTop`：JWT 解析页面 JWT 算法参考功能上面的广告位
- `base64Bottom`：Base64 编码页面底部广告位
- `hashMiddle`：哈希计算页面哈希算法对比和文件哈希计算之间的广告位

**图片工具广告位：**
- `imageCompressBottom`：图片压缩页面底部广告位
- `imageCropMiddle`：图片裁剪页面本地处理保障和常见问题功能之间的广告位
- `imageConvertMiddle`：格式转换页面本地处理保障和格式参考表功能之间的广告位

**通用广告位：**
- `sidebar`：侧边栏广告位
- `toolBottom`：工具页底部广告位（通用）

#### Scenario: 广告未配置时降级
- **WHEN** 某广告位未配置或第三方脚本加载失败
- **THEN** 不影响页面布局，广告位静默隐藏或展示占位

#### Scenario: 首页热门工具与最新上架之间广告位
- **WHEN** 用户访问首页
- **THEN** 在热门工具区块和最新上架区块之间展示 `homeMiddle` 广告位

#### Scenario: JSON 格式化页面底部广告位
- **WHEN** 用户访问 JSON 格式化工具页
- **THEN** 在页面底部展示 `jsonBottom` 广告位

#### Scenario: 正则测试页面中间广告位
- **WHEN** 用户访问正则测试工具页
- **THEN** 在分组信息和匹配结果之间展示 `regexMiddle` 广告位

#### Scenario: 时间戳转换页面中间广告位
- **WHEN** 用户访问时间戳转换工具页
- **THEN** 在时区选择和常用时间戳参考之间展示 `timestampMiddle` 广告位

#### Scenario: URL 编码解码页面中间广告位
- **WHEN** 用户访问 URL 编码解码工具页
- **THEN** 在常见问题和常见特殊字符编码对照表之间展示 `urlMiddle` 广告位

#### Scenario: JWT 解析页面顶部广告位
- **WHEN** 用户访问 JWT 解析工具页
- **THEN** 在 JWT 算法参考功能上面展示 `jwtTop` 广告位

#### Scenario: Base64 编码页面底部广告位
- **WHEN** 用户访问 Base64 编码工具页
- **THEN** 在页面底部展示 `base64Bottom` 广告位

#### Scenario: 哈希计算页面中间广告位
- **WHEN** 用户访问哈希计算工具页
- **THEN** 在哈希算法对比和文件哈希计算之间展示 `hashMiddle` 广告位

#### Scenario: 图片压缩页面底部广告位
- **WHEN** 用户访问图片压缩工具页
- **THEN** 在页面底部展示 `imageCompressBottom` 广告位

#### Scenario: 图片裁剪页面中间广告位
- **WHEN** 用户访问图片裁剪工具页
- **THEN** 在本地处理保障和常见问题功能之间展示 `imageCropMiddle` 广告位

#### Scenario: 格式转换页面中间广告位
- **WHEN** 用户访问格式转换工具页
- **THEN** 在本地处理保障和格式参考表功能之间展示 `imageConvertMiddle` 广告位

### Requirement: 统计分析接入（百度统计）

系统 SHALL 接入百度统计（hm.js?id=06c8d960aee8a68f0a9a229ff4a18ceb）**仅用于运营分析**（PV/UV、用户行为路径），与自建后端统计（仅用于站内展示计数）职责分离。配置单页应用路由切换的 PV 统计，并在工具页关键操作（格式化/转换/下载/复制）触发事件埋点，隐私政策分别说明统计用途。

#### Scenario: 路由切换 PV 统计
- **WHEN** 用户在单页应用中切换路由
- **THEN** 百度统计记录对应页面 PV

### Requirement: 运维与数据治理

系统 SHALL 配置运维与数据治理能力：PostgreSQL 定期备份（如每日 pg_dump 或云数据库自动备份，部署文档说明恢复流程）；后端结构化日志（JSON 格式，记录关键操作与错误，MVP 可用文件日志 + docker logs）；事件原始日志（tool_event_logs）保留策略（如保留 90 天明细，超期归档或仅保留聚合数据）。

#### Scenario: 数据库备份
- **WHEN** 到达备份周期
- **THEN** PostgreSQL 自动备份，部署文档含恢复流程说明

#### Scenario: 原始日志保留
- **WHEN** tool_event_logs 记录超过保留期（90 天）
- **THEN** 归档或仅保留 tool_event_daily 聚合数据

### Requirement: Docker 容器化部署

系统 SHALL 通过 docker-compose 编排 nginx 反代 + nuxt 前端 + Java API + postgres，部署于腾讯云，域名 www.panzipool.com 为唯一主站，裸域 panzipool.com 301 跳转到 www，强制 HTTPS。

#### Scenario: 一键部署
- **WHEN** 执行 `docker-compose up -d`
- **THEN** nginx 反代、nuxt 前端、Java API、postgres 容器全部启动，站点可访问

#### Scenario: 裸域跳转与 HTTPS
- **WHEN** 用户访问 `http://panzipool.com` 或 `http://www.panzipool.com`
- **THEN** 强制跳转到 `https://www.panzipool.com`（裸域 301 到 www）

### Requirement: 移动端自适应适配

系统 SHALL 支持根据访问设备自动切换 PC 端或移动端展示模式，提供一致的功能体验。移动端页面基于已完成的 UI 设计（存储于 `panzi-tools-mobile/` 目录）实现。

#### 技术架构

- **设备检测**：使用服务端 User-Agent 检测（Nuxt middleware），在 SSR 阶段判断设备类型并设置布局，避免客户端检测导致的布局闪烁。检测逻辑基于 User-Agent 关键字匹配（Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini）
- **布局切换**：通过 Nuxt Layout 系统实现，`layouts/default.vue` 用于 PC 端，`layouts/mobile.vue` 用于移动端。在 middleware 中检测设备类型后，通过 `route.meta.layout` 或响应式状态动态切换布局
- **组件复用**：业务逻辑（广告获取、统计、工具操作）抽取为 composable，PC/移动端组件共享。UI 层分别实现 PC 端和移动端组件变体
- **路由策略**：使用相同的 URL 路由，根据设备类型加载不同的布局和组件变体，保持 SEO 友好
- **样式方案**：移动端使用 scoped CSS + CSS Variables 实现独立样式系统，不与 PC 端 Tailwind CSS 冲突

#### 移动端页面范围

需要实现移动端版本的页面（参考 `panzi-tools-mobile/pages/` 目录）：

| PC 端页面 | 移动端页面 | 路由 | 优先级 |
|-----------|-----------|------|--------|
| 首页 | index.html | `/` | P0 |
| 开发者工具列表 | dev-tools.html | `/category/developer` | P0 |
| 图片工具列表 | image-tools.html | `/category/image` | P0 |
| JSON 格式化 | json-format.html | `/tools/json-formatter` | P0 |
| URL 编码解码 | url-encode.html | `/tools/url-encode` | P0 |
| Base64 编码 | base64.html | `/tools/base64` | P0 |
| 时间戳转换 | timestamp.html | `/tools/timestamp` | P0 |
| 正则测试 | regex-test.html | `/tools/regex-tester` | P0 |
| JWT 解析 | jwt-parse.html | `/tools/jwt-decoder` | P0 |
| 哈希计算 | hash-calc.html | `/tools/hash` | P0 |
| 图片压缩 | image-compress.html | `/tools/image-compress` | P1 |
| 图片裁剪 | image-crop.html | `/tools/image-crop` | P1 |
| 格式转换 | format-convert.html | `/tools/image-convert` | P1 |
| 关于页 | about.html | `/about` | P1 |
| 隐私政策 | privacy.html | `/privacy` | P1 |

#### 移动端 UI 设计规范

**布局结构：**
- 顶部 Header（52px）：Logo + 返回按钮（工具页），sticky 固定
- 内容区域：单栏展示，16px 内边距
- 底部导航栏（56px）：首页、工具、关于三大入口，fixed 固定

**设计 Token（参考 colors_and_type.css）：**
- 主色调：`--color-primary: #7c3aed`
- 主色浅：`--color-primary-light: #a78bfa`
- 主色背景：`--color-primary-lighter: #ede9fe`
- 成功色：`--state-success: #16a34a`
- 错误色：`--state-error: #dc2626`
- 圆角：`--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`
- 间距：`--spacing-xs: 4px`, `--spacing-sm: 8px`, `--spacing-md: 12px`, `--spacing-lg: 16px`
- 字体：Noto Sans SC, 字重 400/500/600/700

**组件规范：**
- 按钮最小高度 44px（触控友好）
- 卡片圆角 12px，1px 边框
- 工具图标 44px 圆形，渐变背景（#7c3aed → #a78bfa）
- 输入框圆角 8px，聚焦时主色边框 + 浅紫色阴影

**页面模板：**
- 首页：2列网格展示热门工具，竖排列表展示最新上架
- 分类页：Tab 切换（全部/开发者工具/图片工具），竖排列表展示工具
- 工具页：面包屑导航 + 标题 + 使用统计 + 输入/输出区 + 操作按钮栏

#### 移动端组件架构

**需要创建的移动端专用组件：**
- `layouts/mobile.vue`：移动端基础布局（Header + 内容区 + Footer + 底部导航）
- `components/mobile/MobileHeader.vue`：移动端顶部导航
- `components/mobile/MobileFooter.vue`：移动端页脚
- `components/mobile/MobileBottomNav.vue`：移动端底部导航栏
- `components/mobile/MobileToolLayout.vue`：移动端工具页布局
- `components/mobile/MobileToolCard.vue`：移动端工具卡片
- `components/mobile/MobileAdCard.vue`：移动端广告卡片（适配移动端样式）

**移动端工具组件（基于 PC 端逻辑）：**
- `components/mobile/tools/MobileJsonFormatter.vue`
- `components/mobile/tools/MobileUrlEncode.vue`
- `components/mobile/tools/MobileBase64.vue`
- `components/mobile/tools/MobileTimestamp.vue`
- `components/mobile/tools/MobileRegexTester.vue`
- `components/mobile/tools/MobileJwtDecoder.vue`
- `components/mobile/tools/MobileHash.vue`
- `components/mobile/tools/MobileImageCompress.vue`
- `components/mobile/tools/MobileImageCrop.vue`
- `components/mobile/tools/MobileImageConvert.vue`

**共享 composable（PC/移动端共用）：**
- `composables/useDevice.ts`：设备检测 composable
- `composables/useMobileAd.ts`：移动端广告获取逻辑
- 现有 composable（useAnalytics, useAnonId, useBaiduTongji）

#### Scenario: 移动端自动识别
- **WHEN** 用户使用移动设备访问网站任意页面
- **THEN** 系统在 SSR 阶段检测 User-Agent，识别为移动设备
- **THEN** 加载移动端布局（mobile.vue）和移动端组件
- **THEN** 页面底部显示导航栏（首页、工具、关于）
- **THEN** 页面样式、交互符合移动端设计规范（单栏、触控友好、紫色主题）

#### Scenario: PC 端保持不变
- **WHEN** 用户使用桌面设备访问网站
- **THEN** 系统加载原有的 PC 端布局（default.vue）和组件
- **THEN** 现有功能和视觉保持不变
- **THEN** 侧边栏、多列网格布局正常显示

#### Scenario: 功能一致性
- **WHEN** 用户在移动端使用工具功能
- **THEN** 工具的核心功能（格式化、编码、计算等）与 PC 端一致
- **THEN** 广告展示、统计上报、点赞功能正常工作
- **THEN** 页面数据从同一后端 API 获取
- **THEN** 使用次数、点赞次数正确显示

#### Scenario: 广告与统计一致性
- **WHEN** 移动端页面加载时
- **THEN** 中间广告位从 `ad_promotion` 表动态获取对应广告数据
- **THEN** 底部广告位从 `ad_promotion` 表动态获取 `tool_footer` 广告数据
- **THEN** 百度统计正常上报 PV 和事件
- **THEN** 使用次数、点赞次数正确显示

#### Scenario: SEO 兼容
- **WHEN** 搜索引擎爬虫访问页面
- **THEN** 返回 PC 端版本的 HTML（爬虫 User-Agent 按桌面设备处理）
- **THEN** 保持现有 SEO 元数据、JSON-LD 结构化数据不变
- **THEN** canonical URL、OG 标签等保持一致

#### Scenario: 移动端性能
- **WHEN** 移动端页面加载
- **THEN** 首屏资源加载时间 < 2s（4G 网络）
- **THEN** 移动端专属资源按需加载，不加载 PC 端组件
- **THEN** 图片资源使用适当的尺寸和格式

#### Scenario: 设备检测中间件
- **WHEN** 请求到达 Nuxt 服务端
- **THEN** middleware 检查 User-Agent 字符串
- **THEN** 识别 mobile 关键字（Mobile|Android|iPhone|iPad|iPod 等）
- **THEN** 设置 `isMobile` 状态供布局组件使用
- **THEN** 爬虫 User-Agent 按桌面设备处理（确保 SEO）

### Acceptance Criteria (移动端适配)

#### AC-30.1: 设备自动检测
- **Given**: 一个移动设备（宽度 <= 768px 或 User-Agent 包含 mobile 关键字）
- **When**: 用户访问网站任意页面
- **Then**: 系统自动加载移动端布局和组件
- **Verification**: `programmatic`
- **Notes**: 通过 Nuxt middleware 检测，设置响应式状态

#### AC-30.2: 移动端首页渲染
- **Given**: 移动端用户访问首页 `/`
- **When**: 页面加载完成
- **Then**: 显示移动端首页布局（Header + 搜索栏 + 热门工具网格 + 广告 + 最新上架列表 + Footer + 底部导航）
- **Then**: 热门工具以 2 列网格展示，与静态页面设计一致
- **Verification**: `human-judgment`
- **Notes**: 对比 panzi-tools-mobile/pages/index.html 的设计

#### AC-30.3: 移动端工具页渲染
- **Given**: 移动端用户访问任意工具页（如 `/tools/json-formatter`）
- **When**: 页面加载完成
- **Then**: 显示移动端工具页布局（Header + 面包屑 + 标题 + 使用统计 + 输入区 + 操作按钮 + 输出区 + Footer）
- **Then**: 操作流程与 PC 端一致（格式化、编码、计算等功能正常）
- **Verification**: `human-judgment`
- **Notes**: 对比 panzi-tools-mobile/pages/json-format.html 的设计

#### AC-30.4: 底部导航栏
- **Given**: 移动端用户在任意页面
- **When**: 查看页面底部
- **Then**: 显示固定底部导航栏，包含「首页」「工具」「关于」三个入口
- **Then**: 当前页面对应导航项高亮显示（紫色主色调）
- **Verification**: `programmatic`

#### AC-30.5: 功能一致性
- **Given**: 移动端用户使用工具功能
- **When**: 执行核心操作（格式化、编码、压缩等）
- **Then**: 结果与 PC 端完全一致
- **Then**: 统计事件正常上报（tool_use、copy、download）
- **Then**: 点赞功能正常工作
- **Verification**: `programmatic`

#### AC-30.6: 广告展示
- **Given**: 移动端用户访问工具页
- **When**: 页面加载完成
- **Then**: 中间广告位从 `ad_promotion` 表动态获取并渲染
- **Then**: 底部广告位从 `ad_promotion` 表动态获取并渲染
- **Then**: 广告样式适配移动端（卡片样式，12px 圆角）
- **Verification**: `programmatic`

#### AC-30.7: 桌面端不受影响
- **Given**: 桌面端用户访问网站
- **When**: 页面加载完成
- **Then**: 保持原有的 PC 端布局（侧边栏 + 多列网格）
- **Then**: 所有现有功能正常工作
- **Verification**: `human-judgment`

#### AC-30.8: SEO 兼容
- **Given**: 搜索引擎爬虫访问网站
- **When**: 爬虫请求页面
- **Then**: 返回 PC 端版本的 HTML
- **Then**: 保持 JSON-LD 结构化数据、canonical URL、OG 标签完整
- **Verification**: `programmatic`

#### AC-30.9: 触控友好
- **Given**: 移动端用户使用触控操作
- **When**: 点击任意按钮或交互元素
- **Then**: 按钮最小触摸区域 44x44px
- **Then**: 点击反馈即时（<100ms）
- **Then**: 无意外缩放或滚动
- **Verification**: `human-judgment`

#### AC-30.10: 响应式适配
- **Given**: 不同尺寸的移动设备（320px-428px 宽度）
- **When**: 访问网站任意页面
- **Then**: 布局自适应设备宽度
- **Then**: 内容不溢出、不截断
- **Then**: 滚动流畅，无横向滚动条
- **Verification**: `human-judgment`

### Requirement: 意见反馈留言与回复数据模型

系统 SHALL 设计并维护留言与回复数据模型，迁移通过 Flyway 管理：

- `feedback_messages`：留言表（id、content 留言内容、nickname 昵称可空、contact 联系方式可空、ip 提交者 IP、status 状态 visible/hidden/deleted、admin_reply 站长回复可空、reply_at 回复时间、reply_by 回复人可空、created_at、updated_at）
  - status 字段支持软删除与隐藏（visible=公开展示、hidden=隐藏不展示、deleted=软删除）
  - admin_reply 采用单字段存储回复（MVP 简化方案，一条留言一条回复）；如需多条回复可后续拆为 reply 表
  - 索引：(status, created_at) 复合索引支持公开列表查询、created_at 索引支持后台排序

关键约束：
- content 必填，长度限制（如 1-1000 字符）
- nickname 可选，长度限制（如 1-30 字符）
- contact 可选，长度限制（如 1-100 字符）
- ip 由后端从请求中获取，前端不传

#### Scenario: 数据库迁移
- **WHEN** 后端应用启动
- **THEN** Flyway 自动执行迁移脚本创建 feedback_messages 表与索引

#### Scenario: 留言状态流转
- **WHEN** 用户提交留言
- **THEN** 留言状态默认为 visible，可在公开列表展示
- **WHEN** 站长隐藏留言
- **THEN** 状态变为 hidden，公开列表不展示但后台可见
- **WHEN** 站长删除留言
- **THEN** 状态变为 deleted（软删除），公开与后台默认列表不展示

### Requirement: 留言提交 API

系统 SHALL 提供留言提交接口 `POST /api/v1/feedback`，接收 content（必填）、nickname（可选）、contact（可选），后端从请求获取 IP 地址。接口 SHALL 做基础频率限制（同一 IP 短时间内提交限制，如 1 分钟内最多 3 条）与内容长度校验。接口 SHALL 对输出做 XSS 防护（存储原值，输出时转义）。

#### Scenario: 提交留言成功
- **WHEN** 用户提交合法留言（content 必填、长度合规）
- **THEN** 留言存入 feedback_messages 表，状态为 visible，返回成功

#### Scenario: 内容校验失败
- **WHEN** 用户提交空内容或超长内容
- **THEN** 返回校验错误，拒绝存储

#### Scenario: 频率限制
- **WHEN** 同一 IP 在短时间内（如 1 分钟）提交超过限制（如 3 条）
- **THEN** 返回频率限制错误，拒绝存储

### Requirement: 公开留言查询 API

系统 SHALL 提供公开留言查询接口 `GET /api/v1/feedback?page=N&size=M`，返回状态为 visible 的留言列表（按 created_at 倒序、分页），每条留言包含 content、nickname、created_at、admin_reply、reply_at。接口 SHALL 对输出做 XSS 转义防护。

#### Scenario: 查询公开留言列表
- **WHEN** 用户访问公开留言板页面
- **THEN** 接口返回 visible 状态的留言列表（倒序、分页），包含站长回复内容

#### Scenario: 隐藏留言不展示
- **WHEN** 留言状态为 hidden 或 deleted
- **THEN** 公开查询接口不返回该留言

### Requirement: 意见反馈公开留言板（前台）

系统 SHALL 在顶部导航"关于我们"后新增"意见反馈"入口，指向公开留言板页面 `/feedback`。留言板页面 SHALL 提供留言提交表单（content 必填、nickname/contact 可选）与公开留言列表展示（时间倒序、分页）。每条留言展示留言内容、时间、昵称（如有）、站长回复（如有）。提交成功后 SHALL 展示成功提示。页面 SHALL 保持现有站点风格一致。

#### Scenario: 顶部导航入口
- **WHEN** 用户查看顶部导航
- **THEN** "关于我们"后展示"意见反馈"入口，指向 `/feedback`

#### Scenario: 提交留言
- **WHEN** 用户填写留言内容（必填）并可选填写昵称/联系方式后提交
- **THEN** 表单校验通过后调用 API 提交，成功后展示成功提示并刷新列表

#### Scenario: 留言列表展示
- **WHEN** 用户访问留言板页面
- **THEN** 展示公开留言列表（时间倒序），每条显示内容、时间、昵称（如有）、站长回复（如有）

#### Scenario: 分页加载
- **WHEN** 留言数量超过单页
- **THEN** 提供分页或"加载更多"机制

### Requirement: 管理员认证与会话管理

系统 SHALL 实现管理员登录认证（最简方案：账号密码、环境变量配置、单管理员）。管理员凭据通过环境变量配置（如 `ADMIN_USERNAME`、`ADMIN_PASSWORD`），密码 SHALL 做哈希存储/比对（如 BCrypt）。登录成功后 SHALL 创建会话（cookie 或 token），会话 SHALL 有过期时间。后台接口 SHALL 校验会话有效性。系统 SHALL 实现登录失败限流（如同一 IP 短时间多次失败后限制）。系统 SHALL 防范 CSRF（按技术栈选择方案，如 token 或 SameSite cookie）。

#### Scenario: 管理员登录成功
- **WHEN** 管理员输入正确账号密码
- **THEN** 创建会话（cookie/token），重定向到后台首页

#### Scenario: 管理员登录失败
- **WHEN** 管理员输入错误账号密码
- **THEN** 返回错误提示，不创建会话

#### Scenario: 未认证访问后台接口
- **WHEN** 未登录用户访问后台 API
- **THEN** 返回 401 Unauthorized

#### Scenario: 登录失败限流
- **WHEN** 同一 IP 短时间内多次登录失败
- **THEN** 限制后续登录尝试

### Requirement: 留言管理与回复 API

系统 SHALL 提供后台留言管理 API（需管理员鉴权）：
- `GET /api/v1/admin/feedback?page=N&size=M&status=X`：后台留言列表（支持按状态筛选、搜索可选）
- `GET /api/v1/admin/feedback/{id}`：留言详情
- `PUT /api/v1/admin/feedback/{id}/reply`：新增/更新回复（接收 reply 内容、记录 reply_at、reply_by）
- `PUT /api/v1/admin/feedback/{id}/status`：更新留言状态（visible/hidden/deleted）

#### Scenario: 后台查看留言列表
- **WHEN** 管理员访问后台留言列表
- **THEN** 返回留言列表（支持状态筛选、分页），包含所有状态

#### Scenario: 回复留言
- **WHEN** 管理员对某留言提交回复内容
- **THEN** 更新 admin_reply、reply_at、reply_by 字段，公开列表同步展示回复

#### Scenario: 隐藏留言
- **WHEN** 管理员将留言状态改为 hidden
- **THEN** 公开列表不再展示该留言，后台仍可见

#### Scenario: 删除留言（软删除）
- **WHEN** 管理员将留言状态改为 deleted
- **THEN** 公开列表与后台默认列表不展示，数据保留

### Requirement: 管理后台前端

系统 SHALL 新增 `/admin` 后台入口与基础布局页面。后台 SHALL 包含：登录页、留言管理列表页（搜索/筛选/分页）、留言详情与回复页。后台页面 SHALL 与前台风格保持一致但区分布局（管理操作导向）。后台 SHALL 在移动端适配（或标注仅 PC 端使用）。

#### Scenario: 访问后台登录页
- **WHEN** 未登录用户访问 `/admin`
- **THEN** 展示管理员登录表单

#### Scenario: 后台留言管理列表
- **WHEN** 管理员登录后访问留言管理页
- **THEN** 展示留言列表（支持状态筛选、分页），可进入详情或直接回复

#### Scenario: 回复操作
- **WHEN** 管理员在详情页或列表中回复留言
- **THEN** 回复内容保存并同步展示到前台

#### Scenario: 内容治理操作
- **WHEN** 管理员对不当留言执行隐藏/删除
- **THEN** 留言状态更新，前台同步调整展示

### Requirement: Cron 表达式工具入口与页面

系统 SHALL 在开发者工具列表/导航中新增 Cron 表达式工具入口，实现工具页面路由（如 `/tools/cron`）与基础布局，保持现有站点风格一致。工具 SHALL 通过 toolRegistry 注册，后端 tools 表插入元数据。工具 SHALL 接入统计/点赞（与其他工具一致）。SHALL 提供移动端版本（MobileCronTool）。

#### Scenario: 新增 Cron 工具入口
- **WHEN** 用户访问开发者工具列表
- **THEN** 展示 Cron 表达式工具卡片，点击进入工具页

#### Scenario: Cron 工具页渲染
- **WHEN** 用户访问 `/tools/cron`
- **THEN** 展示 Cron 工具交互界面，接入 ToolLayout 与统计/点赞

### Requirement: Cron 格式切换与解析校验

系统 SHALL 实现 5 段（分 时 日 月 周）与 6 段（秒 分 时 日 月 周）两种 Cron 格式切换；切换时 SHALL 提示字段含义与示例。系统 SHALL 对输入 Cron 表达式进行解析与合法性校验（范围、特殊字符 `* - , / ? L W #`、步长、列表等），输出友好的错误提示。

#### Scenario: 切换 Cron 格式
- **WHEN** 用户在 5 段与 6 段格式间切换
- **THEN** 输入区字段数与标签相应变化，展示字段含义与示例

#### Scenario: 校验合法表达式
- **WHEN** 用户输入合法 Cron 表达式
- **THEN** 校验通过，无错误提示，可继续解释与预览

#### Scenario: 校验非法表达式
- **WHEN** 用户输入非法 Cron 表达式（如字段越界、非法字符）
- **THEN** 输出友好的错误提示（指出错误字段与原因）

### Requirement: Cron 人类可读解释

系统 SHALL 将 Cron 表达式翻译为自然语言描述（中文），例如"每周一到周五 09:30 执行"、"每 5 分钟执行一次"、"每月 1 日 00:00 执行"等。解释 SHALL 覆盖常见 Cron 语法（通配符、列表、范围、步长、特殊字符）。

#### Scenario: 生成中文解释
- **WHEN** 用户输入合法 Cron 表达式
- **THEN** 输出对应的中文自然语言描述

### Requirement: Cron 未来触发时间预览

系统 SHALL 展示 Cron 表达式的未来触发时间（默认 10 次，可配置次数）。触发时间 SHALL 基于当前时间计算，考虑时区（使用浏览器本地时区或标注 UTC）。SHALL 支持复制/下载（可选）。

#### Scenario: 预览触发时间
- **WHEN** 用户输入合法 Cron 表达式
- **THEN** 展示未来 N 次触发时间（默认 10 次），按时间顺序排列

#### Scenario: 配置预览次数
- **WHEN** 用户调整预览次数
- **THEN** 触发时间列表相应更新

### Requirement: Cron 常用模板与复制

系统 SHALL 提供常见 Cron 示例模板（如"每分钟"、"每小时整点"、"每天凌晨"、"每周一"、"每月 1 日"、"工作日 9 点"等），支持一键填入表达式。SHALL 支持一键复制 Cron 表达式与解释文本。

#### Scenario: 使用模板
- **WHEN** 用户点击某常用模板
- **THEN** 自动填入对应 Cron 表达式，触发校验、解释与预览

#### Scenario: 复制表达式与解释
- **WHEN** 用户点击复制按钮
- **THEN** 复制 Cron 表达式或解释文本到剪贴板
