-- ============================================================================
-- V7: 将 tool_event_logs 和 tool_event_daily 的 tool_id 改为可空
-- ----------------------------------------------------------------------------
-- 背景：page_view 事件不携带 tool_slug，因此 tool_id 需要支持 NULL。
-- 同时移除外键约束以允许 tool_id 为 NULL 的行存在。
-- ============================================================================

-- 1. 移除 tool_event_logs 的 FK 约束，改为可空
ALTER TABLE tool_event_logs DROP CONSTRAINT IF EXISTS fk_tool_event_logs_tool;
ALTER TABLE tool_event_logs ALTER COLUMN tool_id DROP NOT NULL;

-- 2. 移除 tool_event_daily 的 FK 约束，改为可空
ALTER TABLE tool_event_daily DROP CONSTRAINT IF EXISTS fk_tool_event_daily_tool;
ALTER TABLE tool_event_daily ALTER COLUMN tool_id DROP NOT NULL;
