import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { StatsQuery } from "../schemas/index.ts";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // ── 统计卡片 ──────────────────────────────────────────

  app.get("/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = StatsQuery.parse(req.query);
    const today = new Date().toISOString().slice(0, 10);

    let spaceFilter = "";
    const params: any[] = [];

    if (q.space_id) {
      spaceFilter = q.space_id;
    }

    let totalNewsQuery: string;
    let todayNewQuery: string;
    let activeSourcesQuery: string;
    let channelCountQuery: string;

    if (spaceFilter) {
      // 按空间筛选：通过 display_positions + news_positions 聚合
      totalNewsQuery = `SELECT COUNT(DISTINCT pn.id)::int AS count
        FROM processed_news pn
        JOIN news_positions np ON np.news_id = pn.id
        JOIN display_positions dp ON dp.id = np.position_id
        WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL`;

      todayNewQuery = `SELECT COUNT(DISTINCT pn.id)::int AS count
        FROM processed_news pn
        JOIN news_positions np ON np.news_id = pn.id
        JOIN display_positions dp ON dp.id = np.position_id
        WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL AND pn.created_at >= $2`;

      activeSourcesQuery = `SELECT COUNT(DISTINCT dp.source_id)::int AS count
        FROM display_positions dp
        JOIN sources s ON s.id = dp.source_id
        WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL AND dp.enabled = true
          AND s.lifecycle_status = 'normal' AND s.paused = false`;

      channelCountQuery = `SELECT COUNT(*)::int AS count FROM channels WHERE channel_space_id = $1`;

      const [r1, r2, r3, r4] = await Promise.all([
        pool.query(totalNewsQuery, [spaceFilter]),
        pool.query(todayNewQuery, [spaceFilter, today]),
        pool.query(activeSourcesQuery, [spaceFilter]),
        pool.query(channelCountQuery, [spaceFilter]),
      ]);

      const c = (rows: any[]) => rows[0]?.count ?? 0;
      return reply.send({
        total_news: c(r1.rows),
        today_new: c(r2.rows),
        active_sources: c(r3.rows),
        channel_count: c(r4.rows),
      });
    } else {
      // 全局统计
      totalNewsQuery = "SELECT COUNT(*)::int AS count FROM processed_news";
      todayNewQuery = "SELECT COUNT(*)::int AS count FROM processed_news WHERE created_at >= $1";

      activeSourcesQuery = `SELECT COUNT(DISTINCT s.id)::int AS count
        FROM sources s
        WHERE s.lifecycle_status = 'normal' AND s.paused = false
        AND EXISTS(
          SELECT 1 FROM display_positions dp
          WHERE dp.source_id = s.id AND dp.enabled = true AND dp.deleted_at IS NULL
        )`;

      channelCountQuery = "SELECT COUNT(*)::int AS count FROM channels";

      const [r1, r2, r3, r4] = await Promise.all([
        pool.query(totalNewsQuery),
        pool.query(todayNewQuery, [today]),
        pool.query(activeSourcesQuery),
        pool.query(channelCountQuery),
      ]);

      const c = (rows: any[]) => rows[0]?.count ?? 0;
      return reply.send({
        total_news: c(r1.rows),
        today_new: c(r2.rows),
        active_sources: c(r3.rows),
        channel_count: c(r4.rows),
      });
    }
  });
}
