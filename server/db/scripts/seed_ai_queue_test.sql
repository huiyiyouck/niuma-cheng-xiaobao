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

-- 1b. 复用已完成条目重处理时复位我方补算列（2026-08-02 非单调核对修复：
--     旧 score_total 与 ai 重跑后的新 score_dimensions 并存会造成「四维高分却总分低」的非单调残留；
--     ai 按契约 O-1 不写 score_total，补算只填 NULL，故重入队时必须由本脚本复位）
UPDATE processed_news
SET score_total = NULL
WHERE raw_item_id IN (
  SELECT id FROM raw_items WHERE l1_status = 'queued' AND process_type = 'ai'
);

-- 2. 为 queued 的 ai raw_items 补建 l1_ai_process task（无活跃 task 才建，幂等）
--    max_attempts=3（契约 v1.4 §tasks，AI_MAX_RETRIES 默认）；run_after=now() 即刻可领
--    活跃态是 'running' 非 'processing'（契约 v1.6 6j：tasks.status='running'，'processing' 是 raw_items 列的值）
INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, attempt, max_attempts, created_at, updated_at)
SELECT 'l1_ai_process', ri.source_id, ri.id, 'queued', 0, now(), 0, 3, now(), now()
FROM raw_items ri
WHERE ri.l1_status = 'queued' AND ri.process_type = 'ai'
  AND NOT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.raw_item_id = ri.id AND t.type = 'l1_ai_process'
      AND t.status IN ('queued', 'running')
  );

-- 校验：应有待 ai claim 的 l1_ai_process queued task
SELECT 'queued l1_ai_process task = ' || count(*) AS seed_result
FROM tasks WHERE type = 'l1_ai_process' AND status = 'queued';
