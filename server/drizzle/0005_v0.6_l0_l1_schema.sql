-- v0.6 L0/L1 Schema Migration
-- 手动生成（本地无 PostgreSQL，无法运行 drizzle-kit generate）
--
-- 变更总览：
--   raw_items ×9 列（L0/L1 状态字段）+ 2 部分索引
--   processed_news ×6 列（L1 输出字段）
--   channel_spaces ×2 列（图标上传）
--   tasks ×1 列（last_error_kind）
--   #D12 历史保护 DML

-- ============================================================
-- 1. ALTER raw_items: L0/L1 状态字段（§2.1）
-- ============================================================
ALTER TABLE raw_items
  ADD COLUMN IF NOT EXISTS l0_status         varchar(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS l0_label          varchar(50),
  ADD COLUMN IF NOT EXISTS l0_processed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS l0_error          text,
  ADD COLUMN IF NOT EXISTS l1_status         varchar(30) NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS l1_error          text,
  ADD COLUMN IF NOT EXISTS l1_attempt        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS l1_next_retry_at  timestamptz,
  ADD COLUMN IF NOT EXISTS l1_processed_at   timestamptz;
--> statement-breakpoint

-- L0/L1 队列索引
CREATE INDEX IF NOT EXISTS ix_raw_items_l0_queue
  ON raw_items(l0_status, l1_status, published_at)
  WHERE l0_status = 'passed' AND l1_status = 'not_started';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_raw_items_l1_queue
  ON raw_items(l1_status, l1_next_retry_at, published_at)
  WHERE l1_status IN ('queued', 'retryable_failed');
--> statement-breakpoint

-- ============================================================
-- 2. ALTER processed_news: L1 输出字段（§2.2, ADR-003 jsonb 增量）
-- ============================================================
ALTER TABLE processed_news
  ADD COLUMN IF NOT EXISTS translation       jsonb,
  ADD COLUMN IF NOT EXISTS context           jsonb,
  ADD COLUMN IF NOT EXISTS analysis          text,
  ADD COLUMN IF NOT EXISTS score_total       numeric,
  ADD COLUMN IF NOT EXISTS score_dimensions  jsonb,
  ADD COLUMN IF NOT EXISTS tags_v2           jsonb;
--> statement-breakpoint

-- ============================================================
-- 3. ALTER channel_spaces: 图标上传（§2.3）
-- ============================================================
ALTER TABLE channel_spaces
  ADD COLUMN IF NOT EXISTS icon_url   text,
  ADD COLUMN IF NOT EXISTS icon_type  varchar(20) NOT NULL DEFAULT 'emoji';
--> statement-breakpoint

-- ============================================================
-- 4. ALTER tasks: 错误来源归一化（§2.4, 响应 Tester #T3）
-- ============================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS last_error_kind varchar(30);
--> statement-breakpoint

-- ============================================================
-- 5. #D12 历史保护 DML（补 §4.3.6 引用缺口）
--    将 v0.5 已处理 raw_items 的 l1_status 置为 'completed'，
--    避免 L1 worker 重新处理存量数据
-- ============================================================
UPDATE raw_items
   SET l1_status = 'completed',
       l1_processed_at = now()
 WHERE id IN (SELECT raw_item_id FROM processed_news)
   AND l1_status = 'not_started';
