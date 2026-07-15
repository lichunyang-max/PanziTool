-- ============================================================================
-- V8: tool_likes 表添加 like_date 列 —— 点赞规则改为每自然天一次
-- ----------------------------------------------------------------------------
-- 背景：原唯一约束 (tool_id, anon_id) 限制同一匿名用户对同一工具终身
-- 仅能点赞一次。调整为 (tool_id, anon_id, like_date) 后，同一匿名用户
-- 每个自然天可对同一工具点赞一次。
--
-- 兼容性：H2（MODE=PostgreSQL）与 PostgreSQL 均支持以下语法。
-- ============================================================================

-- 1. 新增 like_date 列：记录点赞所在自然天，默认当前日期
ALTER TABLE tool_likes ADD COLUMN like_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. 删除旧唯一约束 (tool_id, anon_id)
ALTER TABLE tool_likes DROP CONSTRAINT IF EXISTS uk_tool_likes_tool_anon;

-- 3. 创建新唯一约束 (tool_id, anon_id, like_date)
ALTER TABLE tool_likes ADD CONSTRAINT uk_tool_likes_tool_anon_date
    UNIQUE (tool_id, anon_id, like_date);
