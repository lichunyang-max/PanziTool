-- 补充种子数据：cron 表达式工具（V15 可能因数据重建丢失）
INSERT INTO tools (slug, name, category, keywords, description, enabled, use_count, like_count, created_at, updated_at)
SELECT 'cron', 'Cron表达式工具', 'developer', 'cron,定时,表达式,任务调度', 'Cron表达式解析、校验、中文解释与触发时间预览工具', true, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE slug = 'cron');
