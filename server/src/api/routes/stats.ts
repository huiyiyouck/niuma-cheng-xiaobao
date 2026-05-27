import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // 频道统计
  app.get("/channel-spaces/:space_id/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const today = new Date().toISOString().slice(0, 10);

    const [r1, r2, r3, r4] = await Promise.all([
      pool.query("SELECT count(*)::int as count FROM processed_news WHERE channel_space_id = $1", [space_id]),
      pool.query("SELECT count(*)::int as count FROM processed_news WHERE channel_space_id = $1 AND created_at >= $2", [space_id, today]),
      pool.query("SELECT count(*)::int as count FROM channel_sources WHERE channel_space_id = $1 AND enabled = true", [space_id]),
      pool.query("SELECT count(*)::int as count FROM sub_channels WHERE channel_space_id = $1", [space_id]),
    ]);

    const c = (rows: any[]) => rows[0]?.count ?? 0;
    return reply.send({
      total_news: c(r1.rows),
      today_new: c(r2.rows),
      active_sources: c(r3.rows),
      sub_channel_count: c(r4.rows),
    });
  });

  // 全局统计
  app.get("/stats", async (_req: FastifyRequest, reply: FastifyReply) => {
    const today = new Date().toISOString().slice(0, 10);

    const [r1, r2, r3, r4] = await Promise.all([
      pool.query("SELECT count(*)::int as count FROM processed_news"),
      pool.query("SELECT count(*)::int as count FROM processed_news WHERE created_at >= $1", [today]),
      pool.query("SELECT count(*)::int as count FROM channel_sources WHERE enabled = true"),
      pool.query("SELECT count(*)::int as count FROM sub_channels"),
    ]);

    const c = (rows: any[]) => rows[0]?.count ?? 0;
    return reply.send({
      total_news: c(r1.rows),
      today_new: c(r2.rows),
      active_sources: c(r3.rows),
      sub_channel_count: c(r4.rows),
    });
  });
}
