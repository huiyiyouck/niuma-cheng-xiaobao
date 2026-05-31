import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";

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
