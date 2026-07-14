-- v0.6.1 DDL only（不含角色创建和 GRANT，用于测试库和 deploy.sh 迁移）
-- 用途说明：
--   本文件：DDL + 索引 + 触发器，用于测试环境（不需要 ai_worker 角色）和 deploy.sh 自动迁移
--   v0.6.1_ai_contract.sql：完整版，含 DDL + 触发器 + ai_worker 角色 + 列级 GRANT + REVOKE + 数据回填 + 回滚脚本，用于生产环境
ALTER TABLE raw_items
  ADD COLUMN IF NOT EXISTS process_type varchar(20) NOT NULL DEFAULT 'ai';

CREATE INDEX IF NOT EXISTS ix_raw_items_ai_queue
  ON raw_items (l1_status, published_at)
  WHERE process_type = 'ai' AND l1_status IN ('queued', 'retryable_failed');

CREATE INDEX IF NOT EXISTS ix_raw_items_direct_published
  ON raw_items (source_id, published_at DESC)
  WHERE process_type = 'direct';

CREATE OR REPLACE FUNCTION auto_link_news_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO news_positions (news_id, position_id, created_at)
  SELECT NEW.id, dp.id, now()
  FROM display_positions dp
  JOIN raw_items ri ON ri.id = NEW.raw_item_id
  WHERE dp.source_id = ri.source_id
    AND dp.enabled = true
    AND dp.deleted_at IS NULL
  ON CONFLICT (news_id, position_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_processed_news_auto_link ON processed_news;
CREATE TRIGGER trg_processed_news_auto_link
AFTER INSERT ON processed_news
FOR EACH ROW
EXECUTE FUNCTION auto_link_news_position();
