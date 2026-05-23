-- v0.1 数据层完善 回滚脚本
-- 执行此脚本可将数据库恢复到 v0.1 之前的状态

DROP TABLE IF EXISTS sub_channels CASCADE;
ALTER TABLE channel_sources DROP COLUMN IF EXISTS sub_channel_id;
ALTER TABLE processed_news DROP COLUMN IF EXISTS sub_channel_id;
DROP INDEX IF EXISTS ix_processed_news_sub_published;
DROP INDEX IF EXISTS ix_raw_items_url;
