# ============================================================================
# PanziPool 前端 Dockerfile（Nuxt3 SSR 多阶段构建）
# ----------------------------------------------------------------------------
# 阶段说明：
#   builder  - 安装依赖并构建 Nuxt3 产物（.output）
#   runner   - 仅携带构建产物运行 Node.js SSR 服务，减小镜像体积
# ============================================================================

# ----------------------------------------------------------------------------
# 阶段 1: builder - 安装依赖并构建
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖清单和 Nuxt 配置文件（利用 Docker 层缓存，依赖未变时跳过 npm ci）
# 注意：需同时复制 nuxt.config.ts，因为 package.json 的 postinstall 脚本
#       (nuxt prepare) 依赖该配置文件来生成类型声明，否则 npm ci 会失败
COPY package*.json ./
COPY nuxt.config.ts ./

# 安装依赖（npm ci 严格按照 package-lock.json 安装，确保可复现的依赖树）
RUN npm ci

# 复制全部源码
COPY . .

# 构建 Nuxt3 产物（生成 .output 目录，包含 SSR server bundle 和静态资源）
RUN npm run build

# ----------------------------------------------------------------------------
# 阶段 2: runner - 仅运行构建产物
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# 生产环境标志
ENV NODE_ENV=production

# Nuxt3 运行时监听地址和端口（0.0.0.0 确保容器外可访问，供 nginx 反代）
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# API 基础地址配置（容器内通信，通过 Docker 自定义网络访问后端服务）
# - NUXT_API_BASE: SSR 阶段使用（服务端内网地址，直接访问后端容器）
# - NUXT_PUBLIC_API_BASE: 客户端浏览器使用（生产环境应通过 .env 覆盖为公网域名）
ENV NUXT_API_BASE=http://java-api:8080
ENV NUXT_PUBLIC_API_BASE=http://java-api:8080

# 仅复制构建产物
# Nuxt3 的 nitro 构建已将所有运行时依赖打包进 .output，无需额外安装 node_modules
COPY --from=builder /app/.output ./.output

# 暴露 Nuxt3 SSR 服务端口
EXPOSE 3000

# 启动 Nuxt3 SSR 服务
CMD ["node", ".output/server/index.mjs"]
