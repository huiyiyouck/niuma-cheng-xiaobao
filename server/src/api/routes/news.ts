import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { asDict } from "../../shared/utils.ts";
import { NewsQuery } from "../schemas/index.ts";

export async function newsRoutes(app: FastifyInstance): Promise<void> {
  // 列表
  app.get("/channel-spaces/:space_id/news", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const q = NewsQuery.parse(req.query);

    let orderCol: string;
    if (q.sort === "score_desc") {
      orderCol = "pn.importance_score DESC NULLS LAST";
    } else if (q.sort === "score_asc") {
      orderCol = "pn.importance_score ASC NULLS LAST";
    } else {
      orderCol = "pn.published_at DESC NULLS LAST";
    }

    const params: any[] = [space_id, q.limit, q.offset];
    let subFilter = "";
    let idx = 3;
    if (q.sub_channel_id) {
      const ids = q.sub_channel_id.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length === 1) {
        subFilter = `AND pn.sub_channel_id = $${++idx}`;
        params.push(ids[0]);
      } else if (ids.length > 1) {
        subFilter = `AND pn.sub_channel_id = ANY($${++idx})`;
        params.push(ids);
      }
    }
    // v0.4: 搜索参数
    if (q.q) {
      subFilter += ` AND (pn.title ILIKE '%' || $${++idx} || '%' OR pn.summary ILIKE '%' || $${++idx} || '%')`;
      params.push(q.q);
    }

    const { rows } = await pool.query(
      `SELECT pn.* FROM processed_news pn
       WHERE pn.channel_space_id = $1 ${subFilter}
       ORDER BY ${orderCol}, pn.created_at DESC
       LIMIT $2 OFFSET $3`,
      params,
    );
    return reply.send(rows.map(newsToOut));
  });

  // 详情
  app.get("/news/:news_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { news_id } = req.params as { news_id: string };
    const { rows: [row] } = await pool.query("SELECT * FROM processed_news WHERE id = $1", [news_id]);
    if (!row) return reply.status(404).send({ detail: "news not found" });
    return reply.send(newsToOut(row));
  });
}

function newsToOut(r: any) {
  return {
    id: r.id,
    channel_space_id: r.channel_space_id,
    raw_item_id: r.raw_item_id,
    sub_channel_id: r.sub_channel_id,
    title: r.title,
    summary: r.summary,
    language: r.language,
    source_refs: asDict(r.source_refs),
    published_at: r.published_at instanceof Date ? r.published_at.toISOString() : r.published_at,
    bullets: r.bullets || [],
    tags: r.tags || [],
    entities: r.entities || [],
    importance_score: Number(r.importance_score || 0),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}
