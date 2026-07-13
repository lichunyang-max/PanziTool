# ============================================================================
# PanziPool nginx 自定义镜像 Dockerfile
# ----------------------------------------------------------------------------
# 基于官方 nginx:alpine 镜像，注入自定义反向代理配置
# HTTPS 证书通过 docker-compose volume 挂载，不打包进镜像
# ============================================================================

FROM nginx:alpine

# 清除默认配置，复制自定义反向代理配置
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露 HTTP 和 HTTPS 端口
EXPOSE 80
EXPOSE 443
