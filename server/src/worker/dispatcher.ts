import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { find } from "./fetchers/registry.ts";
import { NonRetryableError } from "./errors.ts";
import { policyMaxItems } from "./scheduler.ts";
import { processOne } from "./processor.ts";
import { createAlert, onFetchFailed } from "./monitor.ts";

const log = workerLogger;

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

// ── 抓取+入库 ──────────────────────────────────────────────

async function fetchAndIngest(conn: PoolClient, task: any): Promise<void> {
  const channelSourceId = task.channel_source_id;
  if (!channelSourceId) throw new Error("missing channel_source_id");

  const { rows: [row] } = await conn.query(
    `SELECT cs.channel_space_id, cs.fetch_policy, s.id as source_id, s.type as source_type,
            s.display_name as source_name, s.source_url, s.config as source_config, ss.cursor, ss.consecutive_failures
     FROM channel_sources cs
     JOIN sources s ON s.id = cs.source_id
     LEFT JOIN source_states ss ON ss.channel_source_id = cs.id
     WHERE cs.id = $1`,
    [channelSourceId],
  );
  if (!row) throw new Error("channel_source not found");

  const maxItems = policyMaxItems(row.fetch_policy);
  log.info("FETCH START source=%s type=%s max_items=%d", row.source_name, row.source_type, maxItems);

  let items: any[] = [];
  let cursorUpdates: any = null;

  const fetcher = find(row.source_type);
  if (!fetcher) throw new NonRetryableError(`未注册的 Source 类型：${row.source_type}`);
  // v0.4: 将 source_url 合并进 config，Fetcher（如 RSS）依赖此字段
  const mergedConfig: Record<string, unknown> = {
    ...(row.source_config as Record<string, unknown> || {}),
    source_url: row.source_url,
  };
  const fetchResult = await fetcher.fetch(mergedConfig, row.cursor || {}, maxItems);
  items = fetchResult.items;
  cursorUpdates = fetchResult.cursorUpdates;

  let newRawIds: string[] = [];
  for (const item of items) {
    const { rows: [inserted] } = await conn.query(
      `INSERT INTO raw_items(channel_space_id, source_id, source_item_id, source_item_url, published_at, content, created_at)
       VALUES($1, $2, $3, $4, $5, $6::jsonb, now())
       ON CONFLICT (source_id, source_item_id) DO NOTHING
       RETURNING id`,
      [
        row.channel_space_id,
        row.source_id,
        item.source_item_id,
        item.url || null,
        item.published_at || null,
        JSON.stringify(item.content || {}),
      ],
    );
    if (inserted) {
      newRawIds.push(inserted.id);
      await conn.query(
        `INSERT INTO tasks(type, channel_space_id, raw_item_id, status, priority, run_after, created_at, updated_at)
         VALUES('process', $1, $2, 'queued', 0, now(), now(), now())`,
        [row.channel_space_id, inserted.id],
      );
    }
  }

  const cursor = { ...(row.cursor || {}), ...(cursorUpdates || {}) };
  await conn.query(
    `INSERT INTO source_states(channel_source_id, cursor, consecutive_failures, last_success_at, last_error, updated_at)
     VALUES($1, $2::jsonb, 0, now(), NULL, now())
     ON CONFLICT (channel_source_id)
     DO UPDATE SET cursor = EXCLUDED.cursor, consecutive_failures = 0, last_success_at = now(),
         last_error = NULL, updated_at = now()`,
    [channelSourceId, JSON.stringify(cursor)],
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
          await createAlert(client, task.channel_space_id, "fetch_auth_failed", err.message, { task_id: task.id });
        }
        await finishTask(client, task.id, "failed", err.message);
      } else {
        log.error("TASK FAIL   id=%s type=%s reason=retryable\n%s", task.id, taskType, err.stack || err.message);
        if (taskType === "fetch" && task.channel_source_id) {
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
