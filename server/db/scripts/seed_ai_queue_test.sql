-- REQ-003 R-4：news_test 造数脚本 —— 造出待 ai claim 的 l1_ai_process task（+ 对应 raw_items queued）
--
-- 背景：ai 按契约 v1.4 只 claim tasks（type='l1_ai_process'）、不扫 raw_items。
--   2026-07-28 ai DevOps 实测发现初版脚本只 reset raw_items.l1_status='queued' 却未建 task 行
--   → ai 永远领不到（C-5「有货无 task」形态）。本版修正：reset raw_items 的同时补建对应
--   l1_ai_process task 行（字段照后端 server/src/worker/l0-classifier.ts:195 建法）。
-- 用法：psql "postgresql://news:news@localhost:5432/news_test" -f seed_ai_queue_test.sql
-- 幂等：可重复执行（补建仅在无活跃 task 时）。仅 news_test，切勿对生产 news 执行。

\set N 5

-- 1. 取最近 N 条 x_twitter(process_type='ai') reset 为待处理
UPDATE raw_items
SET l1_status = 'queued', l1_error = NULL, l1_processed_at = NULL, l1_attempt = 0
WHERE id IN (
  SELECT ri.id FROM raw_items ri
  JOIN sources s ON s.id = ri.source_id
  WHERE s.type = 'x_twitter' AND ri.process_type = 'ai'
  ORDER BY ri.published_at DESC
  LIMIT :N
);

-- 2. 为 queued 的 ai raw_items 补建 l1_ai_process task（无活跃 task 才建，幂等）
--    max_attempts=3（契约 v1.4 §tasks，AI_MAX_RETRIES 默认）；run_after=now() 即刻可领
INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, attempt, max_attempts, created_at, updated_at)
SELECT 'l1_ai_process', ri.source_id, ri.id, 'queued', 0, now(), 0, 3, now(), now()
FROM raw_items ri
WHERE ri.l1_status = 'queued' AND ri.process_type = 'ai'
  AND NOT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.raw_item_id = ri.id AND t.type = 'l1_ai_process'
      AND t.status IN ('queued', 'processing')
  );

-- 校验：应有待 ai claim 的 l1_ai_process queued task
SELECT 'queued l1_ai_process task = ' || count(*) AS seed_result
FROM tasks WHERE type = 'l1_ai_process' AND status = 'queued';
