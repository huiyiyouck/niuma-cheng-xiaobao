import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

function policyEverySeconds(fetchPolicy: any): number {
  const v = fetchPolicy?.schedule?.every_seconds;
  if (typeof v === "number" && v > 0) return v;
  return config.defaultFetchEverySeconds;
}

export function policyMaxItems(fetchPolicy: any): number {
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
