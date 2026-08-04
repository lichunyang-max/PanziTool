# Checklist

> 针对各任务的验证检查点。每完成一项任务后逐条核验，通过则勾选。

## Task 2: 初始化后端 Spring Boot 工程骨架（含 API 规范基础设施）

### SubTask 2.1: Spring Boot 3.x + JDK 17 工程初始化
- [x] backend/ 目录使用 Spring Boot 3.3.5 + JDK 17 初始化（pom.xml 中 `<java.version>17</java.version>`）
- [x] 依赖包含 spring-boot-starter-web、spring-boot-starter-data-jpa、spring-boot-starter-validation、spring-boot-starter-actuator
- [x] 依赖包含 flyway-core + flyway-database-postgresql（BOM 管理版本）
- [x] 依赖包含 postgresql 驱动（runtime scope）+ h2（runtime scope，用于无数据库启动）
- [x] 包结构为 `com.panzipool.api`，含 common/config/controller/dto/exception 子包
- [x] 主启动类 PanziPoolApplication 带 @SpringBootApplication + @ConfigurationPropertiesScan

### SubTask 2.2: 统一响应信封与全局异常处理
- [x] ApiResponse<T> 泛型信封类，字段 code/data/message，@JsonInclude(NON_NULL)
- [x] 静态工厂方法 success(data)、success()、error(code, message)
- [x] ApiConstants 定义 CODE_SUCCESS=0 及 HTTP 对齐码与业务码
- [x] BusinessException 含 code + httpStatus 字段
- [x] GlobalExceptionHandler @RestControllerAdvice 处理 MethodArgumentNotValidException（400）
- [x] GlobalExceptionHandler 处理 ConstraintViolationException（400）
- [x] GlobalExceptionHandler 处理 HandlerMethodValidationException（400，使用 Spring 6.1 API getAllValidationResults）
- [x] GlobalExceptionHandler 处理 BusinessException（使用异常自身 code/httpStatus）
- [x] GlobalExceptionHandler 处理 DataIntegrityViolationException（409）
- [x] GlobalExceptionHandler 处理 MissingServletRequestParameterException、HttpMessageNotReadableException、NoResourceFoundException、兜底 Exception

### SubTask 2.3: CORS 配置
- [x] CorsProperties record 通过 @ConfigurationProperties(prefix="panzipool.cors") 绑定
- [x] CorsConfig implements WebMvcConfigurer，addCorsMappings 注册 `/**`
- [x] 默认 profile 允许 localhost（通过 CORS_ORIGINS 环境变量切换）
- [x] dev profile 允许 localhost 多端口
- [x] prod profile 仅允许 https://www.panzipool.com
- [x] 验证：允许的源返回 CORS 头（200 + Access-Control-Allow-Origin），非法源返回 403

### SubTask 2.4: JSR-303 Bean Validation
- [x] spring-boot-starter-validation 已引入
- [x] DemoRequest DTO 使用 @NotBlank/@Size/@NotNull/@Min/@Max/@Email/@Pattern 等约束
- [x] PingController 的 POST /ping/echo 使用 @Valid @RequestBody
- [x] PingController 类上使用 @Validated，GET /ping/greet 使用 @RequestParam + @Pattern
- [x] 验证：非法入参返回 400 + {code:400, message:"字段: 错误信息"}

### SubTask 2.5: springdoc-openapi
- [x] 引入 springdoc-openapi-starter-webmvc-ui 2.6.0
- [x] OpenApiConfig 配置 title="PanziPool API"、version="1.0"、server url="/api/v1"
- [x] application.yml 配置 swagger-ui.path=/docs、api-docs.path=/docs-json
- [x] 验证：/api/v1/docs-json 返回 200，含正确 title/version/paths
- [x] 验证：/api/v1/docs（Swagger UI）可访问

### SubTask 2.6: Actuator 健康检查
- [x] 引入 spring-boot-starter-actuator
- [x] application.yml 配置 management.endpoints.web.exposure.include=health,info
- [x] 验证：/api/v1/actuator/health 返回 {"status":"UP"}

### SubTask 2.7: 开发环境配置
- [x] application.yml（默认 profile，H2 内存库，MODE=PostgreSQL，无外部依赖可启动）
- [x] application-dev.yml（PostgreSQL localhost，show-sql=true）
- [x] application-prod.yml（PostgreSQL 环境变量，CORS www.panzipool.com）
- [x] server.servlet.context-path=/api/v1 统一接口前缀
- [x] Maven Wrapper（mvnw / mvnw.cmd / .mvn/wrapper/）可运行
- [x] .env.example 提供环境变量模板
- [x] flyway.locations=classpath:db/migration，baseline-on-migrate=true
- [x] 验证：`mvn clean compile` 编译通过
- [x] 验证：`mvn test` 8 个测试全部通过（PingControllerTest 7 + PanziPoolApplicationTests 1）
- [x] 验证：`mvn spring-boot:run` 可无数据库启动到 Tomcat（H2 内存库）

## Task 22: 前端测试与可访问性完善

### SubTask 22.1: 核心工具纯函数单元测试
- [x] JSON 工具纯函数单元测试已存在（utils/tools/json.test.ts，36 tests）
- [x] Base64 工具纯函数单元测试已存在（utils/tools/base64.test.ts，27 tests）
- [x] 时间戳工具纯函数单元测试已存在（utils/tools/timestamp.test.ts，37 tests）
- [x] JWT 工具纯函数单元测试已存在（utils/tools/jwt.test.ts，37 tests）
- [x] 哈希工具纯函数单元测试已存在（utils/tools/hash.test.ts，24 tests）
- [x] URL 工具纯函数单元测试已存在（utils/tools/url.test.ts，33 tests）
- [x] 正则工具纯函数单元测试已存在（utils/tools/regex.test.ts，31 tests）
- [x] 图片工具纯函数单元测试已存在（utils/tools/image.test.ts，38 tests）

### SubTask 22.2: 关键工具页组件渲染测试
- [x] JsonFormatter.test.ts 已创建（6 个测试：挂载、输入框、格式化按钮、合法JSON格式化、校验、压缩）
- [x] Timestamp.test.ts 已创建（5 个测试：挂载、输入框、合法时间戳转换、无效时间戳错误、时区按钮组）
- [x] RegexTester.test.ts 已创建（5 个测试：挂载、正则输入框、默认匹配、修改正则匹配、清空）
- [x] 测试使用 @vue/test-utils 的 mount 方法
- [x] useAnalytics 已正确 mock（auto-import 用 mockNuxtImport，显式导入用 vi.mock）
- [x] useRoute 已正确 mock（JsonFormatter 使用 mockNuxtImport）
- [x] 使用 vi.useFakeTimers/setSystemTime 控制定时器（Timestamp/RegexTester）
- [x] 验证：组件渲染测试全部通过（nuxt + happy-dom 双环境各 16 tests）

### SubTask 22.3: a11y 可访问性完善
- [x] TimestampTool.vue：tsError 错误提示 div 添加 role="alert"
- [x] TimestampTool.vue：时区 pill 按钮添加 aria-pressed 与 aria-label
- [x] JwtDecoderTool.vue：errorMessage 错误提示 div 添加 role="alert"
- [x] HashTool.vue：textError 错误提示 div 添加 role="alert"
- [x] HashTool.vue：fileError 错误提示 div 添加 role="alert"
- [x] RegexTesterTool.vue：错误提示 div（v-else 块）添加 role="alert"
- [x] AppSidebar.vue：两个 section title 按钮添加 aria-expanded 与 aria-controls
- [x] AppSidebar.vue：active 链接添加 aria-current="page"
- [x] 未修改 a11y 状态良好的组件（JsonFormatterTool/ToolLayout/UrlEncodeTool/Base64Tool/AppHeader/CopyButton）
- [x] 所有图标均带 aria-hidden="true"
- [x] 所有交互元素可键盘操作（Tab/Enter/Space）
- [x] 表单控件有关联 label 或 aria-label

### 验证
- [x] `npx vitest run` 全部通过（562 tests passed，24 test files）
- [x] `npm run lint` 0 errors（13 pre-existing warnings，均与 a11y 改动无关）
- [x] 未破坏现有测试（原有 530 测试 + 32 新组件测试 = 562 全通过）

## Task 16: 实现图片压缩工具（本地处理）

### SubTask 16.1-16.5: 图片压缩工具
- [x] ImageCompressTool.vue 组件已创建，参照 ui/pages/图片压缩工具.html 实现一模一样的交互区和样式
- [x] 拖拽上传区、压缩参数（质量/最大宽高/格式）、文件列表（原图/压缩后预览/大小对比/下载）功能完整
- [x] EXIF 方向读取与修正（手动解析 JPEG APP1 段，支持 LE/BE 字节序、orientation 1-8）
- [x] Canvas 重编码本地压缩逻辑（jpg/png/webp），确保不上传服务器
- [x] 多文件支持（列表逐个压缩与导出）
- [x] 工具页 SEO + 隐私说明 + 接入统计/点赞（下载触发 download 事件）
- [x] toolRegistry.ts 中 image-compress 已注册
- [x] 验证：单张/多张压缩正常（含 EXIF 修正），前后大小对比准确，下载可用

## Task 17: 实现图片裁剪/改尺寸工具（本地处理）

### SubTask 17.1-17.3: 图片裁剪工具
- [x] ImageCropTool.vue 组件已创建，参照 ui/pages/图片裁剪.html 实现一模一样的交互区和样式
- [x] 裁剪 UI（上传、裁剪框、比例选择、尺寸设置、预览、下载）功能完整
- [x] EXIF 方向修正 + Canvas 裁剪与重采样，导出 png/jpg
- [x] 工具页 SEO + 接入统计/点赞
- [x] toolRegistry.ts 中 image-crop 已注册
- [x] 验证：裁剪与导出正常（含 EXIF 修正），比例/尺寸设置生效

## Task 18: 实现图片格式转换工具（本地处理）

### SubTask 18.1-18.3: 图片格式转换工具
- [x] ImageConvertTool.vue 组件已创建，参照 ui/pages/格式转换.html 实现一模一样的交互区和样式
- [x] 转换 UI（上传、选择目标格式 jpeg/png/webp、预览、下载）功能完整
- [x] EXIF 方向修正 + Canvas 导出不同 mime
- [x] png→jpg 透明背景丢失提示
- [x] 工具页 SEO + 接入统计/点赞
- [x] toolRegistry.ts 中 image-convert 已注册
- [x] 验证：png/jpg/webp 互转正常（含 EXIF 修正），png→jpg 提示透明背景丢失

## Task 19: 实现广告位集成（预留+可配置）

### SubTask 19.1-19.4: 广告位集成基础
- [x] AdSlot.vue 可配置广告组件已创建（Props: slotKey，从 runtimeConfig.public.adSlots 读取配置）
- [x] 首页集成 AdSlot slot-key=""homeTop""
- [x] ToolLayout 集成 AdSlot slot-key=""toolBottom""
- [x] AppSidebar 集成 AdSlot slot-key=""sidebar""
- [x] 空字符串=未配置时静默隐藏，ClientOnly 包裹，requestIdleCallback 异步注入脚本
- [x] 隐私政策页添加广告免责声明

### SubTask 19.5: 首页广告位集成
- [x] 首页在热门工具和最新上架之间集成 AdSlot slot-key=""homeMiddle""

### SubTask 19.6: JSON 格式化工具页广告位集成
- [x] JSON 格式化页面底部集成 AdSlot slot-key=""jsonBottom""

### SubTask 19.7: 正则测试工具页广告位集成
- [x] 正则测试页面在分组信息和匹配结果之间集成 AdSlot slot-key=""regexMiddle""

### SubTask 19.8: 时间戳转换工具页广告位集成
- [x] 时间戳转换页面在时区选择和常用时间戳参考之间集成 AdSlot slot-key=""timestampMiddle""

### SubTask 19.9: URL 编码解码工具页广告位集成
- [x] URL 编码解码页面在常见问题和常见特殊字符编码对照表之间集成 AdSlot slot-key=""urlMiddle""

### SubTask 19.10: JWT 解析工具页广告位集成
- [x] JWT 解析页面在 JWT 算法参考功能上面集成 AdSlot slot-key=""jwtTop""

### SubTask 19.11: Base64 编码工具页广告位集成
- [x] Base64 编码页面底部集成 AdSlot slot-key=""base64Bottom""

### SubTask 19.12: 哈希计算工具页广告位集成
- [x] 哈希计算页面在哈希算法对比和文件哈希计算之间集成 AdSlot slot-key=""hashMiddle""

### SubTask 19.13: 图片压缩工具页广告位集成
- [x] 图片压缩页面底部集成 AdSlot slot-key=""imageCompressBottom""

### SubTask 19.14: 图片裁剪工具页广告位集成
- [x] 图片裁剪页面在本地处理保障和常见问题功能之间集成 AdSlot slot-key=""imageCropMiddle""

### SubTask 19.15: 格式转换工具页广告位集成
- [x] 格式转换页面在本地处理保障和格式参考表功能之间集成 AdSlot slot-key=""imageConvertMiddle""

### 验证
- [x] 所有广告位可配置，未配置时降级不影响布局 ✅

## Task 20: 接入百度统计（PV/工具使用）

### SubTask 20.1-20.4: 百度统计
- [x] baidu-tongji.ts 插件已创建（hm.js 异步注入，import.meta.server 守卫）
- [x] useBaiduTongji.ts composable 已创建（trackPageView/trackEvent，SSR-safe）
- [x] useAnalytics.ts 新增 syncToBaiduTongji 函数，事件同步（tool_use/copy/download）
- [x] SPA router.afterEach PV 统计
- [x] runtimeConfig.public.baiduTongjiId 配置（06c8d960aee8a68f0a9a229ff4a18ceb）
- [x] 隐私政策补充百度统计用途（运营分析）与自建统计用途（站内展示）分别说明
- [x] 验证：百度统计后台可看到 PV 与关键事件，隐私政策职责边界清晰 ✅

## Task 21: 实现运维与数据治理能力

### SubTask 21.1-21.3: 运维与数据治理
- [x] PostgreSQL 定期备份脚本（pg_dump）与恢复流程文档已创建
- [x] 后端配置结构化日志（JSON 格式，logback-spring.xml 或 logstash-logback-encoder）
- [x] tool_event_logs 原始日志保留策略（90 天后归档或仅保留聚合数据）已实现
- [x] 验证：备份脚本可执行，日志为 JSON 格式，日志保留策略生效

## Task 23: Docker 容器化与部署交付

### SubTask 23.1-23.5: Docker 容器化
- [x] 前端 Dockerfile（Nuxt3 构建 + 运行）已编写
- [x] 后端 Dockerfile（Spring Boot 构建 + 运行）已编写
- [x] nginx 反代配置（含裸域 301 到 www、强制 HTTPS、trailing slash 统一无尾斜杠）已编写
- [x] docker-compose.yml（nginx + nuxt + java-api + postgres）已编写
- [x] 部署文档（腾讯云、域名/DNS/HTTPS 证书配置、备份恢复流程说明）已编写
- [x] 验证：docker-compose up -d 一键启动，站点可访问，裸域 301 与 HTTPS 生效，trailing slash 统一

## Task 24: 广告系统优化与数据库迁移维护

### SubTask 24.1: 删除 V9 数据库迁移文件
- [x] 删除 backend/src/main/resources/db/migration/V9__reset_tool_counts_to_zero.sql 文件
- [x] 检查代码中是否有对 V9 迁移的引用（无相关代码引用）
- [x] Flyway 迁移历史表中 V9 记录已清理

### SubTask 24.2: 创建广告推广数据库表
- [x] 创建 V10__create_ad_promotion_table.sql 迁移文件
- [x] 表结构包含：id、ad_union、ad_union_symbol、ad_placement、pid、product_description、product_url、ad_url、ad_start、ad_end、ad_enabled、ad_location、ad_location_symbol、created_at、updated_at
- [x] 创建索引：idx_ad_promotion_location_symbol、idx_ad_promotion_enabled
- [x] Flyway 迁移成功执行

### SubTask 24.3: 前后端程序启动
- [x] 前端 Nuxt3 在端口 3000 成功启动
- [x] 后端 Spring Boot 在端口 8080 成功启动
- [x] 后端 API /api/v1/ping 返回正常
- [x] Flyway 迁移历史表已修复，V6 checksum 已更新

### SubTask 24.4: 广告位优化
- [x] 多个工具页面底部广告位已移除，保留中间广告位
- [x] 首页广告位已调整，包含阿里云轻量云服务器广告信息
- [x] StaticAdCard 组件实现静态广告内容展示
- [x] sessionStorage 实现广告关闭功能

### 验证
- [x] 前端可访问 http://localhost:3000
- [x] 后端 API 可访问 http://localhost:8080/api/v1/ping
- [x] ad_promotion 表已在数据库中创建
- [x] Flyway 迁移版本历史正确（V1-V8, V10）

## Task 25: 首页广告动态数据源实现

### SubTask 25.1: 后端实现广告查询 API
- [x] 创建 `AdPromotion` 实体类（`backend/src/main/java/com/panzipool/api/entity/AdPromotion.java`），映射 `ad_promotion` 表
- [x] 创建 `AdPromotionRepository` 接口（`backend/src/main/java/com/panzipool/api/repository/AdPromotionRepository.java`），支持按 `ad_location_symbol` 和 `ad_enabled` 查询
- [x] 创建 `AdController` 控制器（`backend/src/main/java/com/panzipool/api/controller/AdController.java`），实现 `GET /api/v1/ads?locationSymbol=home_middle` 接口
- [x] API 返回字段：`product_description`（广告描述）、`product_url`（广告图片地址）、`ad_url`（广告跳转地址）
- [x] 验证：`GET /api/v1/ads?locationSymbol=home_middle` 返回正确的广告数据

### SubTask 25.2-25.3: 前端首页广告动态获取
- [x] 修改 `frontend/pages/index.vue`，在 SSR 阶段调用广告 API
- [x] 使用 `useAsyncData` 获取 `home_middle` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）

### SubTask 25.4-25.5: 动态渲染与隐藏逻辑
- [x] 修改 `index.vue` 模板为动态数据绑定
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if="adData"` 条件渲染，无广告数据时静默隐藏
- [x] 验证：首页广告位显示数据库中的广告内容
- [x] 验证：无广告数据时（adData 为 null），广告位静默隐藏

### 验证
- [x] 后端广告查询 API 正常工作
- [x] 前端首页 SSR 获取广告数据成功
- [x] 广告内容动态渲染正确
- [x] 无广告数据时页面布局不受影响

## Task 26: 工具页底部广告动态数据源实现

### SubTask 26.1-26.2: 前端 ToolLayout 广告动态获取与渲染
- [x] 修改 `frontend/components/tool/ToolLayout.vue`，在 SSR 阶段调用 `GET /api/v1/ads?locationSymbol=tool_footer` 获取广告数据
- [x] 使用 `useAsyncData` 获取 `tool_footer` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）
- [x] 将工具页底部广告位从 `AdSlot` 组件改为 `StaticAdCard` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告

### SubTask 26.3: 条件渲染与隐藏逻辑
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏
- [x] 验证：开发者工具和图片工具详情页底部广告位显示数据库中的广告内容
- [x] 验证：无广告数据时（adData 为 null），广告位静默隐藏，不影响页面布局

### 验证
- [x] 工具页底部广告 API 查询正常（`GET /api/v1/ads?locationSymbol=tool_footer`）
- [x] 前端 ToolLayout SSR 获取广告数据成功
- [x] 广告内容动态渲染正确（product_description、product_url、ad_url）
- [x] 无广告数据时页面布局不受影响

## Task 27: 开发者工具中间广告动态数据源实现

### SubTask 27.1: RegexTesterTool.vue 中间广告位改造
- [x] 修改 `RegexTesterTool.vue`，在 SSR 阶段调用 `GET /api/v1/ads?locationSymbol=dev_tool_middle` 获取广告数据
- [x] 使用 `useAsyncData` 获取 `dev_tool_middle` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）
- [x] 将中间广告位从 `<AdSlot slot-key="regexMiddle" />` 改为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### SubTask 27.2: TimestampTool.vue 中间广告位改造
- [x] 修改 `TimestampTool.vue`，在 SSR 阶段调用 `GET /api/v1/ads?locationSymbol=dev_tool_middle` 获取广告数据
- [x] 使用 `useAsyncData` 获取 `dev_tool_middle` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）
- [x] 将中间广告位从 `<AdSlot slot-key="timestampMiddle" />` 改为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### SubTask 27.3: UrlEncodeTool.vue 中间广告位改造
- [x] 修改 `UrlEncodeTool.vue`，在 SSR 阶段调用 `GET /api/v1/ads?locationSymbol=dev_tool_middle` 获取广告数据
- [x] 使用 `useAsyncData` 获取 `dev_tool_middle` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）
- [x] 将中间广告位从 `<AdSlot slot-key="urlMiddle" />` 改为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### SubTask 27.4: JwtDecoderTool.vue 中间广告位改造
- [x] 修改 `JwtDecoderTool.vue`，在 SSR 阶段调用 `GET /api/v1/ads?locationSymbol=dev_tool_middle` 获取广告数据
- [x] 使用 `useAsyncData` 获取 `dev_tool_middle` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）
- [x] 将中间广告位从 `<AdSlot slot-key="jwtTop" />` 改为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### SubTask 27.5: HashTool.vue 中间广告位改造
- [x] 修改 `HashTool.vue`，在 SSR 阶段调用 `GET /api/v1/ads?locationSymbol=dev_tool_middle` 获取广告数据
- [x] 使用 `useAsyncData` 获取 `dev_tool_middle` 广告数据
- [x] 处理 API 异常和降级策略（try-catch，失败返回 null）
- [x] 将中间广告位从 `<AdSlot slot-key="hashMiddle" />` 改为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### 验证
- [x] 正则测试页面中间广告位显示数据库中的广告内容
- [x] 时间戳转换页面中间广告位显示数据库中的广告内容
- [x] URL 编码解码页面中间广告位显示数据库中的广告内容
- [x] JWT 解析页面中间广告位显示数据库中的广告内容
- [x] 哈希计算页面中间广告位显示数据库中的广告内容
- [x] 5 个页面广告内容一致（使用相同的 dev_tool_middle 数据）
- [x] 无广告数据时页面布局不受影响

## Task 28: 插入图片工具中部广告数据

### SubTask 28.1: 创建迁移脚本
- [x] 创建 `V13__insert_img_tool_middle_ad.sql` 迁移文件
- [x] SQL 包含完整的 INSERT 语句，字段与图片数据一致
- [x] 使用 WHERE NOT EXISTS 防止重复插入

### SubTask 28.2: 执行迁移
- [x] 停止后端服务
- [x] 重启后端，Flyway 自动执行 V13 迁移
- [x] 后端启动成功

### SubTask 28.3: 数据验证
- [x] `GET /api/v1/ads?locationSymbol=img_tool_middle` 返回 200
- [x] 返回的 product_description 为"深睡控温夏凉被｜学生宿舍春夏床品优选..."
- [x] 返回的 product_url 为 `/images/ad/ad_img_tool1.jpg`
- [x] 返回的 ad_url 为 `https://s.click.taobao.com/DCM5Ek`

## Task 29: 图片工具中间广告动态数据源实现

### SubTask 29.1: 修改 ImageCropTool.vue
- [x] 添加 `AdItem` 接口定义
- [x] 使用 `useAsyncData` 在 SSR 阶段获取 `img_tool_middle` 广告数据
- [x] 添加 `useRuntimeConfig` 和 `$fetch` 调用 `/api/v1/ads` API
- [x] 将 `<AdSlot slot-key="imageCropMiddle" />` 替换为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### SubTask 29.2: 修改 ImageConvertTool.vue
- [x] 添加 `AdItem` 接口定义
- [x] 使用 `useAsyncData` 在 SSR 阶段获取 `img_tool_middle` 广告数据
- [x] 添加 `useRuntimeConfig` 和 `$fetch` 调用 `/api/v1/ads` API
- [x] 将 `<AdSlot slot-key="imageConvertMiddle" />` 替换为 `<StaticAdCard>` 组件
- [x] 使用获取到的 `product_description`、`product_url`、`ad_url` 字段渲染广告
- [x] 实现 `v-if` 条件渲染，无广告数据时静默隐藏

### 验证
- [x] 图片裁剪页面中间广告位显示数据库中的广告内容
- [x] 格式转换页面中间广告位显示数据库中的广告内容
- [x] 2 个页面广告内容一致（使用相同的 img_tool_middle 数据）
- [x] 无广告数据时页面布局不受影响

## Task 30: 移动端设备检测与布局切换

### SubTask 30.1: useDevice composable
- [x] 创建 `composables/useDevice.ts`
- [x] 实现 `isMobile` 响应式状态（useState）
- [x] 实现设备检测逻辑（User-Agent 关键字匹配 + window.innerWidth 检测）
- [x] 支持 SSR 和客户端双重检测
- [x] 实现 `detectDeviceFromEnv` 纯函数
- [x] 实现 `detectDeviceFromRequest` SSR 专用函数
- [x] 实现 `setupResizeListener` 客户端尺寸监听

### SubTask 30.2: 全局中间件
- [x] 创建 `middleware/device-detect.global.ts`
- [x] 在 SSR 阶段检测 User-Agent（从 nitro event.headers 读取）
- [x] 识别移动端关键字（Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini）
- [x] 爬虫 User-Agent 识别为桌面设备（Googlebot|Bingbot|Baiduspider 等）
- [x] 设置响应式状态供布局使用（写入 nuxtApp.payload.pzDevice）
- [x] 客户端水合时读取 payload 避免首帧闪烁
- [x] 通过 route.meta.layout 实现布局切换

### SubTask 30.3: 移动端布局
- [x] 创建 `layouts/mobile.vue`
- [x] 包含 MobileHeader（Logo + 站点名称，sticky 52px）
- [x] 包含内容区域（slot，padding: 0 16px）
- [x] 包含 MobileFooter（关于我们、隐私政策、版权、备案号）
- [x] 包含底部导航栏（首页、工具、关于，fixed 56px）
- [x] 移动端布局样式与 panzi-tools-mobile 设计一致
- [x] 设计 Token 使用 scoped CSS 独立命名空间

### SubTask 30.4: 布局切换逻辑
- [x] 实现 PC/移动端布局自动切换（通过 route.meta.layout）
- [x] 移动设备访问自动加载 mobile.vue
- [x] 桌面设备访问保持 default.vue
- [x] 布局切换无闪烁（SSR 阶段写入 payload，客户端水合读取）
- [x] app.vue 根组件精简为 NuxtLayout + NuxtPage

### 验证
- [x] useDevice composable 正确识别移动端 UA（iPhone, Android, Mobile 等）
- [x] 中间件将爬虫 UA 识别为桌面设备（确保 SEO）
- [x] SSR 检测结果写入 nuxtApp.payload.pzDevice
- [x] 布局切换通过 route.meta.layout 实现，无手动组件切换

## Task 31: 移动端通用组件开发

### SubTask 31.1: MobileHeader.vue
- [x] 创建 `components/mobile/MobileHeader.vue`
- [x] 包含 Logo 图标 + 站点名称
- [x] 支持 showBack prop 显示返回按钮
- [x] sticky 固定定位，高度 52px
- [x] 样式与 panzi-tools-mobile 设计一致

### SubTask 31.2: MobileFooter.vue
- [x] 创建 `components/mobile/MobileFooter.vue`
- [x] 包含关于我们、隐私政策链接
- [x] 版权信息 + ICP 备案号

### SubTask 31.3: MobileBottomNav.vue
- [x] 创建 `components/mobile/MobileBottomNav.vue`
- [x] 三个导航项：首页、工具、关于
- [x] 当前页高亮（紫色主色调 #7c3aed）
- [x] fixed 固定定位，高度 56px
- [x] useRoute 判断激活状态
- [x] 支持 safe-area-inset-bottom

### SubTask 31.4: MobileToolLayout.vue
- [x] 创建 `components/mobile/MobileToolLayout.vue`
- [x] 包含面包屑导航
- [x] 包含页面标题 + 描述
- [x] 包含使用次数 + 点赞按钮
- [x] 包含工具交互区（默认 slot）
- [x] 包含广告位插槽（ad slot）
- [x] 包含使用说明区（instruction slot）
- [x] 支持 isLiked 状态

### SubTask 31.5: MobileToolCard.vue
- [x] 创建 `components/mobile/MobileToolCard.vue`
- [x] 支持网格模式（2列，紧凑居中）
- [x] 支持列表模式（竖排，详细信息）
- [x] 显示工具图标（44px 渐变圆形）、名称、描述
- [x] 显示使用次数、点赞数
- [x] 点击跳转对应工具页

### SubTask 31.6: MobileAdCard.vue
- [x] 创建 `components/mobile/MobileAdCard.vue`
- [x] 移动端卡片样式（12px 圆角）
- [x] 支持广告关闭功能（sessionStorage）
- [x] 点击跳转广告链接

### 验证
- [x] 所有移动端组件样式与静态设计一致
- [x] 组件可正确导入和使用
- [x] 无 TypeScript 诊断错误
- [x] 触控区域 >= 44x44px
- [x] scoped CSS 不与 Tailwind 冲突

## Task 32: 移动端核心页面实现（P0）

### SubTask 32.1: 移动端首页
- [x] 创建 `pages/mobile/index.vue`
- [x] SSR 获取热门工具数据
- [x] SSR 获取首页广告数据
- [x] 2列网格展示热门工具（MobileToolCard grid 模式）
- [x] 显示分类入口卡片（开发者工具 + 图片工具）
- [x] 显示使用次数、点赞数
- [x] 底部导航栏正确高亮「首页」

### SubTask 32.2: 开发者工具列表页
- [x] 创建 `pages/mobile/tools.vue`
- [x] Tab 切换（开发者工具 / 图片工具）
- [x] 排序筛选（按热门 / 按最新）
- [x] 网格展示工具（MobileToolCard 2列）
- [x] 显示使用次数、点赞数
- [x] 底部导航栏正确高亮「工具」

### SubTask 32.3: 图片工具列表页
- [x] 创建 `pages/mobile/image-tools.vue`
- [x] 复用 tools.vue 布局，默认图片工具分类

### SubTask 32.4: 工具详情页动态路由
- [x] 创建 `pages/mobile/tools/[slug].vue`
- [x] SSR 获取工具详情
- [x] 动态加载工具交互组件（toolRegistry + defineAsyncComponent）
- [x] 显示面包屑、标题、使用统计
- [x] 接入点赞功能（useAnonId + API）
- [x] 中间广告位（locationSymbol=dev_tool_middle）
- [x] 底部 FAQ 使用说明区

### SubTask 32.5: 图片工具详情页动态路由
- [x] 创建 `pages/mobile/image-tools/[slug].vue`
- [x] 结构与开发者工具详情页一致
- [x] 广告位使用 img_tool_middle

### SubTask 32.6: 移动端布局更新
- [x] 更新 `layouts/mobile.vue` 底部导航链接指向 `/mobile/tools`
- [x] activeTab 支持识别新路由

### 验证
- [x] 移动端首页正确渲染
- [x] 移动端分类页正确渲染
- [x] 移动端工具页正确渲染
- [x] 所有页面数据从后端 API 正确获取
- [x] 复用 PC 端 composables 和工具模块

## Task 33: 移动端开发者工具组件实现（P0）

### SubTask 33.1: MobileJsonFormatter.vue
- [x] 单列布局（输入框在上，输出框在下）
- [x] 操作按钮：格式化/压缩/校验/清空 + 复制
- [x] 缩进选择：2/4 空格
- [x] 错误展示：红色卡片显示错误信息
- [x] 复用 `utils/tools/json.ts` 业务逻辑

### SubTask 33.2: MobileUrlEncode.vue
- [x] 单列布局
- [x] 操作按钮：编码/解码/清空 + 复制
- [x] 字符说明表
- [x] 复用 `utils/tools/url.ts` 业务逻辑

### SubTask 33.3: MobileBase64.vue
- [x] 单列布局
- [x] 操作按钮：编码/解码/清空 + 复制
- [x] 复用 `utils/tools/base64.ts` 业务逻辑

### SubTask 33.4: MobileTimestamp.vue
- [x] 时间戳输入 + 时间选择器
- [x] 常用时间戳快捷按钮
- [x] 时区选择
- [x] 复用 `utils/tools/timestamp.ts` 业务逻辑

### SubTask 33.5: MobileRegexTester.vue
- [x] 正则表达式输入
- [x] 匹配结果展示
- [x] 分组信息展示
- [x] 复用 `utils/tools/regex.ts` 业务逻辑

### SubTask 33.6: MobileJwtDecoder.vue
- [x] JWT Token 输入
- [x] Header / Payload 分段展示
- [x] 复用 `utils/tools/jwt.ts` 业务逻辑

### SubTask 33.7: MobileHash.vue
- [x] 支持文本和文件两种模式
- [x] 算法选择（MD5/SHA1/SHA256/SHA512）
- [x] 复用 `utils/tools/hash.ts` 业务逻辑

### SubTask 33.8: 移动端工具注册表
- [x] 创建 `utils/mobileToolRegistry.ts`
- [x] 包含 `hasMobileTool()` 检查函数
- [x] 更新 `pages/mobile/tools/[slug].vue` 使用 mobileToolRegistry

### 通用验证
- [x] 所有组件使用 scoped CSS，无 Tailwind 依赖
- [x] 按钮 min-height 44px（触摸友好）
- [x] 输入框 min-height 100px
- [x] 单列移动端布局
- [x] 代码分割（defineAsyncComponent + 动态 import）

## Task 34: 移动端图片工具及辅助页面实现（P1）

### SubTask 34.1: MobileImageCompress.vue
- [x] 图片上传（支持拍照/相册）
- [x] 压缩质量滑块（10-100%）
- [x] 压缩前后文件大小对比
- [x] 一键下载
- [x] 复用 `utils/tools/image.ts` 业务逻辑
- [x] 单列触摸友好布局

### SubTask 34.2: MobileImageCrop.vue
- [x] 图片上传
- [x] 裁剪框触摸拖动/缩放
- [x] 预设比例（自由/1:1/4:3/16:9/3:4）
- [x] 三分网格线辅助
- [x] 实时预览 + 下载

### SubTask 34.3: MobileImageConvert.vue
- [x] 图片上传
- [x] 目标格式选择（JPEG/PNG/WebP）
- [x] 质量滑块
- [x] 透明通道检测 + 白色背景填充
- [x] 结果预览 + 下载

### SubTask 34.4: 辅助页面
- [x] 创建 `pages/mobile/about.vue`（关于页）
- [x] 创建 `pages/mobile/privacy.vue`（隐私政策页）
- [x] 更新 mobileToolRegistry 添加图片工具
- [x] 更新 mobile.vue 导航链接
- [x] 更新 image-tools/[slug].vue 使用 mobileToolRegistry

### 验证
- [x] Canvas API 在移动端浏览器兼容
- [x] 本地处理逻辑正常工作
- [x] 辅助页面可访问

## Task 35: 移动端适配集成测试与优化

### SubTask 35.1: 路由映射
- [x] 中间件实现移动端路由重定向
- [x] 移动端访问 / 重定向到 /mobile/
- [x] 移动端访问 /tools/[slug] 重定向到 /mobile/tools/[slug]
- [x] 移动端访问 /category/* 重定向到 /mobile/tools 或 /mobile/image-tools
- [x] 移动端访问 /about、/privacy 重定向到 /mobile/about、/mobile/privacy
- [x] 桌面端用户保持原路径不变
- [x] 爬虫 UA 保持桌面端路径（SEO 友好）
- [x] SSR 阶段重定向（避免客户端跳转闪烁）
- [x] 客户端水合兜底重定向

### SubTask 35.2: 移动端页面配置
- [x] 所有移动端页面设置 `layout: 'mobile'`
- [x] 动态路由页面（[slug].vue）设置 layout meta
- [x] 移动端布局包含 MobileHeader/MobileFooter/MobileBottomNav
- [x] 底部导航链接指向移动端路径

### SubTask 35.3: 构建验证
- [x] `nuxi build` 构建成功
- [x] 42 个路由预渲染完成
- [x] 无 TypeScript 错误

### SubTask 35.4: 性能优化
- [x] 移动端组件懒加载（defineAsyncComponent + 动态 import）
- [x] 代码分割：工具组件独立 chunk
- [x] SSR 缓存策略（60s SWR）

### SubTask 35.5: 功能验证
- [x] 复用 PC 端 composables（useDevice, useAnonId, useAnalytics）
- [x] 复用 PC 端业务逻辑（utils/tools/*.ts）
- [x] 复用 PC 端 API 接口（广告、工具数据、点赞）

## Task 36: 实现意见反馈公开留言板（前台）

### SubTask 36.1: feedback_messages 表 Flyway 迁移
- [x] 创建 Flyway 迁移文件（如 V14__create_feedback_messages_table.sql）
- [x] 表结构包含：id、content（TEXT 必填）、nickname（VARCHAR 可空）、contact（VARCHAR 可空）、ip（VARCHAR）、status（VARCHAR 默认 visible）、admin_reply（TEXT 可空）、reply_at（TIMESTAMP 可空）、reply_by（VARCHAR 可空）、created_at、updated_at
- [x] 创建索引：(status, created_at) 复合索引、created_at 索引
- [x] Flyway 迁移成功执行

### SubTask 36.2: FeedbackMessage 实体与 Repository
- [x] 创建 `FeedbackMessage` 实体类（`backend/src/main/java/com/panzipool/api/web/feedback/entity/FeedbackMessage.java`）
- [x] 创建 `FeedbackMessageRepository` 接口，支持按 status 分页查询（Pageable）、按 id 查询
- [x] 实体字段与数据库表结构一致

### SubTask 36.3: 留言提交接口 POST /api/v1/feedback
- [x] 创建 `FeedbackController` 控制器，实现 `POST /api/v1/feedback`
- [x] content 必填校验（@NotBlank）、长度限制（1-1000 字符）
- [x] nickname 可选长度限制（1-30 字符）、contact 可选长度限制（1-100 字符）
- [x] 后端从 HttpServletRequest 获取 IP 地址（X-Forwarded-For 或 getRemoteAddr）
- [x] 实现基础限流（同一 IP 1 分钟最多 3 条）
- [x] 输出做 XSS 转义防护
- [x] 留言状态默认为 visible

### SubTask 36.4: 公开留言查询接口 GET /api/v1/feedback
- [x] 实现 `GET /api/v1/feedback?page=N&size=M`
- [x] 返回 status=visible 的留言（按 created_at 倒序、分页）
- [x] 每条留言包含 content、nickname、created_at、admin_reply、reply_at
- [x] 输出做 XSS 转义防护
- [x] hidden/deleted 状态留言不返回

### SubTask 36.5: 单元测试与集成测试
- [x] 测试：提交合法留言成功
- [x] 测试：空内容提交返回校验错误
- [x] 测试：超长内容提交返回校验错误
- [x] 测试：同一 IP 1 分钟内提交超过 3 条返回频率限制错误
- [x] 测试：公开查询返回 visible 留言分页列表
- [x] 测试：hidden/deleted 留言不在公开查询结果中

### SubTask 36.6: 顶部导航新增入口
- [x] PC 端 AppHeader.vue 在"关于我们"后新增"意见反馈"链接，指向 `/feedback`
- [x] 移动端 MobileHeader.vue 或 MobileBottomNav.vue 新增"意见反馈"入口
- [x] 导航入口样式与现有风格一致

### SubTask 36.7: /feedback 留言板页面（PC 端）
- [x] 创建 `frontend/pages/feedback.vue`
- [x] 留言提交表单：content 文本域（必填）、nickname 输入框（可选）、contact 输入框（可选）
- [x] 表单前端基础校验（content 非空、长度限制）
- [x] 提交成功展示成功提示并刷新留言列表
- [x] 公开留言列表：时间倒序、分页展示
- [x] 每条留言展示：内容、时间、昵称（如有）、站长回复（如有）
- [x] 页面风格与站点一致（使用 Tailwind/ToolLayout 风格）

### SubTask 36.8: 移动端留言板页面
- [x] 创建 `frontend/pages/mobile/feedback.vue`
- [x] 复用 PC 端 API 与逻辑
- [x] 移动端布局（单栏、触控友好、44px 按钮高度）
- [x] 接入移动端布局（layout: 'mobile'）

### SubTask 36.9: SEO 与隐私说明
- [x] 留言板页面设置 title/description
- [x] 页面展示隐私提示（留言内容将公开展示）

### 验证
- [x] 留言提交成功并展示在列表中
- [x] 空内容/超长内容提交校验失败
- [x] 同一 IP 1 分钟内提交超过 3 条被限流
- [x] hidden/deleted 留言不在公开列表展示
- [x] 分页正常工作
- [x] 移动端页面正常渲染

## Task 37: 实现站长管理后台（登录+回复+内容治理）

### 阶段一：后端认证与鉴权基础设施

### SubTask 37.1: 管理员凭据配置与会话存储
- [x] `application.yml` 新增 admin 配置段（username、password-hash、session-timeout-minutes、secure-cookie）
- [x] 创建 `AdminProperties.java`（@ConfigurationProperties(prefix="admin")）
- [x] 创建 `AdminSession.java`（token、username、expireAt、isExpired）
- [x] 创建 `AdminSessionStore.java`（ConcurrentHashMap 内存存储、create/get/remove/cleanupExpired、定时清理）
- [x] `pom.xml` 新增 spring-security-crypto 依赖（BCryptPasswordEncoder）
- [x] `application-prod.yml` 覆盖 secure-cookie=true

### SubTask 37.2: 管理员登录接口 POST /api/v1/admin/login
- [x] 创建 `AdminAuthController.java`（@RequestMapping("/admin")）
- [x] 创建 DTO：AdminLoginRequest（username/password @NotBlank）、AdminLoginResponse（token/username/expireAt）
- [x] 创建 `AdminAuthService.login()`：用户名匹配 + BCrypt 比对密码哈希
- [x] 登录失败限流：同一 IP 5 分钟最多 5 次失败，超限返回 429
- [x] 登录成功清除失败计数 + 创建会话
- [x] 设置 admin_token cookie（HttpOnly、SameSite=Strict、Path=/api/v1、Max-Age=会话超时）

### SubTask 37.3: 管理员鉴权拦截器
- [x] 创建 `AdminAuthInterceptor.java`（HandlerInterceptor）
- [x] preHandle：从 cookie 或 Authorization Bearer 头读取 token
- [x] 无效 token 返回 401 JSON（{"code":401,"message":"未登录或会话已过期"}）
- [x] 有效 token 设置 request.setAttribute("adminUser", username)
- [x] 创建 `WebMvcConfig.java` 注册拦截器（addPathPatterns("/admin/**")，excludePathPatterns("/admin/login")）

### SubTask 37.4: 登出接口 POST /api/v1/admin/logout
- [x] AdminAuthController 新增 POST /admin/logout
- [x] 读取 token 并调用 AdminSessionStore.removeSession
- [x] 清除 admin_token cookie（Max-Age=0）
- [x] 返回 ApiResponse.success()

### SubTask 37.5: 当前管理员信息接口 GET /api/v1/admin/me
- [x] AdminAuthController 新增 GET /admin/me
- [x] 校验会话有效性，无效抛 401
- [x] 返回 {username, expireAt}

### SubTask 37.6: CSRF 防护（SameSite cookie 方案）
- [x] 采用 SameSite=Strict cookie 天然防范 CSRF
- [x] 无需额外 CSRF token 机制
- [x] AdminAuthInterceptor 可选校验 Origin/Referer 头

### 阶段二：后端留言管理 API

### SubTask 37.7: 管理员留言管理 Service
- [x] 创建 `AdminFeedbackService.java`
- [x] listFeedback(page, size, status, keyword)：status 筛选 + keyword 模糊搜索 + 分页
- [x] getFeedbackDetail(id)：不存在抛 404
- [x] replyFeedback(id, replyContent, adminUser)：更新 adminReply/replyAt/replyBy
- [x] updateStatus(id, newStatus)：visible↔hidden↔deleted 状态切换
- [x] 扩展 FeedbackMessageRepository：findByStatusAndContentContainingOrderByCreatedAtDesc、findByContentContainingOrderByCreatedAtDesc

### SubTask 37.8: 管理员留言管理 Controller
- [x] 创建 `AdminFeedbackController.java`（@RequestMapping("/admin/feedback")）
- [x] GET /admin/feedback：分页+状态筛选+搜索，返回 ApiResponse<Page<AdminFeedbackItem>>
- [x] GET /admin/feedback/{id}：返回 ApiResponse<AdminFeedbackDetail>
- [x] PUT /admin/feedback/{id}/reply：从 request attribute 读取 adminUser
- [x] PUT /admin/feedback/{id}/status：校验 status pattern
- [x] 创建 DTO：AdminFeedbackItem、AdminFeedbackDetail、AdminReplyRequest、AdminStatusRequest

### 阶段三：前端后台页面（参考 panzitool-extension 设计）

### SubTask 37.9: 创建后台布局与路由守卫
- [x] 创建 `frontend/layouts/admin.vue`（深色 header + shield 图标 + 退出登录按钮）
- [x] 创建 `frontend/middleware/admin-auth.ts`（检查 localStorage admin_logged_in，未登录跳转 /admin/login）
- [x] 退出登录按钮调用 POST /api/v1/admin/logout 并清理 localStorage

### SubTask 37.10: 实现 /admin/login 登录页
- [x] 创建 `frontend/pages/admin/login.vue`（参考 admin-login.html 设计）
- [x] 深色 header（shield 图标 + "盘子工具站 管理后台" + 返回首页链接）
- [x] 登录表单：账号输入框、密码输入框、错误提示区、登录按钮
- [x] 提交逻辑：POST /api/v1/admin/login（credentials: 'include'），成功后 navigateTo('/admin/feedback')
- [x] 错误处理：401 显示"账号或密码错误"、429 显示"登录尝试过于频繁"、网络错误提示
- [x] 表单校验：账号/密码非空
- [x] useHead 设置 title + robots noindex

### SubTask 37.11: 实现 /admin/feedback 留言管理列表页
- [x] 创建 `frontend/pages/admin/feedback.vue`（参考 admin-messages.html）
- [x] definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
- [x] 左侧侧边栏：留言管理（高亮）
- [x] 顶部工具栏：搜索框 + 状态下拉筛选 + 刷新按钮
- [x] 留言表格：内容/昵称/时间/状态标签/操作按钮
- [x] 分页控件
- [x] API：GET /admin/feedback，SSR + watch refresh
- [x] 操作：查看跳转详情、回复跳转详情、隐藏/恢复调用 PUT status

### SubTask 37.12: 实现 /admin/feedback/[id] 留言详情与回复页
- [x] 创建 `frontend/pages/admin/feedback/[id].vue`（参考 admin-message-detail.html）
- [x] definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
- [x] 返回链接 + 留言详情卡片（状态/时间/留言者/联系方式/内容）
- [x] 操作栏：隐藏留言按钮、删除按钮
- [x] 回复编辑卡片：textarea + 保存回复按钮
- [x] 历史回复卡片：展示回复内容 + 回复时间 + 删除回复按钮
- [x] API：GET /admin/feedback/{id}、PUT reply、PUT status

### SubTask 37.13: 实现登出功能
- [x] admin layout 退出登录按钮调用 POST /api/v1/admin/logout
- [x] 成功后跳转 /admin/login
- [x] 清理 localStorage admin_logged_in

### 阶段四：测试与联调

### SubTask 37.14: 后端单元测试与集成测试
- [x] 测试 AdminAuthService.login：正确凭据返回 token、错误密码抛 401
- [x] 测试 AdminAuthInterceptor：无 token 401、无效 token 401、有效 token 通过
- [x] 测试 AdminFeedbackService.listFeedback：status 筛选、keyword 搜索、分页
- [x] 测试 AdminFeedbackService.replyFeedback：更新字段正确
- [x] 测试 AdminFeedbackService.updateStatus：状态流转正确
- [x] 测试登录失败限流：5 次失败后第 6 次返回 429

### 验证
- [x] 后端编译通过（mvn compile）
- [x] 前端 TypeScript 无错误
- [x] 管理员登录成功并重定向到后台
- [x] 错误密码登录失败并提示
- [x] 未登录访问后台接口返回 401
- [x] 留言列表按状态筛选与分页正常
- [x] 回复保存后前台公开列表同步展示回复
- [x] 隐藏留言后前台不再展示
- [x] 删除留言（软删除）后前台与后台默认列表不展示
- [x] 恢复留言后重新展示
- [x] 登录失败限流生效
- [x] 登出后会话失效

## Task 38: 实现 Cron 表达式工具（开发者工具新增）

### SubTask 38.1: Cron 纯函数与单元测试
- [x] 创建 `frontend/utils/tools/cron.ts`
- [x] 实现 Cron 表达式解析与校验函数（支持 5 段与 6 段格式、范围/特殊字符/步长/列表校验）
- [x] 实现中文解释生成函数（覆盖通配符/列表/范围/步长/特殊字符）
- [x] 实现未来触发时间计算函数（基于当前时间计算 N 次触发时间、考虑时区）
- [x] 编写 Vitest 单元测试（覆盖 5段/6段、合法/非法表达式、各类语法解释、触发时间计算）

### SubTask 38.2: Cron 工具 UI（PC 端）
- [x] 创建 `frontend/components/tool/CronTool.vue`
- [x] 表达式输入区（文本输入或分段输入）
- [x] 5段/6段格式切换控件（切换时字段数与标签变化）
- [x] 字段含义提示与示例展示
- [x] 校验结果区（通过/错误提示，指出错误字段与原因）

### SubTask 38.3: 中文解释输出区
- [x] 展示 Cron 表达式的人类可读中文描述
- [x] 覆盖通配符（*）、列表（,）、范围（-）、步长（/）、特殊字符（? L W #）

### SubTask 38.4: 未来触发时间预览
- [x] 展示未来 N 次触发时间（默认 10 次）
- [x] 提供次数配置（可调整预览次数）
- [x] 基于当前时间计算
- [x] 时区标注（本地时区或 UTC）
- [x] 复制/下载功能（可选）

### SubTask 38.5: 常用模板区
- [x] 提供常见 Cron 模板按钮（每分钟、每小时整点、每天凌晨、每周一、每月1日、工作日9点等）
- [x] 点击模板一键填入表达式
- [x] 填入后自动触发校验/解释/预览

### SubTask 38.6: 一键复制
- [x] 复制 Cron 表达式按钮（复用 CopyButton 组件）
- [x] 复制中文解释文本按钮

### SubTask 38.7: toolRegistry 注册与种子数据
- [x] 在 `toolRegistry.ts` 注册 slug=cron → CronTool 组件映射
- [x] 创建 Flyway 迁移插入 cron 工具元数据到 tools 表（slug=cron、名称、分类=developer、关键词、描述）
- [x] 工具列表/导航展示 Cron 工具卡片

### SubTask 38.8: 工具页 SEO 与统计接入
- [x] 工具页设置 title/description、说明、示例、FAQ
- [x] 添加 JSON-LD 结构化数据
- [x] 接入统计（核心操作触发 tool_use 事件）
- [x] 接入点赞功能
- [x] 接入广告位（如需要）

### SubTask 38.9: 移动端 Cron 工具组件
- [x] 创建 `frontend/components/mobile/tools/MobileCron.vue`
- [x] 复用 PC 端 `utils/tools/cron.ts` 业务逻辑
- [x] 移动端布局（单栏、触控友好、44px 按钮）
- [x] 接入移动端 toolRegistry（`utils/mobileToolRegistry.ts`）
- [x] 移动端工具详情页路由支持 cron slug

### 验证
- [x] 5段与6段格式切换正常（字段数与标签变化）
- [x] 合法 Cron 表达式校验通过
- [x] 非法 Cron 表达式（字段越界、非法字符）输出友好错误提示
- [x] 中文解释准确（覆盖各类语法）
- [x] 未来触发时间预览正确（默认 10 次、可配置）
- [x] 常用模板一键填入并触发校验/解释/预览
- [x] 复制表达式与解释文本正常
- [x] toolRegistry 注册成功，工具列表展示 Cron 卡片
- [x] 工具页 SEO 元数据与 JSON-LD 正确
- [x] 统计与点赞功能正常
- [x] 移动端 Cron 工具组件正常渲染与交互
- [x] Vitest 单元测试全部通过
