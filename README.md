# PanziPool Tools (盘子工具站)

> 盘子工具站（https://tool.panzipool.com）致力于为中文开发者提供便捷的在线工具集合。我们聚焦开发者日常工作中的格式化、编码解码、正则测试、时间转换等高频需求，同时提供图片压缩、格式转换等轻量图片处理工具。所有工具无需安装、免登录、隐私优先，打开即用。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.21-00DC82.svg)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4.svg)](https://tailwindcss.com)

## 项目介绍

PanziPool Tools （盘子工具站）是一个纯前端实现的在线工具集合，所有数据处理均在浏览器本地完成，不上传服务器，保障用户数据隐私。项目采用 Nuxt 3 SSG（静态站点生成）模式构建，页面内容完整预渲染，对 SEO 友好。

### 核心特性

- **隐私优先**：所有工具计算均在浏览器本地完成，数据不离开设备
- **免登录即用**：无需注册账号，打开即用
- **SSG 预渲染**：全站静态生成，首屏直出完整 HTML，利于搜索引擎收录
- **响应式设计**：适配桌面、平板、移动端
- **双统计分析**：百度统计（国内）+ Google Analytics 4（国际）

## 在线访问

**[https://tool.panzipool.com](https://tool.panzipool.com)**

## 工具列表

### 开发者工具

| 工具 | 说明 |
|------|------|
| [JSON 格式化](https://tool.panzipool.com/tools/json-formatter) | JSON 美化、压缩、语法校验、错误定位 |
| [正则表达式测试](https://tool.panzipool.com/tools/regex-tester) | 实时匹配、结果高亮、分组展示、ReDoS 防护 |
| [时间戳转换](https://tool.panzipool.com/tools/timestamp) | Unix 时间戳互转、多时区切换 |
| [URL 编码解码](https://tool.panzipool.com/tools/url-encode) | UrlEncode/Decode、批量处理、特殊字符对照表 |
| [JWT 解析](https://tool.panzipool.com/tools/jwt-decoder) | JWT Token 头部与载荷解析、算法参考 |
| [Base64 编解码](https://tool.panzipool.com/tools/base64) | 文本与图片互转、UTF-8 兼容 |
| [哈希计算](https://tool.panzipool.com/tools/hash) | MD5/SHA1/SHA256/SHA512、文件哈希 |
| [Cron 表达式生成器](https://tool.panzipool.com/tools/cron) | 5段/6段格式、中文解释、触发时间预览 |
| [二维码生成器](https://tool.panzipool.com/tools/qr-code) | 文本/链接/WiFi/邮箱、自定义颜色 Logo |

### 图片工具

| 工具 | 说明 |
|------|------|
| [图片压缩](https://tool.panzipool.com/tools/image-compress) | JPG/PNG/WEBP 批量压缩、自定义画质尺寸 |
| [图片裁剪](https://tool.panzipool.com/tools/image-crop) | 自定义比例裁剪、旋转翻转 |
| [图片格式转换](https://tool.panzipool.com/tools/image-convert) | PNG/JPG/WEBP 无损互转 |
| [AI 证件照](https://tool.panzipool.com/tools/id-photo) | AI 抠图换底色、九种标准尺寸 300DPI 输出 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Nuxt 3 (Vue 3 + TypeScript) |
| 样式 | Tailwind CSS 4 + 自定义设计系统 |
| 构建 | Vite + Nitro (SSG 预渲染) |
| 后端 | Java Spring Boot (工具元数据、事件统计) |
| 部署 | Nginx 反向代理 + 静态文件 |

## Quick Start

### 环境要求

- Node.js >= 18
- npm / pnpm

### 安装与运行

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 开发模式（默认 http://localhost:3000）
npm run dev

# 生产构建（SSG 静态生成）
npm run generate

# 预览生产构建
npm run preview
```

### 环境变量

```bash
# .env
NUXT_PUBLIC_API_BASE=http://localhost:8080    # 后端 API 地址
NUXT_GA4_ID=G-XXXXXXXXXX                       # Google Analytics 4 ID
NUXT_GSC_VERIFICATION=your-verification-code   # Google Search Console 验证码
```

## 项目结构

```
PanziTool/
├── frontend/                  # Nuxt 3 前端
│   ├── components/tool/       # 工具交互组件
│   ├── composables/           # 组合式函数（分析、设备检测、API）
│   ├── layouts/               # 布布组件（默认/移动端/管理后台）
│   ├── pages/                 # 页面路由
│   │   ├── tools/[slug].vue   # 工具详情页动态路由
│   │   ├── category/          # 分类页
│   │   └── index.vue          # 首页
│   ├── plugins/               # Nuxt 插件（百度统计、GA4、设备检测）
│   ├── server/routes/         # 服务端路由（sitemap.xml）
│   ├── utils/                 # 工具元数据、组件注册表
│   └── nuxt.config.ts         # Nuxt 配置
├── backend/                   # Java Spring Boot 后端
└── README.md
```

## SEO 特性

- **Sitemap.xml**：动态生成，包含所有工具页和分类页
- **结构化数据**：每个工具页包含 `WebApplication` + `FAQPage` JSON-LD
- **SSG 预渲染**：所有页面构建时生成完整 HTML
- **Meta 标签**：独立的 title、description、keywords、canonical
- **Robots.txt**：正确配置允许爬虫抓取
- **双站长平台**：百度站长 + Google Search Console 验证

## License

[MIT](LICENSE)
