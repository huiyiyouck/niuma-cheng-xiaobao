import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

export function policyMaxItems(source: any): number {
  if (typeof source.max_items_per_fetch === "number" && source.max_items_per_fetch > 0) {
    return source.max_items_per_fetch;
  }
  return config.defaultMaxItemsPerRun;
}

export function policyEverySeconds(source: any): number {
  if (typeof source.fetch_interval_sec === "number" && source.fetch_interval_sec > 0) {
    return source.fetch_interval_sec;
  }
  return config.defaultFetchEverySeconds;
}

/**
 * v0.5: per-source 调度
 * 查询 lifecycle_status='normal' 且有启用 display_position 的 Source
 * 为每个到期的 Source 创建 fetch task
 */
export async function schedulerTick(conn: PoolClient): Promise<void> {
  const { rows } = await conn.query(
    `SELECT s.id AS source_id, s.type, s.fetch_interval_sec, s.max_items_per_fetch,
            s.compensation_interval_sec, s.config,
            ss.id AS state_id, ss.next_fetch_at
     FROM sources s
     LEFT JOIN source_states ss ON ss.source_id = s.id
     WHERE s.lifecycle_status = 'normal'
       AND s.type != 'x_twitter'
       AND EXISTS(
         SELECT 1 FROM display_positions dp
         WHERE dp.source_id = s.id AND dp.enabled = true AND dp.deleted_at IS NULL
       )
       AND (ss.next_fetch_at IS NULL OR ss.next_fetch_at <= now())`,
  );

  const now = new Date();
  for (const r of rows) {
    if (r.next_fetch_at && new Date(r.next_fetch_at) > now) continue;

    // 检查是否已有排队/运行中的 fetch task
    const { rows: [exists] } = await conn.query(
      `SELECT 1 FROM tasks
       WHERE status IN ('queued', 'running') AND type = 'fetch' AND source_id = $1
       LIMIT 1`,
      [r.source_id],
    );
    if (exists) continue;

    const everySeconds = policyEverySeconds(r);

    // 创建 fetch task
    await conn.query(
      `INSERT INTO tasks(type, source_id, status, priority, run_after, created_at, updated_at)
       VALUES('fetch', $1, 'queued', 0, now(), now(), now())`,
      [r.source_id],
    );
    log.debug("SCHEDULER enqueued fetch source_id=%s type=%s", r.source_id, r.type);

    // 更新 next_fetch_at
    const nextFetch = new Date(now.getTime() + everySeconds * 1000);
    await conn.query(
      `INSERT INTO source_states(source_id, cursor, next_fetch_at, consecutive_failures, updated_at)
       VALUES($1, '{}'::jsonb, $2, 0, now())
       ON CONFLICT (source_id)
       DO UPDATE SET next_fetch_at = $2, updated_at = now()`,
      [r.source_id, nextFetch.toISOString()],
    );
  }
}
