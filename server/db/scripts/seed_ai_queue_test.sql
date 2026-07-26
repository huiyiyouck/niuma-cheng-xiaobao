-- REQ-003 R-4：news_test 造数脚本 —— 造出 process_type='ai' + l1_status='queued' 供 ai_worker claim 冒烟
--
-- 背景：ai_worker 按契约只有 raw_items SELECT + 部分列 UPDATE，无 INSERT，无法自造待处理条目。
--       本脚本由 xiaobao 侧（表 owner news）执行，为 ai 侧 DB 模式冒烟预置队列。
-- 用法：psql "postgresql://news:news@localhost:5432/news_test" -f seed_ai_queue_test.sql
-- 幂等：可重复执行；每次把最近 N 条 x_twitter（真实 content）reset 为待处理 queued。
-- 注意：仅 news_test，切勿对生产 news 执行。系统当前只有 x_twitter 数据（rss/jin10_flash 无 raw_items）。

\set N 5

UPDATE raw_items
SET l1_status = 'queued', l1_error = NULL, l1_processed_at = NULL, l1_attempt = 0
WHERE id IN (
  SELECT ri.id FROM raw_items ri
  JOIN sources s ON s.id = ri.source_id
  WHERE s.type = 'x_twitter' AND ri.process_type = 'ai'
  ORDER BY ri.published_at DESC
  LIMIT :N
);

-- 校验：应有 N 条待 ai claim
SELECT 'queued(ai) 条目数 = ' || count(*) AS seed_result
FROM raw_items WHERE l1_status = 'queued' AND process_type = 'ai';
