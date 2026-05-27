import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

export async function createAlert(
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
  log.warn("ALERT [%s] channel_space=%s msg=%s", alertType, channelSpaceId, message.slice(0, 200));
}

export async function onFetchFailed(conn: PoolClient, task: any, error: string): Promise<void> {
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
