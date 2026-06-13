import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { StatsQuery } from "../schemas/index.ts";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = StatsQuery.parse(req.query);
    const today = new Date().toISOString().slice(0, 10);

    if (q.space_id) {
      // ── 按空间统计（SpaceStats 契约）─────────────────
      const [totalNews, todayNew, activeSources, channelCount] = await Promise.all([
        pool.query(
          `SELECT COUNT(DISTINCT pn.id)::int AS count
           FROM processed_news pn
           JOIN news_positions np ON np.news_id = pn.id
           JOIN display_positions dp ON dp.id = np.position_id
           JOIN raw_items ri ON ri.id = pn.raw_item_id
           WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL
             AND ri.l1_status = 'completed'`,
          [q.space_id],
        ),
        pool.query(
          `SELECT COUNT(DISTINCT pn.id)::int AS count
           FROM processed_news pn
           JOIN news_positions np ON np.news_id = pn.id
           JOIN display_positions dp ON dp.id = np.position_id
           JOIN raw_items ri ON ri.id = pn.raw_item_id
           WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL
             AND ri.l1_status = 'completed' AND ri.l1_processed_at >= $2`,
          [q.space_id, today],
        ),
        pool.query(
          `SELECT COUNT(DISTINCT dp.source_id)::int AS count
           FROM display_positions dp
           JOIN sources s ON s.id = dp.source_id
           WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL AND dp.enabled = true
             AND s.lifecycle_status = 'normal' AND s.paused = false`,
          [q.space_id],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS count FROM channels WHERE channel_space_id = $1",
          [q.space_id],
        ),
      ]);

      const c = (rows: any[]) => rows[0]?.count ?? 0;
      return reply.send({
        total_news: c(totalNews.rows),
        today_new: c(todayNew.rows),
        active_sources: c(activeSources.rows),
        channel_count: c(channelCount.rows),
      });
    }

    // ── 全局统计（StatsOverview 契约）───────────────────
    const [todayNew, activeSpaces, activeSources, unprocessedAlerts] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT pn.id)::int AS count
         FROM processed_news pn
         JOIN raw_items ri ON ri.id = pn.raw_item_id
         WHERE ri.l1_status = 'completed' AND ri.l1_processed_at >= $1`,
        [today],
      ),
      pool.query("SELECT COUNT(*)::int AS count FROM channel_spaces"),
      pool.query(
        `SELECT COUNT(DISTINCT s.id)::int AS count
         FROM sources s
         WHERE s.lifecycle_status = 'normal' AND s.paused = false
         AND EXISTS(
           SELECT 1 FROM display_positions dp
           WHERE dp.source_id = s.id AND dp.enabled = true AND dp.deleted_at IS NULL
         )`,
      ),
      pool.query("SELECT COUNT(*)::int AS count FROM alerts WHERE status = 'active'"),
    ]);

    const c = (rows: any[]) => rows[0]?.count ?? 0;
    // avg_score：v0.6 尚无评分数据（score_total 为 null），暂返回 0
    return reply.send({
      today_new: c(todayNew.rows),
      avg_score: 0,
      active_spaces: c(activeSpaces.rows),
      active_sources: c(activeSources.rows),
      unprocessed_alerts: c(unprocessedAlerts.rows),
    });
  });
}
