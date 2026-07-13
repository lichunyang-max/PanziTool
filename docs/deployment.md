# PanziPool 部署指南

本文档详细说明 PanziPool 项目在腾讯云服务器上的完整部署流程，涵盖服务器准备、域名配置、HTTPS 证书、Docker 部署、备份恢复及日常运维操作。

---

## 目录

1. [服务器准备](#1-服务器准备)
2. [域名与 DNS 配置](#2-域名与-dns-配置)
3. [HTTPS 证书配置](#3-https-证书配置)
4. [部署步骤](#4-部署步骤)
5. [备份与恢复](#5-备份与恢复)
6. [常见运维操作](#6-常见运维操作)
7. [故障排查](#7-故障排查)

---

## 1. 服务器准备

### 1.1 服务器要求

| 项目       | 最低配置         | 推荐配置         |
| ---------- | ---------------- | ---------------- |
| CPU        | 2 核             | 4 核             |
| 内存       | 4 GB             | 8 GB             |
| 磁盘       | 40 GB SSD        | 80 GB SSD        |
| 操作系统   | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| 带宽       | 3 Mbps           | 5 Mbps           |

### 1.2 安装 Docker

```bash
# 更新包索引
sudo apt update

# 安装必要依赖
sudo apt install -y ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 软件源
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine、CLI、Containerd 和 Docker Compose 插件
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 将当前用户加入 docker 组（免 sudo 运行 docker 命令）
sudo usermod -aG docker $USER

# 使组变更生效（或重新登录）
newgrp docker

# 验证安装
docker --version
docker compose version
```

### 1.3 配置 Docker 开机自启

```bash
sudo systemctl enable docker
sudo systemctl enable containerd
```

### 1.4 配置防火墙

```bash
# 开放 SSH（22）、HTTP（80）、HTTPS（443）端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看防火墙状态
sudo ufw status
```

> **注意**：PostgreSQL（5432）端口不需要对外开放，仅在 Docker 内网通信。

---

## 2. 域名与 DNS 配置

### 2.1 添加 DNS 解析记录

在域名注册商（如腾讯云 DNSPod、阿里云 DNS）的控制台中，为 `panzipool.com` 添加以下 A 记录：

| 记录类型 | 主机记录 | 记录值           | 说明                   |
| -------- | -------- | ---------------- | ---------------------- |
| A        | @        | `<服务器公网 IP>` | 裸域 panzipool.com     |
| A        | www      | `<服务器公网 IP>` | www.panzipool.com      |

### 2.2 验证 DNS 解析

DNS 生效通常需要几分钟至数小时，使用以下命令验证：

```bash
# 检查裸域解析
dig panzipool.com +short

# 检查 www 域解析
dig www.panzipool.com +short

# 或使用 ping 验证
ping panzipool.com
ping www.panzipool.com
```

两条记录都应返回服务器的公网 IP 地址。

---

## 3. HTTPS 证书配置

### 方式一：Let's Encrypt（certbot，推荐）

#### 3.1.1 安装 certbot

```bash
sudo apt update
sudo apt install -y certbot
```

#### 3.1.2 申请证书

使用 standalone 模式申请证书（需临时释放 80 端口）：

```bash
# 确保 80 端口未被占用（如果 nginx 已在运行，先停止）
# docker compose down

# 申请证书（同时覆盖裸域和 www 域）
sudo certbot certonly --standalone \
  -d panzipool.com \
  -d www.panzipool.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

证书生成位置：
- `/etc/letsencrypt/live/panzipool.com/fullchain.pem`（证书链）
- `/etc/letsencrypt/live/panzipool.com/privkey.pem`（私钥）

#### 3.1.3 部署证书到 nginx

```bash
# 进入项目目录
cd /opt/panzipool

# 创建证书目录
mkdir -p nginx/certs

# 复制证书（注意：docker 容器以 nginx 用户运行，需确保可读权限）
sudo cp /etc/letsencrypt/live/panzipool.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/panzipool.com/privkey.pem nginx/certs/

# 设置权限
sudo chmod 644 nginx/certs/fullchain.pem
sudo chmod 600 nginx/certs/privkey.pem
```

#### 3.1.4 配置自动续期

Let's Encrypt 证书有效期为 90 天，建议配置自动续期：

```bash
# 测试续期流程（dry-run，不会实际续期）
sudo certbot renew --dry-run

# 添加 cron 定时任务，每月 1 号凌晨 3 点检查并续期
# 续期后自动复制证书并重启 nginx
sudo crontab -e

# 添加以下内容：
0 3 1 * * certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/panzipool.com/fullchain.pem /opt/panzipool/nginx/certs/ && cp /etc/letsencrypt/live/panzipool.com/privkey.pem /opt/panzipool/nginx/certs/ && chmod 644 /opt/panzipool/nginx/certs/fullchain.pem && chmod 600 /opt/panzipool/nginx/certs/privkey.pem && docker compose -f /opt/panzipool/docker-compose.yml restart nginx"
```

### 方式二：腾讯云免费 SSL

1. 登录腾讯云控制台 → SSL 证书 → 申请免费证书
2. 填写域名 `www.panzipool.com`（可同时申请 `panzipool.com`）
3. 选择 DNS 验证，按提示添加 CNAME 记录
4. 验证通过后下载证书（选择 Nginx 格式）
5. 将下载的 `.crt` 文件重命名为 `fullchain.pem`，`.key` 文件重命名为 `privkey.pem`
6. 上传到服务器的 `nginx/certs/` 目录：

```bash
# 在服务器上创建证书目录
mkdir -p /opt/panzipool/nginx/certs

# 上传证书（在本地执行）
scp fullchain.pem root@<服务器IP>:/opt/panzipool/nginx/certs/
scp privkey.pem root@<服务器IP>:/opt/panzipool/nginx/certs/
```

> **注意**：腾讯云免费 SSL 有效期为 1 年，到期前需手动续期。

---

## 4. 部署步骤

### 4.1 克隆代码

```bash
# 进入部署目录
sudo mkdir -p /opt/panzipool
sudo chown $USER:$USER /opt/panzipool
cd /opt/panzipool

# 克隆项目代码
git clone <项目仓库地址> .
```

### 4.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，设置实际值
nano .env
```

`.env` 文件中需要修改的关键配置：

```ini
# 数据库密码（必须修改为强密码）
DB_PASSWORD=你的强密码

# CORS 允许的源
CORS_ORIGINS=https://www.panzipool.com

# 客户端 API 基础地址
PUBLIC_API_BASE=https://www.panzipool.com
```

### 4.3 准备 SSL 证书

确保 SSL 证书已放置到 `nginx/certs/` 目录：

```bash
ls -la nginx/certs/
# 应包含：
# fullchain.pem
# privkey.pem
```

### 4.4 构建并启动服务

```bash
# 构建所有镜像并启动服务（后台运行）
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看各服务日志（实时跟踪）
docker compose logs -f
```

### 4.5 验证部署

```bash
# 1. 检查所有容器运行状态
docker compose ps
# 所有服务应显示 "Up" 状态，postgres 和 java-api 应显示 "healthy"

# 2. 测试 HTTPS 访问
curl -I https://www.panzipool.com
# 应返回 200 OK

# 3. 测试 HTTP 跳转
curl -I http://www.panzipool.com
# 应返回 301 重定向到 HTTPS

# 4. 测试裸域跳转
curl -I https://panzipool.com
# 应返回 301 重定向到 https://www.panzipool.com

# 5. 测试 API 健康检查
curl https://www.panzipool.com/api/v1/actuator/health
# 应返回 {"status":"UP"}

# 6. 测试 trailing slash 跳转
curl -I https://www.panzipool.com/about/
# 应返回 301 重定向到 https://www.panzipool.com/about
```

---

## 5. 备份与恢复

### 5.1 数据库备份

#### 方式一：Docker exec（推荐，无需额外安装客户端）

```bash
cd /opt/panzipool

# 创建备份目录
mkdir -p backups

# 使用 docker exec 在 postgres 容器内执行 pg_dump
# 需要通过环境变量传入数据库密码
source .env
docker exec panzipool-postgres pg_dump \
  -U "${DB_USERNAME:-postgres}" \
  -d "${DB_NAME:-panzipool}" \
  --no-owner --no-privileges \
  | gzip -9 > "backups/panzipool_backup_$(date '+%Y%m%d_%H%M%S').sql.gz"

# 验证备份文件
ls -lh backups/
```

#### 方式二：使用项目脚本（需在服务器安装 postgresql-client）

```bash
# 安装 PostgreSQL 客户端工具
sudo apt install -y postgresql-client

# 设置环境变量（使用 Docker 内网地址）
cd /opt/panzipool
source .env
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME="${DB_NAME:-panzipool}"
export DB_USER="${DB_USERNAME:-postgres}"
export DB_PASSWORD="${DB_PASSWORD}"

# 注意：使用此方式需在 docker-compose.yml 中为 postgres 添加端口映射：
# ports:
#   - "127.0.0.1:5432:5432"  # 仅本机可访问

# 执行备份脚本
./scripts/backup-db.sh
```

### 5.2 自动定时备份

```bash
# 编辑 crontab
crontab -e

# 添加定时任务：每天凌晨 1 点自动备份
0 1 * * * cd /opt/panzipool && source .env && docker exec panzipool-postgres pg_dump -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-panzipool}" --no-owner --no-privileges | gzip -9 > "backups/panzipool_backup_$(date '+\%Y\%m\%d_\%H\%M\%S').sql.gz" >> /var/log/panzipool-backup.log 2>&1

# 清理 30 天前的旧备份（每天凌晨 2 点执行）
0 2 * * * find /opt/panzipool/backups -name "panzipool_backup_*.sql.gz" -type f -mtime +30 -delete
```

### 5.3 数据库恢复

#### 方式一：Docker exec（推荐）

```bash
cd /opt/panzipool
source .env

# 查看可用备份
ls -lh backups/

# 恢复指定备份文件（替换为实际文件名）
BACKUP_FILE="backups/panzipool_backup_20260101_010000.sql.gz"

# 解压并导入
gunzip -c "${BACKUP_FILE}" | docker exec -i panzipool-postgres \
  psql -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-panzipool}" \
  -v ON_ERROR_STOP=1

echo "数据库恢复完成"
```

#### 方式二：使用项目脚本

```bash
cd /opt/panzipool
source .env
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME="${DB_NAME:-panzipool}"
export DB_USER="${DB_USERNAME:-postgres}"
export DB_PASSWORD="${DB_PASSWORD}"

# 执行恢复脚本（会提示确认）
./scripts/restore-db.sh backups/panzipool_backup_20260101_010000.sql.gz
```

> **警告**：恢复操作会覆盖数据库中的现有数据，请谨慎执行。恢复前建议先创建当前数据的备份。

---

## 6. 常见运维操作

### 6.1 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志（实时跟踪）
docker compose logs -f nginx
docker compose logs -f java-api
docker compose logs -f nuxt
docker compose logs -f postgres

# 查看最近 100 行日志
docker compose logs --tail 100 java-api

# 查看 nginx 访问日志（直接读取挂载的日志文件）
tail -f nginx/logs/access.log
tail -f nginx/logs/error.log
```

### 6.2 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart nginx
docker compose restart java-api
docker compose restart nuxt
docker compose restart postgres
```

### 6.3 更新版本

```bash
cd /opt/panzipool

# 1. 拉取最新代码
git pull origin main

# 2. 重新构建并启动（仅重建有变更的镜像）
docker compose up -d --build

# 3. 如需清理旧镜像
docker image prune -f
```

### 6.4 停止和启动服务

```bash
# 停止所有服务（保留数据卷）
docker compose down

# 停止并删除数据卷（危险！会丢失所有数据库数据）
# docker compose down -v

# 启动所有服务
docker compose up -d
```

### 6.5 进入容器调试

```bash
# 进入后端容器
docker exec -it panzipool-api sh

# 进入前端容器
docker exec -it panzipool-frontend sh

# 进入 PostgreSQL 交互式终端
docker exec -it panzipool-postgres psql -U postgres -d panzipool

# 进入 nginx 容器
docker exec -it panzipool-nginx sh
```

### 6.6 查看资源使用

```bash
# 查看各容器资源占用
docker stats

# 查看磁盘使用
docker system df

# 查看特定容器详细信息
docker inspect panzipool-api
```

### 6.7 手动重新加载 nginx 配置

修改 `nginx/nginx.conf` 后，无需重启容器即可生效：

```bash
# 测试配置语法
docker exec panzipool-nginx nginx -t

# 重新加载配置
docker exec panzipool-nginx nginx -s reload
```

---

## 7. 故障排查

### 7.1 服务无法启动

```bash
# 查看服务启动日志
docker compose logs <服务名>

# 常见原因：
# - postgres: DB_PASSWORD 未设置 → 检查 .env 文件
# - java-api: 数据库连接失败 → 检查 postgres 是否健康、DB_URL 是否正确
# - nuxt: 构建失败 → 检查前端代码和依赖
# - nginx: SSL 证书缺失 → 检查 nginx/certs/ 目录是否有证书文件
```

### 7.2 HTTPS 访问失败

```bash
# 检查证书文件是否存在
ls -la nginx/certs/

# 检查证书有效期
openssl x509 -in nginx/certs/fullchain.pem -noout -dates

# 检查 nginx 配置语法
docker exec panzipool-nginx nginx -t

# 检查 443 端口是否监听
sudo ss -tlnp | grep :443
```

### 7.3 API 返回 502 Bad Gateway

```bash
# 检查后端服务是否运行
docker compose ps java-api

# 检查后端健康状态
docker inspect --format='{{.State.Health.Status}}' panzipool-api

# 查看后端日志
docker compose logs --tail 50 java-api

# 常见原因：
# - 后端启动慢，等待 start_period（60s）后重试
# - 数据库连接失败 → 检查 postgres 状态
# - 内存不足 → 检查 docker stats，考虑增加服务器内存
```

### 7.4 前端页面空白或报错

```bash
# 检查前端服务是否运行
docker compose ps nuxt

# 查看前端日志
docker compose logs --tail 50 nuxt

# 检查 SSR 是否正常（直接访问容器端口）
docker exec panzipool-nginx wget -qO- http://nuxt:3000/

# 检查 API 基础地址配置
docker exec panzipool-frontend env | grep NUXT
```

### 7.5 数据库连接失败

```bash
# 检查 postgres 容器状态
docker compose ps postgres

# 检查 postgres 健康状态
docker inspect --format='{{.State.Health.Status}}' panzipool-postgres

# 查看 postgres 日志
docker compose logs --tail 50 postgres

# 验证数据库连接
docker exec panzipool-postgres psql -U postgres -d panzipool -c "SELECT 1;"

# 检查数据卷是否存在
docker volume ls | grep panzipool
```

---

## 附录：架构说明

```
                    ┌─────────────────────────────────────────┐
                    │              腾讯云服务器                 │
                    │                                         │
  用户浏览器 ──────►│  ┌──────────────────────────────────┐   │
  (HTTPS 443)       │  │  nginx 容器 (80/443)              │   │
                    │  │  ├─ /api/v1/* → java-api:8080     │   │
                    │  │  ├─ 其余路径  → nuxt:3000         │   │
                    │  │  ├─ HTTP → 301 HTTPS              │   │
                    │  │  ├─ 裸域 → 301 www                │   │
                    │  │  └─ trailing slash → 301 去尾斜杠  │   │
                    │  └──────┬───────────────────┬────────┘   │
                    │         │                   │            │
                    │  ┌──────▼──────┐  ┌────────▼────────┐   │
                    │  │ nuxt 容器   │  │ java-api 容器   │   │
                    │  │ (Nuxt3 SSR) │  │ (Spring Boot)   │   │
                    │  │ :3000       │  │ :8080           │   │
                    │  └─────────────┘  └───────┬─────────┘   │
                    │                           │              │
                    │                  ┌────────▼────────┐    │
                    │                  │ postgres 容器  │    │
                    │                  │ (PostgreSQL 15)│    │
                    │                  │ :5432          │    │
                    │                  │ 数据卷持久化    │    │
                    │                  └─────────────────┘    │
                    │                                         │
                    │  自定义网络: panzipool-net              │
                    └─────────────────────────────────────────┘
```

### 环境变量流转说明

| 环境变量               | 作用域       | 说明                                     |
| ---------------------- | ------------ | ---------------------------------------- |
| `NUXT_API_BASE`        | nuxt 容器    | SSR 阶段调用后端 API 的内网地址           |
| `NUXT_PUBLIC_API_BASE` | nuxt 容器    | 浏览器调用后端 API 的公网域名             |
| `DB_URL`               | java-api 容器| JDBC 连接串（指向 postgres 容器）        |
| `DB_USERNAME`          | java-api 容器| 数据库用户名                             |
| `DB_PASSWORD`          | java-api 容器| 数据库密码                               |
| `SPRING_PROFILES_ACTIVE`| java-api 容器| Spring Boot profile（prod）              |
| `CORS_ORIGINS`         | java-api 容器| CORS 允许的源                            |
