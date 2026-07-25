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
