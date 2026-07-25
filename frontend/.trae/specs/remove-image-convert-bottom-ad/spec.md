# 格式转换页面移除底部广告位 - 产品需求文档

## Overview
- **Summary**: 移除格式转换页面底部的广告位，保留本地处理保障和格式参考表之间的广告位，并确保保留的广告位与周围元素间距一致
- **Purpose**: 优化格式转换页面的布局，减少广告位对用户体验的干扰，同时保持中间广告位的可见性
- **Target Users**: 使用图片格式转换工具的用户

## Goals
- 移除格式转换页面底部广告位
- 保留本地处理保障和格式参考表之间的广告位
- 确保保留的广告位与周围元素间距保持一致
- 不影响其他工具页面的广告位显示

## Non-Goals (Out of Scope)
- 修改广告内容或样式
- 修改其他工具页面的布局
- 添加新的广告位

## Background & Context
- 格式转换页面（`ImageConvertTool.vue`）当前包含两个广告位：中间广告位（`imageConvertMiddle`）和底部广告位（`toolBottom`）
- 底部广告位由共享布局组件 `ToolLayout.vue` 统一管理
- 之前已对多个工具页面（正则测试、时间戳转换、URL编码解码、JWT解析、哈希计算、图片裁剪）实施了类似的底部广告位移除操作

## Functional Requirements
- **FR-1**: 格式转换页面（`/tools/image-convert`）底部广告位不再显示
- **FR-2**: 格式转换页面本地处理保障和格式参考表之间的广告位保持显示
- **FR-3**: 保留的广告位与本地处理保障、格式参考表之间的间距保持一致

## Non-Functional Requirements
- **NFR-1**: 修改后所有现有测试应通过
- **NFR-2**: 页面布局应保持响应式和美观

## Constraints
- **Technical**: Nuxt 3 框架，Vue 3 组合式 API，Tailwind CSS 样式
- **Dependencies**: 修改涉及 `ToolLayout.vue` 和 `ImageConvertTool.vue`

## Assumptions
- 格式转换页面的 slug 为 `image-convert`
- 中间广告位的 slot-key 为 `imageConvertMiddle`

## Acceptance Criteria

### AC-1: 底部广告位移除
- **Given**: 用户访问格式转换页面 `/tools/image-convert`
- **When**: 页面加载完成
- **Then**: 页面底部不应显示广告位
- **Verification**: `programmatic`

### AC-2: 中间广告位保留
- **Given**: 用户访问格式转换页面 `/tools/image-convert`
- **When**: 页面加载完成
- **Then**: 本地处理保障和格式参考表之间应显示广告位
- **Verification**: `human-judgment`

### AC-3: 广告位间距一致
- **Given**: 用户访问格式转换页面 `/tools/image-convert`
- **When**: 观察广告位与周围元素的间距
- **Then**: 广告位与上方本地处理保障、下方格式参考表的间距应保持一致
- **Verification**: `human-judgment`

### AC-4: 其他页面不受影响
- **Given**: 用户访问其他工具页面（如 JSON 格式化、正则测试等）
- **When**: 页面加载完成
- **Then**: 其他工具页面的广告位显示不受影响
- **Verification**: `human-judgment`

## Open Questions
- [ ] 无