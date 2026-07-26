import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";

export async function levelStatusRoutes(app: FastifyInstance): Promise<void> {
  // ── Source 级别 L0/L1 状态计数（§3.2）─────────────────────

  app.get("/sources/:id/level-status-counts", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };

    const { rows: [src] } = await pool.query(
      "SELECT id FROM sources WHERE id = $1", [id],
    );
    if (!src) return reply.status(404).send({ detail: "信息源不存在" });

    const { rows: [row] } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE l1_status = 'completed' AND l1_processed_at > now() - interval '24h')::int AS completed,
         COUNT(*) FILTER (WHERE l0_status = 'skipped' AND l0_processed_at > now() - interval '24h')::int AS skipped,
         COUNT(*) FILTER (WHERE l1_status = 'retryable_failed' AND l1_processed_at > now() - interval '24h')::int AS retryable_failed,
         COUNT(*) FILTER (WHERE l1_status = 'final_failed' AND l1_processed_at > now() - interval '24h')::int AS final_failed
       FROM raw_items
       WHERE source_id = $1`,
      [id],
    );

    return reply.send({
      completed: row?.completed ?? 0,
      skipped: row?.skipped ?? 0,
      retryable_failed: row?.retryable_failed ?? 0,
      final_failed: row?.final_failed ?? 0,
      window_started_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });
  });

  // ── 全局 L0/L1 状态计数（UI spec R2 新增，#D5 落点）───────

  app.get("/global-level-status-counts", async (_req: FastifyRequest, reply: FastifyReply) => {
    const { rows: [row] } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE l1_status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE l0_status = 'skipped')::int AS skipped,
         COUNT(*) FILTER (WHERE l1_status = 'retryable_failed')::int AS retryable_failed,
         COUNT(*) FILTER (WHERE l1_status = 'final_failed')::int AS final_failed,
         COUNT(*) FILTER (WHERE process_type = 'ai' AND l1_status = 'queued')::int AS pending,
         COUNT(*) FILTER (WHERE process_type = 'ai' AND l1_status = 'processing')::int AS processing,
         COUNT(*) FILTER (WHERE process_type = 'ai')::int AS total_ai,
         COUNT(*) FILTER (WHERE process_type = 'ai' AND l1_status = 'completed')::int AS ai_completed,
         COUNT(*) FILTER (WHERE process_type = 'ai' AND l1_status = 'retryable_failed')::int AS ai_retryable_failed,
         COUNT(*) FILTER (WHERE process_type = 'ai' AND l1_status = 'final_failed')::int AS ai_final_failed
       FROM raw_items`,
    );

    return reply.send({
      completed: row?.completed ?? 0,
      skipped: row?.skipped ?? 0,
      retryable_failed: row?.retryable_failed ?? 0,
      final_failed: row?.final_failed ?? 0,
      pending: row?.pending ?? 0,
      processing: row?.processing ?? 0,
      total_ai: row?.total_ai ?? 0,
      // #A-R3-3: AI 口径三项（原 completed/retryable_failed/final_failed 为全量口径含直显类，
      // 保留兼容 SourceDetail 等既有调用；监控页 AI 概览改用本组字段）
      ai_completed: row?.ai_completed ?? 0,
      ai_retryable_failed: row?.ai_retryable_failed ?? 0,
      ai_final_failed: row?.ai_final_failed ?? 0,
      window_started_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    });
  });
}
