-- v0.5 Schema Restructure Migration
-- Generated manually for Drizzle ORM
--
-- 变更总览：
--   10 表变更 + 3 新表 + 1 表废弃（channel_sources）
--   先执行业务数据清理脚本，再执行此迁移

-- ============================================================
-- 1. ALTER channel_spaces: 新增 sort_order, icon
-- ============================================================
ALTER TABLE channel_spaces
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📁';

-- ============================================================
-- 2. RENAME sub_channels → channels（保留所有数据/索引/约束）
-- ============================================================
ALTER TABLE sub_channels RENAME TO channels;

-- 重命名 FK 约束（PostgreSQL 自动跟随重命名，但显式处理更安全）
ALTER INDEX IF EXISTS uq_sub_channels_space_name RENAME TO uq_channels_space_name;
ALTER INDEX IF EXISTS ix_sub_channels_space_sort RENAME TO ix_channels_space_sort;

-- ============================================================
-- 3. ALTER sources: 大幅扩展字段
-- ============================================================
-- 先重命名 source_url → identity
ALTER TABLE sources RENAME COLUMN source_url TO identity;

-- 重命名 status → lifecycle_status，然后修改 CHECK 约束
ALTER TABLE sources RENAME COLUMN status TO lifecycle_status;

-- 修改 lifecycle_status 列定义和默认值
ALTER TABLE sources
  ALTER COLUMN lifecycle_status SET DEFAULT 'normal',
  ALTER COLUMN lifecycle_status TYPE VARCHAR(20);

-- 新增字段（全部 nullable 先，后续由应用填充）
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS domain_tags JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_role VARCHAR(20) NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS content_topics JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attention_level VARCHAR(20) NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS fetch_interval_sec INTEGER,
  ADD COLUMN IF NOT EXISTS max_items_per_fetch INTEGER,
  ADD COLUMN IF NOT EXISTS compensation_interval_sec INTEGER DEFAULT 86400;

-- 去重索引（LOWER(identity) 唯一）
CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_type_identity ON sources(type, LOWER(identity));

-- ============================================================
-- 4. CREATE display_positions（替代 channel_sources）
-- ============================================================
CREATE TABLE IF NOT EXISTS display_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  channel_space_id UUID NOT NULL REFERENCES channel_spaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  removal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, channel_space_id, channel_id)
);

-- 部分唯一索引：防止根节点重复（NULL != NULL 在 UNIQUE 中）
CREATE UNIQUE INDEX IF NOT EXISTS uq_dp_source_space_root
  ON display_positions(source_id, channel_space_id)
  WHERE channel_id IS NULL AND deleted_at IS NULL;

-- 性能索引
CREATE INDEX IF NOT EXISTS ix_dp_source_enabled
  ON display_positions(source_id, enabled, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_dp_space_channel
  ON display_positions(channel_space_id, channel_id, deleted_at)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 5. ALTER source_states: channel_source_id → source_id（UNIQUE）
-- ============================================================
-- 先删除旧约束
ALTER TABLE source_states
  DROP CONSTRAINT IF EXISTS source_states_channel_source_id_fkey CASCADE;

ALTER TABLE source_states
  DROP COLUMN IF EXISTS channel_source_id;

-- 新增 source_id 列
ALTER TABLE source_states
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id) ON DELETE CASCADE;

-- 唯一约束：per-source 状态
ALTER TABLE source_states
  ADD CONSTRAINT uq_source_states_source_id UNIQUE (source_id);

-- 新增 last_fetch_count
ALTER TABLE source_states
  ADD COLUMN IF NOT EXISTS last_fetch_count INTEGER;

-- 索引重命名/创建
DROP INDEX IF EXISTS ix_source_states_next_fetch_at;
CREATE INDEX IF NOT EXISTS ix_source_states_next_fetch ON source_states(next_fetch_at);

-- ============================================================
-- 6. ALTER raw_items: 移除 channel_space_id, 新增 fetched_at
-- ============================================================
ALTER TABLE raw_items
  DROP CONSTRAINT IF EXISTS raw_items_channel_space_id_fkey CASCADE;

ALTER TABLE raw_items
  DROP COLUMN IF EXISTS channel_space_id;

ALTER TABLE raw_items
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 更新索引
DROP INDEX IF EXISTS ix_raw_items_space_published;
CREATE INDEX IF NOT EXISTS ix_raw_items_source_published ON raw_items(source_id, published_at);
CREATE INDEX IF NOT EXISTS ix_raw_items_url ON raw_items(source_item_url) WHERE source_item_url IS NOT NULL;

-- ============================================================
-- 7. ALTER processed_news: 移除 channel_space_id 和 channel_id
-- ============================================================
ALTER TABLE processed_news
  DROP CONSTRAINT IF EXISTS processed_news_channel_space_id_fkey CASCADE;

ALTER TABLE processed_news
  DROP COLUMN IF EXISTS channel_space_id;

ALTER TABLE processed_news
  DROP COLUMN IF EXISTS sub_channel_id;

-- 更新索引
DROP INDEX IF EXISTS ix_processed_news_space_published;
DROP INDEX IF EXISTS ix_processed_news_sub_published;
CREATE INDEX IF NOT EXISTS ix_processed_news_published ON processed_news(published_at);

-- ============================================================
-- 8. CREATE news_positions（新 m:n 关联表）
-- ============================================================
CREATE TABLE IF NOT EXISTS news_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES processed_news(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES display_positions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (news_id, position_id)
);

CREATE INDEX IF NOT EXISTS ix_np_position_news ON news_positions(position_id, news_id);
CREATE INDEX IF NOT EXISTS ix_np_news ON news_positions(news_id);

-- ============================================================
-- 9. ALTER tasks: 移除 channel_space_id/channel_source_id, 新增 source_id
-- ============================================================
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_channel_space_id_fkey CASCADE;

ALTER TABLE tasks
  DROP COLUMN IF EXISTS channel_space_id;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_channel_source_id_fkey CASCADE;

ALTER TABLE tasks
  DROP COLUMN IF EXISTS channel_source_id;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id) ON DELETE CASCADE;

-- ============================================================
-- 10. ALTER alerts: channel_space_id nullable, 新增字段
-- ============================================================
ALTER TABLE alerts
  DROP CONSTRAINT IF EXISTS alerts_channel_space_id_fkey CASCADE;

-- 将 channel_space_id 改为 nullable
ALTER TABLE alerts
  ALTER COLUMN channel_space_id DROP NOT NULL;

ALTER TABLE alerts
  ADD CONSTRAINT alerts_channel_space_id_fkey
    FOREIGN KEY (channel_space_id) REFERENCES channel_spaces(id) ON DELETE SET NULL;

-- 新增字段
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'source',
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedup_key TEXT,
  ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 更新索引
DROP INDEX IF EXISTS ix_alerts_space_created;
CREATE INDEX IF NOT EXISTS ix_alerts_scope_source ON alerts(scope, source_id, status);
CREATE INDEX IF NOT EXISTS ix_alerts_unread ON alerts(status, created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS ix_alerts_dedup ON alerts(dedup_key) WHERE status = 'active';

-- ============================================================
-- 11. CREATE source_identity_history（新表）
-- ============================================================
CREATE TABLE IF NOT EXISTS source_identity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  old_identity TEXT NOT NULL,
  new_identity TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. DROP channel_sources（废弃表）
-- ============================================================
DROP TABLE IF EXISTS channel_sources CASCADE;
