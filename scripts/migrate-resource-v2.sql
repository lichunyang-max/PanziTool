-- ============================================================================
-- 资源模块 v2 增量迁移：下载次数 / 点赞 / 描述
-- ----------------------------------------------------------------------------
-- 背景：resource_items 表已有数据，Hibernate ddl-auto=update 无法为非空表
--       添加 NOT NULL 无默认值的列（静默失败），需手动执行本脚本。
-- 用法（服务器上，postgres 为容器名，按实际替换）：
--   docker exec -i postgres psql -U root -d panzitooldb < migrate-resource-v2.sql
-- 或交互式执行：
--   docker exec -it postgres psql -U root -d panzitooldb
--   然后粘贴执行以下语句
-- 幂等：可重复执行（IF NOT EXISTS）
-- ============================================================================

-- 1. resource_items 新增三个字段（计数列带默认值 0，兼容已有行）
ALTER TABLE resource_items ADD COLUMN IF NOT EXISTS description varchar(500);
ALTER TABLE resource_items ADD COLUMN IF NOT EXISTS download_count bigint NOT NULL DEFAULT 0;
ALTER TABLE resource_items ADD COLUMN IF NOT EXISTS like_count bigint NOT NULL DEFAULT 0;

-- 2. 点赞记录表（(item_id, anon_id) 唯一约束防重复点赞）
CREATE TABLE IF NOT EXISTS resource_likes (
    id          BIGSERIAL PRIMARY KEY,
    item_id     BIGINT      NOT NULL,
    anon_id     VARCHAR(64) NOT NULL,
    created_at  TIMESTAMP   NOT NULL,
    CONSTRAINT uk_resource_like_item_anon UNIQUE (item_id, anon_id)
);

-- 3. 已点赞记录表的索引（加速重复点赞检查）
CREATE INDEX IF NOT EXISTS idx_resource_likes_item ON resource_likes (item_id);

-- 4. v3：目录图标、资源图标与标签（可空列，ddl-auto 也会自动追加，此处兜底）
ALTER TABLE resource_categories ADD COLUMN IF NOT EXISTS icon varchar(32);
ALTER TABLE resource_items ADD COLUMN IF NOT EXISTS icon varchar(32);
ALTER TABLE resource_items ADD COLUMN IF NOT EXISTS tags varchar(100);

-- 验证
-- \d resource_items
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'resource_items';
