# 正则测试页面移除底部广告位 - 验证清单

- [x] Checkpoint 1: ToolLayout.vue 的 ToolMeta 接口应包含可选字段 hideBottomAd（使用简化方案，直接通过 tool.slug 判断）
- [x] Checkpoint 2: ToolLayout.vue 中底部广告位应有条件渲染（v-if）
- [x] Checkpoint 3: /tools/[slug].vue 应为 regex-tester slug 设置 hideBottomAd: true（使用简化方案，无需修改路由页面）
- [x] Checkpoint 4: RegexTesterTool.vue 中应保留中间广告位（regexMiddle）
- [x] Checkpoint 5: 正则测试页面（/tools/regex-tester）底部广告位不显示
- [x] Checkpoint 6: 正则测试页面中间广告位正常显示
- [x] Checkpoint 7: 其他工具页面（如 JSON 格式化）底部广告位正常显示