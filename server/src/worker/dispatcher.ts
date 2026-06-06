import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { find } from "./fetchers/registry.ts";
import { NonRetryableError } from "./errors.ts";
import { policyMaxItems } from "./scheduler.ts";
import { processOne } from "./processor.ts";
import { createAlert, onFetchFailed } from "./monitor.ts";

const log = workerLogger;

/** 构建 fetcher 需要的配置：根据 Source 类型适配 */
function buildFetchConfig(
  sourceType: string,
  identity: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (sourceType === "x_twitter") {
    return {
      ...config,
      mode: "user_timeline",
      usernames: [identity],
      max_results_per_user: 20,
      source_url: identity,
    };
  }
  return {
    ...config,
    source_url: identity,
  };
}

// ── Task 操作 ──────────────────────────────────────────────

async function claimTask(conn: PoolClient, workerId: string, taskType: string): Promise<any | null> {
  const { rows: [row] } = await conn.query(
    `WITH next_task AS (
       SELECT id FROM tasks
       WHERE status = 'queued' AND run_after <= now() AND type = $2
       ORDER BY priority DESC, created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE tasks
     SET status = 'running', locked_by = $1, locked_at = now(),
         attempt = attempt + 1, updated_at = now()
     WHERE id IN (SELECT id FROM next_task)
     RETURNING *`,
    [workerId, taskType],
  );
  return row ?? null;
}

async function finishTask(conn: PoolClient, taskId: string, status: string, lastError?: string | null): Promise<void> {
  await conn.query(
    "UPDATE tasks SET status = $2, last_error = $3, locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = $1",
    [taskId, status, lastError ?? null],
  );
}

async function requeueTask(conn: PoolClient, task: any, lastError: string): Promise<void> {
  const attempt = parseInt(task.attempt || "0");
  const maxAttempts = parseInt(task.max_attempts || "0");
  if (maxAttempts > 0 && attempt >= maxAttempts) {
    await finishTask(conn, task.id, "failed", lastError);
    return;
  }
  const tries = Math.max(0, attempt - 1);
  const delaySeconds = Math.min(300, 10 * (tries + 1));
  await conn.query(
    `UPDATE tasks SET status = 'queued', last_error = $2,
         run_after = now() + make_interval(secs => $3),
         locked_by = NULL, locked_at = NULL, updated_at = now()
     WHERE id = $1`,
    [task.id, lastError, delaySeconds],
  );
}

// ── 抓取+入库（v0.5: per-source 调度）────────────────────

async function fetchAndIngest(conn: PoolClient, task: any): Promise<void> {
  const sourceId = task.source_id;
  if (!sourceId) throw new Error("missing source_id");

  const { rows: [row] } = await conn.query(
    `SELECT s.id AS source_id, s.type AS source_type, s.display_name AS source_name,
            s.identity AS source_identity, s.fetch_interval_sec, s.max_items_per_fetch,
            s.compensation_interval_sec, s.config AS source_config,
            ss.cursor, ss.consecutive_failures
     FROM sources s
     LEFT JOIN source_states ss ON ss.source_id = s.id
     WHERE s.id = $1`,
    [sourceId],
  );
  if (!row) throw new Error("source not found");

  const maxItems = policyMaxItems(row);
  log.info("FETCH START source=%s type=%s max_items=%d", row.source_name, row.source_type, maxItems);

  let items: any[] = [];
  let cursorUpdates: any = null;

  const fetcher = find(row.source_type);
  if (!fetcher) throw new NonRetryableError(`未注册的 Source 类型：${row.source_type}`);

  // 构建抓取配置：根据 Source 类型适配 fetcher 需要的 config 格式
  const mergedConfig = buildFetchConfig(row.source_type, row.source_identity, row.source_config as Record<string, unknown> || {});
  const fetchResult = await fetcher.fetch(mergedConfig, row.cursor || {}, maxItems);
  items = fetchResult.items;
  cursorUpdates = fetchResult.cursorUpdates;

  let newRawIds: string[] = [];
  for (const item of items) {
    const { rows: [inserted] } = await conn.query(
      `INSERT INTO raw_items(source_id, source_item_id, source_item_url, published_at, content, fetched_at)
       VALUES($1, $2, $3, $4, $5::jsonb, now())
       ON CONFLICT (source_id, source_item_id) DO NOTHING
       RETURNING id`,
      [
        row.source_id,
        item.source_item_id,
        item.url || null,
        item.published_at || null,
        JSON.stringify(item.content || {}),
      ],
    );
    if (inserted) {
      newRawIds.push(inserted.id);
      // 创建 process task
      await conn.query(
        `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, created_at, updated_at)
         VALUES('process', $1, $2, 'queued', 0, now(), now(), now())`,
        [row.source_id, inserted.id],
      );
    }
  }

  // 更新 source_states（成功）
  const cursor = { ...(row.cursor || {}), ...(cursorUpdates || {}) };
  await conn.query(
    `INSERT INTO source_states(source_id, cursor, consecutive_failures, last_success_at, last_error, last_fetch_count, updated_at)
     VALUES($1, $2::jsonb, 0, now(), NULL, $3, now())
     ON CONFLICT (source_id)
     DO UPDATE SET cursor = EXCLUDED.cursor, consecutive_failures = 0, last_success_at = now(),
         last_error = NULL, last_fetch_count = $3, updated_at = now()`,
    [sourceId, JSON.stringify(cursor), items.length],
  );

  // 抓取成功后恢复 lifecycle_status（如果之前是 source_error）
  await conn.query(
    `UPDATE sources SET lifecycle_status = 'normal'
     WHERE id = $1 AND lifecycle_status = 'source_error'`,
    [sourceId],
  );

  log.info("FETCH DONE  source=%s fetched=%d new=%d deduped=%d",
    row.source_name, items.length, newRawIds.length, items.length - newRawIds.length);
}

// ── Worker 主循环 ──────────────────────────────────────────

export async function workerLoop(
  pool: any,
  workerId: string,
  fetchSem: { acquire: () => Promise<boolean>; release: () => void },
  processSem: { acquire: () => Promise<boolean>; release: () => void },
): Promise<void> {
  const client = await pool.connect();
  try {
    let task: any = null;
    let taskType = "";
    let sem: { release: () => void } | null = null;

    if (await fetchSem.acquire()) {
      task = await claimTask(client, workerId, "fetch");
      if (task) {
        taskType = "fetch";
        sem = fetchSem;
      } else {
        fetchSem.release();
      }
    }

    if (!task) {
      if (await processSem.acquire()) {
        task = await claimTask(client, workerId, "process");
        if (task) {
          taskType = "process";
          sem = processSem;
        } else {
          processSem.release();
        }
      }
    }

    if (!task) return;

    try {
      log.info("TASK START  id=%s type=%s", task.id, taskType);
      if (taskType === "fetch") {
        await fetchAndIngest(client, task);
      } else {
        await processOne(client, task);
      }
      await finishTask(client, task.id, "succeeded", null);
      log.info("TASK DONE   id=%s type=%s status=succeeded", task.id, taskType);
    } catch (err: any) {
      if (err instanceof NonRetryableError || err.name === "NonRetryableError") {
        log.error("TASK FAIL   id=%s type=%s reason=NonRetryableError\n%s", task.id, taskType, err.stack || err.message);
        if (taskType === "fetch") {
          await createAlert(client, task.source_id, null, "fetch_auth_failed", err.message, { task_id: task.id });
        }
        await finishTask(client, task.id, "failed", err.message);
      } else {
        log.error("TASK FAIL   id=%s type=%s reason=retryable\n%s", task.id, taskType, err.stack || err.message);
        if (taskType === "fetch" && task.source_id) {
          await onFetchFailed(client, task, err.message);
        }
        await requeueTask(client, task, err.message);
      }
    } finally {
      sem?.release();
    }
  } finally {
    client.release();
  }
}
