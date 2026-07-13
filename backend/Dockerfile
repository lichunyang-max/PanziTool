# ============================================================================
# PanziPool 后端 Dockerfile（Spring Boot 3.3.5 多阶段构建）
# ----------------------------------------------------------------------------
# 阶段说明：
#   builder  - 使用 Maven 镜像编译打包 Spring Boot fat jar
#   runner   - 仅使用 JRE 运行 fat jar，大幅减小镜像体积
# ============================================================================

# ----------------------------------------------------------------------------
# 阶段 1: builder - Maven 编译打包
# ----------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# 先复制 Maven Wrapper 和 pom.xml（利用 Docker 层缓存）
# 依赖未变时跳过 dependency:go-offline，加速后续构建
COPY pom.xml ./
COPY mvnw ./
COPY mvnw.cmd ./
COPY .mvn .mvn

# 确保 Maven Wrapper 脚本有执行权限（Windows 检出可能丢失权限）
RUN chmod +x mvnw

# 预下载依赖（离线模式缓存，加速后续源码变更后的构建）
RUN ./mvnw dependency:go-offline -B

# 复制源码
COPY src ./src

# 编译打包（跳过测试，测试在 CI 阶段已执行）
RUN ./mvnw clean package -DskipTests

# ----------------------------------------------------------------------------
# 阶段 2: runner - JRE 运行 fat jar
# ----------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS runner

WORKDIR /app

# 生产环境 profile（启用 application-prod.yml 配置）
ENV SPRING_PROFILES_ACTIVE=prod

# Java 运行时参数优化（容器环境感知）
# -XX:+UseContainerSupport: 启用容器资源感知（JDK 10+ 默认开启）
# -XX:MaxRAMPercentage=75.0: 限制最大堆内存为容器内存的 75%
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# 复制构建产物（Spring Boot fat jar）
COPY --from=builder /app/target/*.jar app.jar

# 暴露 Spring Boot 服务端口
EXPOSE 8080

# 启动 Spring Boot 应用
# 通过 JAVA_OPTS 传递 JVM 参数，SPRING_PROFILES_ACTIVE 已在 ENV 中设置
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar /app/app.jar"]
