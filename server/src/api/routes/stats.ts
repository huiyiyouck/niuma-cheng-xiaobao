import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { StatsQuery } from "../schemas/index.ts";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = StatsQuery.parse(req.query);
    const today = new Date().toISOString().slice(0, 10);

    let spaceFilter = "";
    const params: any[] = [];

    if (q.space_id) {
      spaceFilter = q.space_id;
    }

    // v0.6：统计口径切换为 l1_status = 'completed'
    const completedFilter = "ri.l1_status = 'completed'";
    const todayCompletedFilterSpace = `ri.l1_status = 'completed' AND ri.l1_processed_at >= $2`;
    const todayCompletedFilterGlobal = `ri.l1_status = 'completed' AND ri.l1_processed_at >= $1`;

    let totalNewsQuery: string;
    let todayNewQuery: string;
    let activeSourcesQuery: string;
    let channelCountQuery: string;

    if (spaceFilter) {
      totalNewsQuery = `SELECT COUNT(DISTINCT pn.id)::int AS count
        FROM processed_news pn
        JOIN news_positions np ON np.news_id = pn.id
        JOIN display_positions dp ON dp.id = np.position_id
        JOIN raw_items ri ON ri.id = pn.raw_item_id
        WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL AND ${completedFilter}`;

      todayNewQuery = `SELECT COUNT(DISTINCT pn.id)::int AS count
        FROM processed_news pn
        JOIN news_positions np ON np.news_id = pn.id
        JOIN display_positions dp ON dp.id = np.position_id
        JOIN raw_items ri ON ri.id = pn.raw_item_id
        WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL AND ${todayCompletedFilterSpace}`;

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
        today_completed: c(r2.rows),
        total_completed: c(r1.rows),
        enabled_sources: c(r3.rows),
        channels: c(r4.rows),
      });
    } else {
      totalNewsQuery = `SELECT COUNT(DISTINCT pn.id)::int AS count
        FROM processed_news pn
        JOIN raw_items ri ON ri.id = pn.raw_item_id
        WHERE ${completedFilter}`;

      todayNewQuery = `SELECT COUNT(DISTINCT pn.id)::int AS count
        FROM processed_news pn
        JOIN raw_items ri ON ri.id = pn.raw_item_id
        WHERE ${todayCompletedFilterGlobal}`;

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
        today_completed: c(r2.rows),
        total_completed: c(r1.rows),
        enabled_sources: c(r3.rows),
        channels: c(r4.rows),
      });
    }
  });
}
