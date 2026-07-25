# 首页广告位间距调整 - 产品需求文档

## Overview
- **Summary**: 调整首页热门工具和最新上架之间广告位的间距，确保广告位与两侧元素的间距保持一致
- **Purpose**: 优化首页布局，使广告位与周围内容区块的间距协调一致，提升视觉体验
- **Target Users**: 访问网站首页的所有用户

## Goals
- 调整首页广告位与热门工具之间的间距
- 调整首页广告位与最新上架之间的间距
- 确保广告位与两侧元素的间距保持一致

## Non-Goals (Out of Scope)
- 修改广告内容或样式
- 添加新的广告位
- 修改其他页面的广告位布局

## Background & Context
- 首页（`index.vue`）当前在热门工具和最新上架区块之间包含一个中间广告位（`homeMiddle`）
- 广告位当前没有设置间距容器，导致与周围元素的间距不一致
- 参考之前工具页面的处理方式，使用 `my-6` 容器来保持对称间距

## Functional Requirements
- **FR-1**: 首页广告位（homeMiddle）与上方热门工具之间应有适当间距
- **FR-2**: 首页广告位（homeMiddle）与下方最新上架之间应有适当间距
- **FR-3**: 广告位与两侧元素的间距应保持一致

## Non-Functional Requirements
- **NFR-1**: 修改后所有现有测试应通过
- **NFR-2**: 页面布局应保持响应式和美观

## Constraints
- **Technical**: Nuxt 3 框架，Vue 3 组合式 API，Tailwind CSS 样式
- **Dependencies**: 修改涉及 `pages/index.vue`

## Assumptions
- 使用 `my-6` 类（1.5rem/24px）作为标准间距，与之前工具页面的处理方式保持一致

## Acceptance Criteria

### AC-1: 广告位与热门工具间距
- **Given**: 用户访问首页
- **When**: 页面加载完成
- **Then**: 广告位与上方热门工具区块之间应有适当间距
- **Verification**: `human-judgment`

### AC-2: 广告位与最新上架间距
- **Given**: 用户访问首页
- **When**: 页面加载完成
- **Then**: 广告位与下方最新上架区块之间应有适当间距
- **Verification**: `human-judgment`

### AC-3: 间距一致性
- **Given**: 用户访问首页
- **When**: 观察广告位与两侧元素的间距
- **Then**: 广告位与上方热门工具、下方最新上架的间距应保持一致
- **Verification**: `human-judgment`

## Open Questions
- [ ] 无