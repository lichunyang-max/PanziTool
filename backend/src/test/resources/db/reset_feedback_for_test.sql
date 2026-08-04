-- ============================================================================
-- 测试数据重置脚本：在每个 AdminIntegrationTest 留言相关测试方法前执行
-- ----------------------------------------------------------------------------
-- 清空 feedback_messages 表并重置 IDENTITY 序列，插入 3 条测试留言：
--   id=1: visible，无回复
--   id=2: visible，已有回复
--   id=3: hidden，无回复
-- ============================================================================

-- 清空现有留言
DELETE FROM feedback_messages;

-- 重置 IDENTITY 序列（H2 兼容语法），保证 id 从 1 开始
ALTER TABLE feedback_messages ALTER COLUMN id RESTART WITH 1;

-- 插入 3 条测试留言
INSERT INTO feedback_messages (content, nickname, contact, ip, status, admin_reply, reply_at, reply_by, created_at, updated_at)
VALUES ('测试留言1', '用户A', 'a@test.com', '127.0.0.1', 'visible', NULL, NULL, NULL, '2026-01-01 10:00:00', '2026-01-01 10:00:00');

INSERT INTO feedback_messages (content, nickname, contact, ip, status, admin_reply, reply_at, reply_by, created_at, updated_at)
VALUES ('测试留言2', '用户B', NULL, '192.168.1.1', 'visible', '已收到反馈', '2026-01-02 12:00:00', 'admin', '2026-01-02 11:00:00', '2026-01-02 12:00:00');

INSERT INTO feedback_messages (content, nickname, contact, ip, status, admin_reply, reply_at, reply_by, created_at, updated_at)
VALUES ('隐藏的留言', '用户C', NULL, '10.0.0.1', 'hidden', NULL, NULL, NULL, '2026-01-03 09:00:00', '2026-01-03 09:00:00');
