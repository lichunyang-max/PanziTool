# 正则测试页面移除底部广告位 - 产品需求文档

## Overview
- **Summary**: 移除正则表达式测试工具页面（/tools/regex-tester）最底部的广告位，保留匹配结果和分组信息之间的中间广告位。
- **Purpose**: 优化正则测试工具页面的视觉体验，减少广告位对用户注意力的干扰。
- **Target Users**: 使用正则表达式测试工具的开发者用户。

## Goals
- [ ] 移除正则测试页面底部广告位（toolBottom）
- [ ] 保留正则测试页面中间广告位（regexMiddle）
- [ ] 其他工具页面不受影响

## Non-Goals (Out of Scope)
- [ ] 不移除其他工具页面的底部广告位
- [ ] 不修改广告位组件本身的逻辑
- [ ] 不修改广告位的配置方式

## Background & Context
- 当前所有工具页面共享 `ToolLayout.vue` 布局组件，该组件包含一个底部广告位 `<AdSlot slot-key="toolBottom" />`
- 正则测试工具页面（`RegexTesterTool.vue`）在匹配结果和分组信息之间额外添加了一个中间广告位 `<AdSlot slot-key="regexMiddle" />`
- 用户希望只移除底部广告位，保留中间广告位

## Functional Requirements
- **FR-1**: 正则测试页面（slug: regex-tester）不再显示底部广告位
- **FR-2**: 正则测试页面的中间广告位（匹配结果和分组信息之间）保持显示
- **FR-3**: 其他工具页面的底部广告位保持显示不变

## Non-Functional Requirements
- **NFR-1**: 修改不应影响其他工具页面的布局和功能
- **NFR-2**: 修改应符合现有代码规范和模式

## Constraints
- **Technical**: 需要在 `ToolLayout.vue` 中添加条件控制，或在路由页面中传递参数控制广告位显示

## Assumptions
- [ ] 广告位通过 `AdSlot` 组件实现，未配置时会静默隐藏
- [ ] 工具页面路由通过 `/tools/[slug].vue` 统一处理

## Acceptance Criteria

### AC-1: 正则测试页面底部广告位被移除
- **Given**: 用户访问正则测试工具页面（/tools/regex-tester）
- **When**: 页面加载完成后
- **Then**: 页面底部不应显示广告位（toolBottom）
- **Verification**: `programmatic`
- **Notes**: 可通过检查页面 DOM 确认 toolBottom 广告位不存在

### AC-2: 正则测试页面中间广告位保留
- **Given**: 用户访问正则测试工具页面（/tools/regex-tester）
- **When**: 页面加载完成后
- **Then**: 匹配结果和分组信息之间应显示广告位（regexMiddle）
- **Verification**: `programmatic`
- **Notes**: 可通过检查页面 DOM 确认 regexMiddle 广告位存在

### AC-3: 其他工具页面不受影响
- **Given**: 用户访问其他工具页面（如 JSON 格式化、URL 编码等）
- **When**: 页面加载完成后
- **Then**: 这些页面的底部广告位应正常显示
- **Verification**: `human-judgment`

## Open Questions
- [ ] 无