# 哈希计算页面移除底部广告位 - 产品需求文档

## Overview
- **Summary**: 移除哈希计算工具页面（/tools/hash）最底部的广告位，保留文件哈希计算和哈希算法对比之间的广告位。
- **Purpose**: 优化哈希计算工具页面的视觉体验，减少广告位对用户注意力的干扰。
- **Target Users**: 使用哈希计算工具的开发者用户。

## Goals
- [ ] 移除哈希计算页面底部广告位（toolBottom）
- [ ] 保留文件哈希计算和哈希算法对比之间的广告位（hashMiddle）
- [ ] 其他工具页面不受影响

## Non-Goals (Out of Scope)
- [ ] 不移除其他工具页面的底部广告位
- [ ] 不修改广告位组件本身的逻辑
- [ ] 不修改广告位的配置方式
- [ ] 不修改广告位间距（父容器使用 gap-6 已保证一致间距）

## Background & Context
- 当前所有工具页面共享 `ToolLayout.vue` 布局组件，该组件包含一个底部广告位 `<AdSlot slot-key="toolBottom" />`
- 哈希计算工具页面（`HashTool.vue`）在文件哈希计算和哈希算法对比表之间添加了一个中间广告位 `<AdSlot slot-key="hashMiddle" />`
- 页面使用 `flex flex-col gap-6` 作为容器，各元素之间已有一致的 1.5rem 间距
- 用户希望只移除底部广告位，保留中间广告位

## Functional Requirements
- **FR-1**: 哈希计算页面（slug: hash）不再显示底部广告位
- **FR-2**: 哈希计算页面的中间广告位（文件哈希计算和哈希算法对比之间）保持显示
- **FR-3**: 其他工具页面的底部广告位保持显示不变

## Non-Functional Requirements
- **NFR-1**: 修改不应影响其他工具页面的布局和功能
- **NFR-2**: 修改应符合现有代码规范和模式

## Constraints
- **Technical**: 需要在 `ToolLayout.vue` 中添加条件控制

## Assumptions
- [ ] 广告位通过 `AdSlot` 组件实现，未配置时会静默隐藏
- [ ] 工具页面路由通过 `/tools/[slug].vue` 统一处理

## Acceptance Criteria

### AC-1: 哈希计算页面底部广告位被移除
- **Given**: 用户访问哈希计算工具页面（/tools/hash）
- **When**: 页面加载完成后
- **Then**: 页面底部不应显示广告位（toolBottom）
- **Verification**: `programmatic`

### AC-2: 哈希计算页面中间广告位保留
- **Given**: 用户访问哈希计算工具页面（/tools/hash）
- **When**: 页面加载完成后
- **Then**: 文件哈希计算和哈希算法对比之间应显示广告位（hashMiddle）
- **Verification**: `programmatic`

### AC-3: 其他工具页面不受影响
- **Given**: 用户访问其他工具页面（如 JSON 格式化、正则测试、时间戳转换、URL 编码解码、JWT 解析等）
- **When**: 页面加载完成后
- **Then**: 这些页面的底部广告位应正常显示（除已移除的）
- **Verification**: `human-judgment`

## Open Questions
- [ ] 无