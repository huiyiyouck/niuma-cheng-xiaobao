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

    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [q.space_id],
    );
    if (!space) return reply.status(400).send({ detail: "频道空间不存在" });

    let orderCol: string;
    if (q.sort === "score_desc") {
      orderCol = "pn.score_total DESC NULLS LAST, pn.importance_score DESC NULLS LAST";
    } else {
      orderCol = "published_at DESC NULLS LAST";
    }

    const conditions: string[] = [];
    const params: any[] = [q.space_id];
    let idx = 1;

    conditions.push("dp.channel_space_id = $1");
    conditions.push("dp.deleted_at IS NULL");
    conditions.push("dp.enabled = true");

    if (q.channel_id) {
      conditions.push(`dp.channel_id = $${++idx}`);
      params.push(q.channel_id);
    }

    if (q.search) {
      params.push(q.search);
      const searchIdx = ++idx;
      conditions.push(
        `(pn.title ILIKE '%' || $${searchIdx} || '%' OR pn.summary ILIKE '%' || $${searchIdx} || '%')`,
      );
    }

    if (q.min_score !== undefined) {
      conditions.push(`COALESCE(pn.score_total, pn.importance_score) >= $${++idx}`);
      params.push(q.min_score);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const pageSize = q.page_size;
    const offset = (q.page - 1) * pageSize;
    params.push(pageSize, offset);
    const limitIdx = ++idx;
    const offsetIdx = ++idx;

    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (pn.id) pn.*, ri.l1_status, ri.process_type, ri.l1_error,
                s.display_name AS source_name, s.id AS source_id
         FROM processed_news pn
         JOIN news_positions np ON np.news_id = pn.id
         JOIN display_positions dp ON dp.id = np.position_id
         JOIN raw_items ri ON ri.id = pn.raw_item_id
         JOIN sources s ON s.id = ri.source_id
         ${where}${where ? " AND" : "WHERE"} s.paused = false
         ORDER BY pn.id
       ) AS deduped
       ORDER BY ${orderCol}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    return reply.send(rows.map(newsToOut));
  });

  // ── 新闻详情（v0.6 扩展：完整 NewsDetail 结构）─────────

  app.get("/news/:news_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { news_id } = req.params as { news_id: string };
    const { rows: [row] } = await pool.query(
      `SELECT pn.*, s.display_name AS source_name, s.id AS source_id,
              ri.l0_status, ri.l1_status, ri.process_type, ri.l1_error
       FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       JOIN sources s ON s.id = ri.source_id
       WHERE pn.id = $1`,
      [news_id],
    );
    if (!row) return reply.status(404).send({ detail: "news not found" });
    return reply.send(newsDetailToOut(row));
  });
}

// ── 列表项输出（v0.6.1 扩展：process_type、l1_status）────

function newsToOut(r: any) {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    published_at: toISO(r.published_at),
    // v0.5 兼容：扁平字段
    raw_item_id: r.raw_item_id,
    source_id: r.source_id,
    source_display_name: r.source_name,
    // v0.6：嵌套 source 对象（新前端用）
    source: {
      id: r.source_id,
      name: r.source_name,
    },
    score_total: r.score_total != null ? Number(r.score_total) : null,
    tags_v2: asDict(r.tags_v2) || null,
    // v0.6.1：处理类型和 L1 状态（前端展示分层用）
    process_type: r.process_type || null,
    l1_status: r.l1_status || null,
    l1_error: r.l1_error || null,
    // v0.5 兼容字段
    language: r.language,
    source_refs: asDict(r.source_refs),
    bullets: r.bullets || [],
    tags: r.tags || [],
    entities: r.entities || [],
    importance_score: Number(r.importance_score || 0),
    created_at: toISO(r.created_at),
  };
}

// ── 详情输出（完整 NewsDetail，§3.2 契约）────────────────────

function newsDetailToOut(r: any) {
  return {
    id: r.id,
    title: r.title,
    published_at: toISO(r.published_at),
    summary: r.summary,
    // v0.5 兼容：扁平字段
    raw_item_id: r.raw_item_id,
    source_id: r.source_id,
    source_display_name: r.source_name,
    // v0.6 新字段
    source: { id: r.source_id, name: r.source_name },
    score_total: r.score_total != null ? Number(r.score_total) : null,
    score_dimensions: asDict(r.score_dimensions) || null,
    translation: asDict(r.translation) || null,
    context: r.context || [],
    analysis: r.analysis || null,
    tags_v2: asDict(r.tags_v2) || null,
    l0_status: r.l0_status || null,
    l1_status: r.l1_status || null,
    process_type: r.process_type || null,
    l1_error: r.l1_error || null,
    // v0.5 兼容
    language: r.language,
    source_refs: asDict(r.source_refs),
    bullets: r.bullets || [],
    tags: r.tags || [],
    entities: r.entities || [],
    importance_score: Number(r.importance_score || 0),
    created_at: toISO(r.created_at),
  };
}

export function toISO(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}
