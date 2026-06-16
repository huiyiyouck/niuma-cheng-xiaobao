import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

/**
 * 创建或更新告警（v0.5: 支持 dedup_key + 24h 去重窗口）
 * channelSpaceId 改为 nullable
 */
export async function createAlert(
  conn: PoolClient,
  sourceId: string | null,
  channelSpaceId: string | null,
  alertType: string,
  message: string,
  meta: Record<string, unknown>,
  scope: string = "source",
  severity: string = "warning",
  dedupKey?: string,
): Promise<void> {
  // 如果有 dedup_key，先尝试更新已有告警（含仍处于 active 的同类告警：
  // 持续未处理的同一问题应刷新计数/时间，而不是每次重复 INSERT 形成告警风暴）
  if (dedupKey) {
    const { rowCount } = await conn.query(
      `UPDATE alerts
       SET status = 'active', last_triggered_at = now(), message = $2, meta = $3::jsonb
       WHERE dedup_key = $1
         AND status IN ('active', 'resolved', 'ignored')
         AND last_triggered_at > now() - INTERVAL '24 hours'`,
      [dedupKey, message, JSON.stringify(meta)],
    );
    if (rowCount && rowCount > 0) {
      log.info("ALERT DEDUPED dedup_key=%s scope=%s", dedupKey, scope);
      return;
    }
  }

  // 新建告警
  await conn.query(
    `INSERT INTO alerts(scope, source_id, channel_space_id, type, severity, status, message, meta, dedup_key, last_triggered_at, created_at)
     VALUES($1, $2, $3, $4, $5, 'active', $6, $7::jsonb, $8, now(), now())`,
    [
      scope,
      sourceId,
      channelSpaceId,
      alertType,
      severity,
      message,
      JSON.stringify(meta),
      dedupKey ?? null,
    ],
  );
  log.warn("ALERT [%s] scope=%s source=%s msg=%s", alertType, scope, sourceId, message.slice(0, 200));
}

/**
 * v0.5: 抓取失败处理（per-source）
 * 连续失败达到阈值 → 标记 lifecycle_status='source_error' + 生成告警
 */
export async function onFetchFailed(conn: PoolClient, task: any, error: string): Promise<void> {
  // 查找 source_id
  const sourceId = task.source_id;
  if (!sourceId) return;

  // 更新失败计数
  const { rows: [row] } = await conn.query(
    `UPDATE source_states
     SET consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
         last_error = $2, updated_at = now()
     WHERE source_id = $1
     RETURNING consecutive_failures, last_error`,
    [sourceId, error],
  );

  const failures = row?.consecutive_failures ?? 1;
  const threshold = config.defaultFailAlertThreshold;

  if (failures >= threshold) {
    // 标记来源异常
    const { rows: [src] } = await conn.query(
      `UPDATE sources SET lifecycle_status = 'source_error'
       WHERE id = $1 AND lifecycle_status = 'normal'
       RETURNING id, display_name`,
      [sourceId],
    );

    if (src) {
      const dedupKey = `source_error:${sourceId}`;
      await createAlert(
        conn,
        sourceId,
        null,
        "fetch_failed",
        `信息源 ${src.display_name} 连续抓取失败 ${failures} 次: ${error}`,
        { source_id: sourceId, failures },
        "source",
        "warning",
        dedupKey,
      );
    }
  } else {
    // 不足阈值：更新 lifecycle_status 为 needs_fix（临时标记）
    // 保持 normal 状态，让 Scheduler 继续重试
    // 仅更新 source_states 中的错误信息
    log.warn("FETCH FAILED source_id=%s failures=%d/%d", sourceId, failures, threshold);
  }
}

/**
 * 零新闻监控（v0.5: per-source）
 */
export async function zeroNewMonitorTick(conn: PoolClient): Promise<void> {
  const { rows } = await conn.query(
    `SELECT s.id AS source_id, s.display_name AS source_name,
            ss.last_success_at
     FROM sources s
     LEFT JOIN source_states ss ON ss.source_id = s.id
     WHERE s.lifecycle_status = 'normal'
       AND EXISTS(
         SELECT 1 FROM display_positions dp
         WHERE dp.source_id = s.id AND dp.enabled = true AND dp.deleted_at IS NULL
       )`,
  );

  const threshold = new Date(Date.now() - config.defaultZeroNewHours * 3600 * 1000);
  for (const r of rows) {
    if (r.last_success_at && new Date(r.last_success_at) >= threshold) continue;

    const sourceId = String(r.source_id);
    const { rows: [exists] } = await conn.query(
      `SELECT 1 FROM alerts
       WHERE type = 'zero_new' AND (meta->>'source_id') = $1
         AND created_at > now() - interval '24 hours'
       LIMIT 1`,
      [sourceId],
    );
    if (exists) continue;

    await createAlert(
      conn,
      sourceId,
      null,
      "zero_new",
      `信息源 ${r.source_name} 在 ${config.defaultZeroNewHours}h 内无新内容`,
      { source_id: sourceId, last_success_at: r.last_success_at?.toISOString?.() ?? null },
    );
  }
}
