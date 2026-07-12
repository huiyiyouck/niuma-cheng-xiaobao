import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";

export async function reclaimStaleTick(conn: PoolClient): Promise<void> {
  // v0.6.1: 使用 aiStaleTimeoutMs 替代 taskStaleSeconds（对齐 PRD §6.5）
  const staleSeconds = config.aiStaleTimeoutMs / 1000;

  await conn.query(
    `UPDATE tasks SET status = 'queued', locked_by = NULL, locked_at = NULL,
         run_after = now(), updated_at = now()
     WHERE status = 'running'
       AND locked_at < now() - make_interval(secs => $1)
       AND attempt < max_attempts`,
    [staleSeconds],
  );
  await conn.query(
    `UPDATE tasks SET status = 'failed', locked_by = NULL, locked_at = NULL, updated_at = now()
     WHERE status = 'running'
       AND locked_at < now() - make_interval(secs => $1)
       AND attempt >= max_attempts`,
    [staleSeconds],
  );

  // v0.6.1: 回收后同步更新 raw_items.l1_status（#DD12 修复）
  // 被回收的 l1_ai_process task 重新入队，对应的 raw_items.l1_status 从 processing 回到 queued
  await conn.query(
    `UPDATE raw_items SET l1_status = 'queued'
     WHERE id IN (
       SELECT raw_item_id FROM tasks
       WHERE status = 'queued'
         AND type = 'l1_ai_process'
         AND raw_item_id IS NOT NULL
     )
     AND l1_status = 'processing'`,
  );
}
