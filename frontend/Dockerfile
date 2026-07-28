# ============================================================================
# PanziPool 前端 Dockerfile（Nuxt3 静态预渲染 + Nginx）
# ----------------------------------------------------------------------------
# 阶段说明：
#   builder  - 安装依赖并预渲染所有路由（nuxt generate → .output/public）
#   runner   - Nginx 提供静态文件服务，返回完整 HTML 利于 SEO / 百度收录
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

# 预渲染所有路由（生成 .output/public，包含每个页面的完整 HTML）
RUN npm run generate

# ----------------------------------------------------------------------------
# 阶段 2: runner - Nginx 提供静态文件服务
# ----------------------------------------------------------------------------
FROM nginx:alpine AS runner

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制预渲染产物到 Nginx 静态目录
COPY --from=builder /app/.output/public /usr/share/nginx/html

# 暴露端口（与原 Node 服务一致，外部 Nginx 反代无需修改）
EXPOSE 3000
