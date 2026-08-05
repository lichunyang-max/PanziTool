# PanziPool 后端（Spring Boot 3.x）

盘子工具（PanziTool）在线工具聚合站后端 API。提供匿名使用统计上报、点赞、工具元数据查询等接口。

- 技术栈：Spring Boot 3.x + JDK 17 + Spring Data JPA + PostgreSQL
- 文档：OpenAPI / Swagger UI
- 规范：统一响应信封、JSR-303 校验、全局异常处理、CORS

## 目录结构

```
backend/
├── pom.xml
├── mvnw / mvnw.cmd / .mvn/wrapper/        # Maven Wrapper
├── .env.example                            # 环境变量示例
├── src/
│   ├── main/
│   │   ├── java/com/panzipool/api/
│   │   │   ├── PanziPoolApplication.java   # 启动类
│   │   │   ├── common/                     # ApiResponse / ApiConstants / BusinessException
│   │   │   ├── config/                     # CorsConfig / CorsProperties / OpenApiConfig / JpaConfig
│   │   │   ├── exception/                  # GlobalExceptionHandler
│   │   │   ├── controller/                 # PingController（示例，Task 4-6 填充其余）
│   │   │   ├── dto/                        # DemoRequest（示例，Task 4-6 填充其余）
│   │   │   ├── service/                    # Task 4-6 填充
│   │   │   ├── repository/                 # Task 3+ 填充
│   │   │   └── entity/                     # Task 3 填充
│   │   └── resources/
│   │       ├── application.yml             # 基础配置（默认 H2 内存库，可独立启动）
│   │       ├── application-dev.yml         # 开发环境（PostgreSQL localhost）
│   │       ├── application-prod.yml        # 生产环境（PostgreSQL 环境变量）
│   └── test/java/com/panzipool/api/
│       ├── PanziPoolApplicationTests.java  # 上下文启动冒烟测试
│       └── controller/PingControllerTest.java  # 基础设施集成测试
└── README.md
```

## 运行

### 前置
- JDK 17
- Maven 3.9+（或直接使用 Maven Wrapper，无需本机安装 Maven）

### 默认 profile（无外部依赖，H2 内存库）

```bash
# Windows
.\mvnw.cmd spring-boot:run
# *nix
./mvnw spring-boot:run
```

### 开发 profile（需本地 PostgreSQL）

```bash
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

### 生产 profile（需提供环境变量）

```bash
$env:SPRING_PROFILES_ACTIVE="prod"
$env:DB_URL="jdbc:postgresql://<host>:5432/panzipool"
$env:DB_USERNAME="<user>"
$env:DB_PASSWORD="<password>"
$env:CORS_ORIGINS="https://www.panzipool.com"
.\mvnw.cmd spring-boot:run
```

## 验证（默认 profile 启动后）

| 能力 | URL | 预期 |
|------|-----|------|
| 探针（成功信封） | `GET http://localhost:8080/api/v1/ping` | `{"code":0,"data":"pong"}` |
| 校验失败（失败信封） | `POST http://localhost:8080/api/v1/ping/echo`（空体） | `400 {"code":400,"message":"..."}` |
| 业务异常 | `GET http://localhost:8080/api/v1/ping/error` | `400 {"code":400,"message":"这是一个演示业务异常"}` |
| 健康检查 | `GET http://localhost:8080/api/v1/actuator/health` | `{"status":"UP"}` |
| Swagger UI | `http://localhost:8080/api/v1/docs` | API 文档页面 |
| OpenAPI JSON | `http://localhost:8080/api/v1/docs-json` | OpenAPI 文档 JSON |

> 说明：采用 `server.servlet.context-path=/api/v1`，所有接口（含 actuator）统一位于 `/api/v1` 之下，
> 因此健康检查路径为 `/api/v1/actuator/health`，Swagger UI 为 `/api/v1/docs`。

## 统一响应信封

```java
// 成功：{"code":0,"data":{...}}
ApiResponse.success(data);

// 失败：{"code":<业务错误码>,"message":"<友好提示>"}
ApiResponse.error(code, message);
```

错误码定义见 `ApiConstants`：成功为 `0`；HTTP 对齐错误码（400/404/409/429/500）；业务错误码从 `1001` 起。

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `SPRING_PROFILES_ACTIVE` | 激活的 profile（留空/dev/prod） | 空（H2） |
| `DB_URL` | 数据库 JDBC URL | dev 有默认；prod 必填 |
| `DB_USERNAME` | 数据库用户名 | dev 有默认；prod 必填 |
| `DB_PASSWORD` | 数据库密码 | dev 有默认；prod 必填 |
| `CORS_ORIGINS` | 允许的 CORS 源（逗号分隔） | dev: localhost；prod: www.panzipool.com |

## 测试

```bash
.\mvnw.cmd test
```

包含上下文启动冒烟测试与基础设施集成测试（响应信封、校验、异常处理、Actuator、OpenAPI）。
