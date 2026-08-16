# PanziPool Tools (盘子工具站)

> 面向中文开发者的免费在线工具站 —— 无需安装、免登录、隐私优先

[![Website](https://img.shields.io/website?up_message=online&down_message=offline&url=https://tool.panzipool.com&label=website&style=flat-square)](https://tool.panzipool.com)
[![GitHub stars](https://img.shields.io/github/stars/lichunyang-max/PanziTool?style=flat-square&label=stars)](https://github.com/lichunyang-max/PanziTool/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/lichunyang-max/PanziTool?style=flat-square)](https://github.com/lichunyang-max/PanziTool/commits)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/lichunyang-max/PanziTool?style=flat-square)](https://github.com/lichunyang-max/PanziTool/commits)
[![GitHub repo size](https://img.shields.io/github/repo-size/lichunyang-max/PanziTool?style=flat-square)](https://github.com/lichunyang-max/PanziTool)
[![GitHub issues](https://img.shields.io/github/issues/lichunyang-max/PanziTool?style=flat-square)](https://github.com/lichunyang-max/PanziTool/issues)
[![GitHub license](https://img.shields.io/github/license/lichunyang-max/PanziTool?style=flat-square)](https://github.com/lichunyang-max/PanziTool/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/lichunyang-max/PanziTool/pulls)

[![Nuxt](https://img.shields.io/badge/Nuxt-3-00DC82?style=flat-square&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

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
│   ├── layouts/               # 布局组件（默认/移动端/管理后台）
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
