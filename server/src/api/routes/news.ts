import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { asDict } from "../../shared/utils.ts";
import { NewsQuery } from "../schemas/index.ts";

export async function newsRoutes(app: FastifyInstance): Promise<void> {
  // ── 新闻列表（通过 news_positions JOIN + DISTINCT 去重）─

  app.get("/news", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = NewsQuery.parse(req.query);

    if (!q.space_id) {
      return reply.status(400).send({ detail: "space_id is required" });
    }

    // 验证空间存在
    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [q.space_id],
    );
    if (!space) return reply.status(400).send({ detail: "频道空间不存在" });

    let orderCol: string;
    if (q.sort === "score_desc") {
      orderCol = "importance_score DESC NULLS LAST";
    } else {
      orderCol = "published_at DESC NULLS LAST";
    }

    const conditions: string[] = [];
    const params: any[] = [q.space_id];
    let idx = 1;

    conditions.push("dp.channel_space_id = $1");
    conditions.push("dp.deleted_at IS NULL");
    conditions.push("dp.enabled = true");

    // 频道筛选
    if (q.channel_id) {
      conditions.push(`dp.channel_id = $${++idx}`);
      params.push(q.channel_id);
    }

    // 搜索（同一参数值复用 $n 引用）
    if (q.search) {
      params.push(q.search);
      const searchIdx = ++idx;
      conditions.push(
        `(pn.title ILIKE '%' || $${searchIdx} || '%' OR pn.summary ILIKE '%' || $${searchIdx} || '%')`,
      );
    }

    // 最低评分
    if (q.min_score !== undefined) {
      conditions.push(`pn.importance_score >= $${++idx}`);
      params.push(q.min_score);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 分页
    const pageSize = q.page_size;
    const offset = (q.page - 1) * pageSize;
    params.push(pageSize, offset);
    const limitIdx = ++idx;
    const offsetIdx = ++idx;

    // DISTINCT ON 要求 pn.id 排在第一，外层子查询再按业务排序
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (pn.id) pn.*
         FROM processed_news pn
         JOIN news_positions np ON np.news_id = pn.id
         JOIN display_positions dp ON dp.id = np.position_id
         ${where}
         ORDER BY pn.id
       ) AS deduped
       ORDER BY ${orderCol}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    return reply.send(rows.map(newsToOut));
  });

  // ── 新闻详情 ──────────────────────────────────────────

  app.get("/news/:news_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { news_id } = req.params as { news_id: string };
    const { rows: [row] } = await pool.query(
      "SELECT * FROM processed_news WHERE id = $1", [news_id],
    );
    if (!row) return reply.status(404).send({ detail: "news not found" });
    return reply.send(newsToOut(row));
  });
}

function newsToOut(r: any) {
  return {
    id: r.id,
    raw_item_id: r.raw_item_id,
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
