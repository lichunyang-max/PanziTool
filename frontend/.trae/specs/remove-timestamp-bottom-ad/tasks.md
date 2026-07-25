# 时间戳转换页面移除底部广告位 - 实施计划

## [ ] Task 1: 修改 ToolLayout.vue 添加底部广告位条件渲染
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `ToolLayout.vue` 中为底部广告位（toolBottom）添加条件渲染，当 `tool.slug === 'timestamp'` 时不显示
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 当 tool.slug 为 timestamp 时，toolBottom 广告位不应渲染
  - `programmatic` TR-1.2: 当 tool.slug 为其他值时，toolBottom 广告位应正常渲染

## [ ] Task 2: 验证时间戳转换页面中间广告位保留
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 确认 `TimestampTool.vue` 中的中间广告位（timestampMiddle）未被修改
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: TimestampTool.vue 中应包含 `<AdSlot slot-key="timestampMiddle" />`
  - `human-judgment` TR-2.2: 时间戳转换页面时区选择和常用时间戳参考之间应显示广告位

## [ ] Task 3: 验证中间广告位间距保持一致
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 确认中间广告位与周围元素的间距保持一致
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 中间广告位与上方时区选择卡片、下方常用时间戳参考卡片的间距应保持一致

## [ ] Task 4: 验证其他工具页面不受影响
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 确认其他工具页面（如 JSON 格式化、正则测试等）的底部广告位正常显示
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 其他工具页面底部广告位应正常显示