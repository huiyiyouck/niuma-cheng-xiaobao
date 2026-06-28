import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { find } from "./fetchers/registry.ts";
import { NonRetryableError } from "./errors.ts";
import { policyMaxItems } from "./scheduler.ts";
import { processOne } from "./processor.ts";
import { createAlert, onFetchFailed } from "./monitor.ts";
import { classifyL0 } from "./l0-classifier.ts";
import { processL1 } from "./l1-processor.ts";
import { generateL1Alerts } from "./l1-monitor.ts";

const log = workerLogger;

// ── v0.6 退避配置（按 tasks.type 分支）───────────────────────

const BACKOFF_CONFIG: Record<string, { maxAttempts: number; backoff: number[] }> = {
  fetch:   { maxAttempts: 5, backoff: [10, 20, 40, 80, 160] },
  process: { maxAttempts: 5, backoff: [10, 20, 40, 80, 160] },
  l0_classify: { maxAttempts: 3, backoff: [60, 300, 900] },
  l1_process:  { maxAttempts: 3, backoff: [60, 300, 900] },
  // #D11：不创建 l1_retry task，手动重试走 l1_process + metadata
};

export function taskTypeForNewRawItem(sourceType: string): "process" | "l0_classify" {
  if (sourceType === "x_twitter" && config.aiProcessingEnabled) return "l0_classify";
  return "process";
}

// ── 构建 fetcher 配置 ────────────────────────────────────────

function buildFetchConfig(
  sourceType: string,
  identity: string,
  sourceConfig: Record<string, unknown>,
): Record<string, unknown> {
  if (sourceType === "x_twitter") {
    return {
      ...sourceConfig,
      mode: "user_timeline",
      usernames: [identity],
      max_results_per_user: 20,
      source_url: identity,
    };
  }
  return {
    ...sourceConfig,
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

// ── requeueTask（v0.6 改造：按 type 分支退避 + 终态处理）─────

async function requeueTask(conn: PoolClient, task: any, lastError: string, errorKind?: string): Promise<void> {
  const attempt = parseInt(task.attempt || "0");
  const cfg = BACKOFF_CONFIG[task.type] || BACKOFF_CONFIG.process;
  const maxAttempts = cfg.maxAttempts;

  if (maxAttempts > 0 && attempt >= maxAttempts) {
    // 达到重试上限 → 终态
    if (task.type === "l1_process") {
      await setL1FinalFailed(conn, task, lastError, errorKind);
    } else if (task.type === "l0_classify") {
      await setL0Failed(conn, task, lastError);
    }
    await finishTask(conn, task.id, "failed", lastError);
    return;
  }

  const tries = Math.max(0, attempt - 1);
  const delaySeconds = cfg.backoff[Math.min(tries, cfg.backoff.length - 1)];

  await conn.query(
    `UPDATE tasks SET status = 'queued', last_error = $2, last_error_kind = $4,
         run_after = now() + make_interval(secs => $3),
         locked_by = NULL, locked_at = NULL, updated_at = now()
     WHERE id = $1`,
    [task.id, lastError, delaySeconds, errorKind ?? null],
  );

  // 同步更新 raw_items 重试字段
  if ((task.type === "l0_classify" || task.type === "l1_process") && task.raw_item_id) {
    const field = task.type === "l0_classify" ? "l0_status" : "l1_status";
    const retryField = task.type === "l1_process" ? "l1_next_retry_at" : null;
    if (retryField) {
      await conn.query(
        `UPDATE raw_items SET ${retryField} = now() + make_interval(secs => $2) WHERE id = $1`,
        [task.raw_item_id, delaySeconds],
      );
    }
    await conn.query(
      `UPDATE raw_items SET ${field} = $2 WHERE id = $1`,
      [task.raw_item_id, task.type === "l0_classify" ? "retryable" : "retryable_failed"],
    );
  }
}

// ── L0/L1 终态设置 ──────────────────────────────────────────

async function setL0Failed(conn: PoolClient, task: any, error: string): Promise<void> {
  if (!task.raw_item_id) return;
  await conn.query(
    `UPDATE raw_items SET l0_status = 'failed', l0_error = $2, l0_processed_at = now() WHERE id = $1`,
    [task.raw_item_id, error],
  );
  log.warn("L0 FINAL FAILED raw_item_id=%s error=%s", task.raw_item_id, error.slice(0, 200));
}

async function setL1FinalFailed(conn: PoolClient, task: any, error: string, errorKind?: string): Promise<void> {
  if (!task.raw_item_id) return;
  await conn.query(
    `UPDATE raw_items SET l1_status = 'final_failed', l1_error = $2, l1_processed_at = now() WHERE id = $1`,
    [task.raw_item_id, error],
  );
  log.warn("L1 FINAL FAILED raw_item_id=%s kind=%s error=%s", task.raw_item_id, errorKind || "unknown", error.slice(0, 200));
}

// ── 抓取+入库（v0.5 已有，微调：L0 task 替代 process task）──

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
      const taskType = taskTypeForNewRawItem(row.source_type);
      await conn.query(
        `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, created_at, updated_at)
         VALUES($1, $2, $3, 'queued', 0, now(), now(), now())`,
        [taskType, row.source_id, inserted.id],
      );
    }
  }

  // 更新 source_states
  const cursor = { ...(row.cursor || {}), ...(cursorUpdates || {}) };
  await conn.query(
    `INSERT INTO source_states(source_id, cursor, consecutive_failures, last_success_at, last_error, last_fetch_count, updated_at)
     VALUES($1, $2::jsonb, 0, now(), NULL, $3, now())
     ON CONFLICT (source_id)
     DO UPDATE SET cursor = EXCLUDED.cursor, consecutive_failures = 0, last_success_at = now(),
         last_error = NULL, last_fetch_count = $3, updated_at = now()`,
    [sourceId, JSON.stringify(cursor), items.length],
  );

  await conn.query(
    `UPDATE sources SET lifecycle_status = 'normal'
     WHERE id = $1 AND lifecycle_status = 'source_error'`,
    [sourceId],
  );

  log.info("FETCH DONE  source=%s fetched=%d new=%d deduped=%d",
    row.source_name, items.length, newRawIds.length, items.length - newRawIds.length);
}

// ── Worker 主循环（v0.6 改造：5 claim 分支 + 3 sem）─────────

export async function workerLoop(
  pool: any,
  workerId: string,
  fetchSem: { acquire: () => Promise<boolean>; release: () => void },
  processSem: { acquire: () => Promise<boolean>; release: () => void },
  l1Sem: { acquire: () => Promise<boolean>; release: () => void },
): Promise<void> {
  const client = await pool.connect();
  try {
    let task: any = null;
    let taskType = "";
    let sem: { release: () => void } | null = null;

    // 优先级：fetch > process > l0_classify > l1_process
    // （#D11：不实现 l1_retry claim 分支）

    if (await fetchSem.acquire()) {
      task = await claimTask(client, workerId, "fetch");
      if (task) { taskType = "fetch"; sem = fetchSem; }
      else { fetchSem.release(); }
    }

    if (!task) {
      if (await processSem.acquire()) {
        task = await claimTask(client, workerId, "process");
        if (task) { taskType = "process"; sem = processSem; }
        else { processSem.release(); }
      }
    }

    // v0.6：l0_classify 复用 processSem（L0 体量小不会阻塞 process_raw_item）
    if (!task && config.aiProcessingEnabled) {
      if (await processSem.acquire()) {
        task = await claimTask(client, workerId, "l0_classify");
        if (task) { taskType = "l0_classify"; sem = processSem; }
        else { processSem.release(); }
      }
    }

    // v0.6：l1_process 独立 l1Sem（避免阻塞 RSS/jin10 process_raw_item）
    if (!task && config.aiProcessingEnabled) {
      if (await l1Sem.acquire()) {
        task = await claimTask(client, workerId, "l1_process");
        if (task) { taskType = "l1_process"; sem = l1Sem; }
        else { l1Sem.release(); }
      }
    }

    if (!task) return;

    try {
      log.info("TASK START  id=%s type=%s", task.id, taskType);
      if (taskType === "fetch") {
        await fetchAndIngest(client, task);
      } else if (taskType === "process") {
        await processOne(client, task);
      } else if (taskType === "l0_classify") {
        await classifyL0(client, task);
      } else if (taskType === "l1_process") {
        await processL1(client, task);
      }
      await finishTask(client, task.id, "succeeded", null);
      log.info("TASK DONE   id=%s type=%s status=succeeded", task.id, taskType);
    } catch (err: any) {
      const isNonRetryable = err instanceof NonRetryableError || err.name === "NonRetryableError";
      const errorKind = err.errorKind || classifyErrorKind(err, taskType);

      if (isNonRetryable) {
        log.error("TASK FAIL   id=%s type=%s reason=NonRetryableError kind=%s\n%s", task.id, taskType, errorKind, err.stack || err.message);
        if (taskType === "fetch") {
          await createAlert(client, task.source_id, null, "fetch_auth_failed", err.message, { task_id: task.id });
        } else if (taskType === "l0_classify" && task.raw_item_id) {
          await connQuery(client, `UPDATE raw_items SET l0_status = 'failed', l0_error = $2, l0_processed_at = now() WHERE id = $1`, [task.raw_item_id, err.message]);
        } else if (taskType === "l1_process" && task.raw_item_id) {
          await connQuery(client, `UPDATE raw_items SET l1_status = 'final_failed', l1_error = $2, l1_processed_at = now() WHERE id = $1`, [task.raw_item_id, err.message]);
        }
        await finishTask(client, task.id, "failed", err.message);
      } else {
        log.error("TASK FAIL   id=%s type=%s reason=retryable kind=%s\n%s", task.id, taskType, errorKind, err.stack || err.message);
        if (taskType === "fetch" && task.source_id) {
          await onFetchFailed(client, task, err.message);
        }
        await requeueTask(client, task, err.message, errorKind);
      }
    } finally {
      sem?.release();
    }
  } finally {
    client.release();
  }
}

// ── 错误分类（§4.5 对照表归一化）─────────────────────────────

function classifyErrorKind(err: Error, taskType: string): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("aborted")) return "network";
  if (msg.includes("429") || msg.includes("5xx") || msg.includes("retryable")) return taskType.startsWith("l") ? "llm" : "network";
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) return "auth";
  if (msg.includes("json") || msg.includes("parse") || msg.includes("unparseable")) return "parse";
  if (msg.includes("link_read") || msg.includes("link fetch")) return "link";
  if (msg.includes("kb") || msg.includes("库内")) return "kb";
  if (msg.includes("search") || msg.includes("x_api")) return taskType === "l1_process" ? "x_search" : "unknown";
  return "unknown";
}

// 小 helper：连接内快速 query（不抛错，用于降级更新）
async function connQuery(conn: PoolClient, sql: string, params: any[]): Promise<void> {
  try { await conn.query(sql, params); } catch { /* 降级：不阻塞主流程 */ }
}
