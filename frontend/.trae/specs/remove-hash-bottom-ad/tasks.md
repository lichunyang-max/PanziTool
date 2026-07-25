# 哈希计算页面移除底部广告位 - 实施计划

## [ ] Task 1: 修改 ToolLayout.vue 添加底部广告位条件渲染
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `ToolLayout.vue` 中为底部广告位（toolBottom）添加条件渲染，当 `tool.slug === 'hash'` 时不显示
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: 当 tool.slug 为 hash 时，toolBottom 广告位不应渲染
  - `programmatic` TR-1.2: 当 tool.slug 为其他值时，toolBottom 广告位应正常渲染

## [ ] Task 2: 验证哈希计算页面中间广告位保留
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 确认 `HashTool.vue` 中的中间广告位（hashMiddle）未被修改
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: HashTool.vue 中应包含 `<AdSlot slot-key="hashMiddle" />`
  - `human-judgment` TR-2.2: 哈希计算页面文件哈希计算和哈希算法对比之间应显示广告位

## [ ] Task 3: 验证其他工具页面不受影响
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 确认其他工具页面（如 JSON 格式化、正则测试、时间戳转换、URL 编码解码、JWT 解析等）的底部广告位正常显示（除已移除的）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 其他工具页面底部广告位应正常显示（除 regex-tester、timestamp、url-encode 和 jwt-decoder）