-- v0.6.1 数据库迁移（人工 SQL，不走 drizzle-kit generate）
-- 对应设计文档: docs/progress/iterations/v0.6.1-design.md §6.1
-- 前置: v0.6 已部署（0005_v0.6_l0_l1_schema.sql 已执行）

-- ═══════════════════════════════════════════════════════════════
-- 1. raw_items 新增 process_type 列
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE raw_items
  ADD COLUMN IF NOT EXISTS process_type varchar(20) NOT NULL DEFAULT 'ai';

-- ═══════════════════════════════════════════════════════════════
-- 2. 索引调整
-- ═══════════════════════════════════════════════════════════════

-- AI 待处理队列索引（供 ai_worker 轮询 claim）
CREATE INDEX IF NOT EXISTS ix_raw_items_ai_queue
  ON raw_items (l1_status, published_at)
  WHERE process_type = 'ai' AND l1_status IN ('queued', 'retryable_failed');

-- 直显类快速查询索引
CREATE INDEX IF NOT EXISTS ix_raw_items_direct_published
  ON raw_items (source_id, published_at DESC)
  WHERE process_type = 'direct';

-- ═══════════════════════════════════════════════════════════════
-- 3. 触发器：processed_news 插入后自动关联 news_positions
--    SECURITY DEFINER + search_path 锁定（#D1 修复）
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- 4. 数据回填：非 X 源改为 direct 类
--    分批执行，每批 1000 条（CTE 包装，#DD13 修复）
-- ═══════════════════════════════════════════════════════════════

-- 一次性执行（数据量小，无需分批循环）
UPDATE raw_items ri
SET process_type = CASE
  WHEN s.type = 'x_twitter' THEN 'ai'
  ELSE 'direct'
END
FROM sources s
WHERE s.id = ri.source_id
  AND ri.process_type = 'ai';

-- ═══════════════════════════════════════════════════════════════
-- 5. ai_worker 角色与权限（§2.5，ADR-008）
--    注意：AI_WORKER_DB_PASSWORD 需替换为实际密码
-- ═══════════════════════════════════════════════════════════════

-- 创建角色（如不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_worker') THEN
    CREATE ROLE ai_worker WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
  END IF;
END
$$;

-- 连接权限
-- 注意：GRANT CONNECT ON DATABASE 不支持 current_database() 函数，需用动态 SQL
DO $$
DECLARE db_name text;
BEGIN
  SELECT current_database() INTO db_name;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO ai_worker', db_name);
END
$$;
GRANT USAGE ON SCHEMA public TO ai_worker;

-- 安全加固：禁止 ai_worker 建表（#D8 修复）
REVOKE CREATE ON SCHEMA public FROM ai_worker;

-- raw_items：只读指定列 + 可更新 l1_status / l1_error / l1_processed_at / l1_attempt
-- 注意：language 列在 processed_news 上，不在 raw_items 上（#DD5 修复）
GRANT SELECT (id, source_id, content, published_at, l0_status, l1_status, l1_attempt, process_type)
  ON raw_items TO ai_worker;
GRANT UPDATE (l1_status, l1_error, l1_processed_at, l1_attempt)
  ON raw_items TO ai_worker;

-- processed_news：可读写（AI 类结果写入）
GRANT SELECT, INSERT, UPDATE
  ON processed_news TO ai_worker;

-- sources：只读
GRANT SELECT (id, type, identity, config) ON sources TO ai_worker;

-- tasks：可 claim / 更新状态（#DD2 修复：追加 updated_at 列）
GRANT SELECT, UPDATE (status, locked_by, locked_at, attempt, updated_at, last_error, last_error_kind)
  ON tasks TO ai_worker;

-- 禁止 ai_worker 写 news_positions（由 SECURITY DEFINER 触发器代写）
REVOKE INSERT, UPDATE, DELETE ON news_positions FROM ai_worker;

-- 禁止 ai_worker 访问其他表
REVOKE ALL ON source_states FROM ai_worker;
REVOKE ALL ON alerts FROM ai_worker;
REVOKE ALL ON channel_spaces FROM ai_worker;
REVOKE ALL ON display_positions FROM ai_worker;

-- ═══════════════════════════════════════════════════════════════
-- 回滚脚本（如需回退）
-- ═══════════════════════════════════════════════════════════════
-- DROP TRIGGER IF EXISTS trg_processed_news_auto_link ON processed_news;
-- DROP FUNCTION IF EXISTS auto_link_news_position();
-- DROP INDEX IF EXISTS ix_raw_items_ai_queue;
-- DROP INDEX IF EXISTS ix_raw_items_direct_published;
-- ALTER TABLE raw_items DROP COLUMN IF EXISTS process_type;
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ai_worker;
-- DROP ROLE IF EXISTS ai_worker;
