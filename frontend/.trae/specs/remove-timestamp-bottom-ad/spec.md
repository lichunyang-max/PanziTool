# 时间戳转换页面移除底部广告位 - 产品需求文档

## Overview
- **Summary**: 移除时间戳转换工具页面（/tools/timestamp）最底部的广告位，保留时区选择和常用时间戳参考之间的中间广告位，并且保留的广告位与周围元素间距保持一致。
- **Purpose**: 优化时间戳转换工具页面的视觉体验，减少广告位对用户注意力的干扰。
- **Target Users**: 使用时间戳转换工具的开发者用户。

## Goals
- [ ] 移除时间戳转换页面底部广告位（toolBottom）
- [ ] 保留时间戳转换页面中间广告位（timestampMiddle）
- [ ] 中间广告位与周围元素（时区选择、常用时间戳参考）的间距保持一致
- [ ] 其他工具页面不受影响

## Non-Goals (Out of Scope)
- [ ] 不移除其他工具页面的底部广告位
- [ ] 不修改广告位组件本身的逻辑
- [ ] 不修改广告位的配置方式

## Background & Context
- 当前所有工具页面共享 `ToolLayout.vue` 布局组件，该组件包含一个底部广告位 `<AdSlot slot-key="toolBottom" />`
- 时间戳转换工具页面（`TimestampTool.vue`）在时区选择和常用时间戳参考之间额外添加了一个中间广告位 `<AdSlot slot-key="timestampMiddle" />`
- 用户希望只移除底部广告位，保留中间广告位，并确保间距一致

## Functional Requirements
- **FR-1**: 时间戳转换页面（slug: timestamp）不再显示底部广告位
- **FR-2**: 时间戳转换页面的中间广告位（时区选择和常用时间戳参考之间）保持显示
- **FR-3**: 中间广告位与时区选择、常用时间戳参考之间的间距保持一致
- **FR-4**: 其他工具页面的底部广告位保持显示不变

## Non-Functional Requirements
- **NFR-1**: 修改不应影响其他工具页面的布局和功能
- **NFR-2**: 修改应符合现有代码规范和模式

## Constraints
- **Technical**: 需要在 `ToolLayout.vue` 中添加条件控制

## Assumptions
- [ ] 广告位通过 `AdSlot` 组件实现，未配置时会静默隐藏
- [ ] 工具页面路由通过 `/tools/[slug].vue` 统一处理

## Acceptance Criteria

### AC-1: 时间戳转换页面底部广告位被移除
- **Given**: 用户访问时间戳转换工具页面（/tools/timestamp）
- **When**: 页面加载完成后
- **Then**: 页面底部不应显示广告位（toolBottom）
- **Verification**: `programmatic`

### AC-2: 时间戳转换页面中间广告位保留
- **Given**: 用户访问时间戳转换工具页面（/tools/timestamp）
- **When**: 页面加载完成后
- **Then**: 时区选择和常用时间戳参考之间应显示广告位（timestampMiddle）
- **Verification**: `programmatic`

### AC-3: 中间广告位间距保持一致
- **Given**: 用户访问时间戳转换工具页面（/tools/timestamp）
- **When**: 页面加载完成后
- **Then**: 中间广告位与上方时区选择卡片、下方常用时间戳参考卡片的间距应保持一致
- **Verification**: `human-judgment`

### AC-4: 其他工具页面不受影响
- **Given**: 用户访问其他工具页面（如 JSON 格式化、正则测试等）
- **When**: 页面加载完成后
- **Then**: 这些页面的底部广告位应正常显示
- **Verification**: `human-judgment`

## Open Questions
- [ ] 无