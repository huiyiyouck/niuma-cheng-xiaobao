import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import * as xt from "./fetchers/x_twitter.ts";
import { NonRetryableError } from "./errors.ts";
import { processLLM } from "./llm.ts";

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

// ── 调度器 ─────────────────────────────────────────────────

function policyEverySeconds(fetchPolicy: any): number {
  const v = fetchPolicy?.schedule?.every_seconds;
  if (typeof v === "number" && v > 0) return v;
  return config.defaultFetchEverySeconds;
}

function policyMaxItems(fetchPolicy: any): number {
  const v = fetchPolicy?.budget?.max_items_per_run;
  if (typeof v === "number" && v > 0) return v;
  return config.defaultMaxItemsPerRun;
}

export async function schedulerTick(conn: PoolClient): Promise<void> {
  const { rows } = await conn.query(
    `SELECT cs.id as channel_source_id, cs.channel_space_id, cs.fetch_policy,
            ss.id as state_id, ss.next_fetch_at
     FROM channel_sources cs
     JOIN sources s ON s.id = cs.source_id
     LEFT JOIN source_states ss ON ss.channel_source_id = cs.id
     WHERE cs.enabled = true AND s.status = 'active'`,
  );

  const now = new Date();
  for (const r of rows) {
    if (r.next_fetch_at && new Date(r.next_fetch_at) > now) continue;

    const { rows: [exists] } = await conn.query(
      `SELECT 1 FROM tasks
       WHERE status IN ('queued','running') AND type = 'fetch' AND channel_source_id = $1
       LIMIT 1`,
      [r.channel_source_id],
    );
    if (exists) continue;

    const everySeconds = policyEverySeconds(r.fetch_policy);
    await conn.query(
      `INSERT INTO tasks(type, channel_space_id, channel_source_id, status, priority, run_after, created_at, updated_at)
       VALUES('fetch', $1, $2, 'queued', 0, now(), now(), now())`,
      [r.channel_space_id, r.channel_source_id],
    );
    log.debug("SCHEDULER enqueued fetch channel_source_id=%s", r.channel_source_id);

    const nextFetch = new Date(now.getTime() + everySeconds * 1000);
    await conn.query(
      `INSERT INTO source_states(channel_source_id, cursor, next_fetch_at, consecutive_failures, updated_at)
       VALUES($1, '{}'::jsonb, $2, 0, now())
       ON CONFLICT (channel_source_id)
       DO UPDATE SET next_fetch_at = $2, updated_at = now()`,
      [r.channel_source_id, nextFetch.toISOString()],
    );
  }
}

// ── 分发器 ─────────────────────────────────────────────────

async function fetchAndIngest(conn: PoolClient, task: any): Promise<void> {
  const channelSourceId = task.channel_source_id;
  if (!channelSourceId) throw new Error("missing channel_source_id");

  const { rows: [row] } = await conn.query(
    `SELECT cs.channel_space_id, cs.fetch_policy, s.id as source_id, s.type as source_type,
            s.display_name as source_name, s.config as source_config, ss.cursor, ss.consecutive_failures
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

  if (row.source_type === "x_twitter") {
    [items, cursorUpdates] = await xt.parseXTweets(row.source_config, row.cursor || {}, maxItems);
  } else {
    throw new NonRetryableError(`该 Source 类型的抓取器尚未实现：${row.source_type}`);
  }

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

// ── 处理器 ─────────────────────────────────────────────────

async function processOne(conn: PoolClient, task: any): Promise<void> {
  const rawItemId = task.raw_item_id;
  if (!rawItemId) throw new Error("missing raw_item_id");

  const { rows: [row] } = await conn.query(
    `SELECT ri.id, ri.channel_space_id, ri.source_id, ri.source_item_url,
            ri.published_at, ri.content, s.type as source_type
     FROM raw_items ri
     JOIN sources s ON s.id = ri.source_id
     WHERE ri.id = $1`,
    [rawItemId],
  );
  if (!row) throw new Error("raw_item not found");

  const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
  let text: string;
  if (row.source_type === "x_twitter") {
    text = xt.renderTextForLLM(content);
  } else {
    text = JSON.stringify(content);
  }

  // 查 sub_channel_id
  const { rows: [cs] } = await conn.query(
    "SELECT sub_channel_id FROM channel_sources WHERE source_id = $1 AND channel_space_id = $2 LIMIT 1",
    [row.source_id, row.channel_space_id],
  );
  const subChannelId = cs?.sub_channel_id ?? null;

  // 去重检查
  if (subChannelId && row.source_item_url) {
    const { rows: [dup] } = await conn.query(
      `SELECT 1 FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       WHERE pn.channel_space_id = $1 AND pn.sub_channel_id = $2 AND ri.source_item_url = $3
       LIMIT 1`,
      [row.channel_space_id, subChannelId, row.source_item_url],
    );
    if (dup) return;
  }

  const t0 = Date.now();
  const result = await processLLM(text, row.source_item_url);
  const elapsed = (Date.now() - t0) / 1000;
  log.info("LLM CALL source_type=%s duration=%.2fs", row.source_type, elapsed);

  const { rows: [inserted] } = await conn.query(
    `INSERT INTO processed_news(
       channel_space_id, raw_item_id, title, summary, language, source_refs, published_at,
       bullets, tags, entities, importance_score, sub_channel_id, created_at)
     VALUES($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, now())
     ON CONFLICT (raw_item_id) DO NOTHING
     RETURNING id, channel_space_id, title, published_at`,
    [
      row.channel_space_id,
      rawItemId,
      result.title || "",
      result.summary || "",
      result.language || "zh",
      JSON.stringify({ url: row.source_item_url, source_id: String(row.source_id) }),
      row.published_at || null,
      JSON.stringify(result.bullets || []),
      JSON.stringify(result.tags || []),
      JSON.stringify(result.entities || []),
      Number(result.importance_score || 0),
      subChannelId,
    ],
  );

  if (inserted) {
    log.info("NEWS CREATED id=%s title=%s sub_channel=%s", inserted.id, String(inserted.title).slice(0, 80), subChannelId);
  } else {
    log.debug("NEWS DEDUPED raw_item_id=%s", rawItemId);
  }
}

// ── 告警辅助 ───────────────────────────────────────────────

async function createAlert(
  conn: PoolClient,
  channelSpaceId: string,
  alertType: string,
  message: string,
  meta: Record<string, unknown>,
): Promise<void> {
  await conn.query(
    `INSERT INTO alerts(channel_space_id, type, severity, message, meta, created_at)
     VALUES($1, $2, 'warning', $3, $4::jsonb, now())`,
    [channelSpaceId, alertType, message, JSON.stringify(meta)],
  );
  log.warning("ALERT [%s] channel_space=%s msg=%s", alertType, channelSpaceId, message.slice(0, 200));
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
    // 尝试拿 fetch
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

    // 没有 fetch → 尝试 process
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

async function onFetchFailed(conn: PoolClient, task: any, error: string): Promise<void> {
  const { rows: [row] } = await conn.query(
    `UPDATE source_states
     SET consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
         last_error = $2, updated_at = now()
     WHERE channel_source_id = $1
     RETURNING consecutive_failures`,
    [task.channel_source_id, error],
  );
  const failures = row?.consecutive_failures ?? 1;
  if (failures >= config.defaultFailAlertThreshold) {
    await createAlert(conn, task.channel_space_id, "fetch_failed",
      `source fetch failed ${failures} times: ${error}`,
      { channel_source_id: String(task.channel_source_id), failures },
    );
  }
}

// ── 零新增监控 ─────────────────────────────────────────────

export async function zeroNewMonitorTick(conn: PoolClient): Promise<void> {
  const { rows } = await conn.query(
    `SELECT cs.id as channel_source_id, cs.channel_space_id,
            s.display_name as source_name, ss.last_success_at
     FROM channel_sources cs
     JOIN sources s ON s.id = cs.source_id
     LEFT JOIN source_states ss ON ss.channel_source_id = cs.id
     WHERE cs.enabled = true`,
  );

  const threshold = new Date(Date.now() - config.defaultZeroNewHours * 3600 * 1000);
  for (const r of rows) {
    if (r.last_success_at && new Date(r.last_success_at) >= threshold) continue;

    const channelSourceId = String(r.channel_source_id);
    const { rows: [exists] } = await conn.query(
      `SELECT 1 FROM alerts
       WHERE type = 'zero_new' AND (meta->>'channel_source_id') = $1
         AND created_at > now() - interval '24 hours'
       LIMIT 1`,
      [channelSourceId],
    );
    if (exists) continue;

    await createAlert(conn, r.channel_space_id, "zero_new",
      `source has no new items for ${config.defaultZeroNewHours}h: ${r.source_name}`,
      { channel_source_id: channelSourceId, last_success_at: r.last_success_at?.toISOString?.() ?? null },
    );
  }
}

// ── 超时回收 ───────────────────────────────────────────────

export async function reclaimStaleTick(conn: PoolClient): Promise<void> {
  await conn.query(
    `UPDATE tasks SET status = 'queued', locked_by = NULL, locked_at = NULL,
         run_after = now(), updated_at = now()
     WHERE status = 'running'
       AND locked_at < now() - make_interval(secs => $1)
       AND attempt < max_attempts`,
    [config.taskStaleSeconds],
  );
  await conn.query(
    `UPDATE tasks SET status = 'failed', locked_by = NULL, locked_at = NULL, updated_at = now()
     WHERE status = 'running'
       AND locked_at < now() - make_interval(secs => $1)
       AND attempt >= max_attempts`,
    [config.taskStaleSeconds],
  );
}
