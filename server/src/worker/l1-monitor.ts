import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { createAlert } from "./monitor.ts";

const log = workerLogger;

// ── AC-32 告警生成 ──────────────────────────────────────────

/**
 * 在每次 workerLoop 完成一个 tick 后调用（或在独立 monitor 循环中调用）。
 * 检查 4 类 v0.6 新增告警条件，按需创建告警。
 */
export async function generateL1Alerts(conn: PoolClient): Promise<void> {
  await checkTaskStale(conn);
  await checkExternalDepDown(conn);
  await checkTaskBacklog(conn);
  await checkFinalFailedSurge(conn);
}

// ── task_stale：locked 任务卡住 > TASK_STALE_SECONDS ─────────

async function checkTaskStale(conn: PoolClient): Promise<void> {
  const { rows } = await conn.query(
    `SELECT t.id, t.type, t.source_id, t.raw_item_id, t.locked_at, t.locked_by
     FROM tasks t
     WHERE t.status = 'running'
       AND t.locked_at < now() - make_interval(secs => $1)
       AND t.type IN ('l0_classify', 'l1_process')`,
    [config.taskStaleSeconds],
  );

  for (const r of rows) {
    const dedupKey = `task_stale:${r.id}`;
    const msg = `Task ${r.id} (type=${r.type}) 被 ${r.locked_by} 持有超过 ${config.taskStaleSeconds}s`;
    await createAlert(
      conn,
      r.source_id,
      null,
      "task_stale",
      msg,
      { task_id: r.id, raw_item_id: r.raw_item_id, locked_by: r.locked_by },
      "source",
      "warning",
      dedupKey,
    );
    log.warn("ALERT task_stale task_id=%s", r.id);
  }
}

// ── external_dep_down：连续 N 条同一 last_error_kind 失败 ────

async function checkExternalDepDown(conn: PoolClient): Promise<void> {
  const threshold = 5; // 连续失败阈值
  const { rows } = await conn.query(
    `SELECT last_error_kind, count(*) AS cnt
     FROM tasks
     WHERE status = 'failed'
       AND last_error_kind IS NOT NULL
       AND last_error_kind IN ('llm', 'kb', 'link', 'x_search', 'web_search', 'network', 'auth')
       AND updated_at > now() - interval '15 minutes'
     GROUP BY last_error_kind
     HAVING count(*) >= $1`,
    [threshold],
  );

  for (const r of rows) {
    const dedupKey = `external_dep_down:${r.last_error_kind}`;
    const msg = `外部依赖 ${r.last_error_kind} 最近 15 分钟连续失败 ${r.cnt} 次`;
    await createAlert(
      conn,
      null,
      null,
      "external_dep_down",
      msg,
      { error_kind: r.last_error_kind, count: r.cnt, window: "15m" },
      "source",
      "critical",
      dedupKey,
    );
    log.warn("ALERT external_dep_down kind=%s count=%d", r.last_error_kind, r.cnt);
  }
}

// ── task_backlog：raw_items 排队数 > 阈值 ────────────────────

async function checkTaskBacklog(conn: PoolClient): Promise<void> {
  const threshold = 100;
  const { rows: [row] } = await conn.query(
    `SELECT count(*) AS cnt FROM raw_items
     WHERE l0_status = 'passed' AND l1_status = 'not_started'`,
  );

  const cnt = parseInt(row?.cnt || "0");
  if (cnt >= threshold) {
    const dedupKey = "task_backlog";
    await createAlert(
      conn,
      null,
      null,
      "task_backlog",
      `L1 待处理队列积压 ${cnt} 条（阈值 ${threshold}）`,
      { queued_count: cnt, threshold },
      "source",
      "warning",
      dedupKey,
    );
    log.warn("ALERT task_backlog count=%d", cnt);
  }
}

// ── final_failed_surge：final_failed 增长异常 ────────────────

async function checkFinalFailedSurge(conn: PoolClient): Promise<void> {
  const threshold = 10; // 1 小时内超过此数视为异常增长
  const { rows: [row] } = await conn.query(
    `SELECT count(*) AS cnt FROM raw_items
     WHERE l1_status = 'final_failed'
       AND l1_processed_at > now() - interval '1 hour'`,
  );

  const cnt = parseInt(row?.cnt || "0");
  if (cnt >= threshold) {
    const dedupKey = "final_failed_surge";
    await createAlert(
      conn,
      null,
      null,
      "final_failed_surge",
      `最近 1 小时 L1 final_failed 数量异常：${cnt} 条（阈值 ${threshold}）`,
      { count: cnt, threshold, window: "1h" },
      "source",
      "warning",
      dedupKey,
    );
    log.warn("ALERT final_failed_surge count=%d", cnt);
  }
}
