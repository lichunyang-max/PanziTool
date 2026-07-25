# 首页广告位间距调整 - 实施计划

## [ ] Task 1: 为首页广告位添加间距容器
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `index.vue` 中为首页中间广告位（homeMiddle）添加 `my-6` 间距容器，确保与热门工具和最新上架区块之间的间距一致
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: index.vue 中应包含 `<div class="my-6"><AdSlot slot-key="homeMiddle" /></div>`
  - `human-judgment` TR-1.2: 广告位与上下区块的间距应保持一致

## [ ] Task 2: 验证修改效果
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 运行测试确保修改没有破坏现有功能
  - 通过浏览器验证首页广告位间距调整效果
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 所有现有测试应通过
  - `human-judgment` TR-2.2: 首页广告位应正常显示且间距对称