import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.ts";

const KbSearchBody = z.object({
  query: z.string().trim().min(1).max(300),
  top_n: z.number().int().min(1).max(10).default(5),
  exclude_raw_item_id: z.string().uuid().optional(),
  source_id: z.string().uuid().optional(),
  domain_tags: z.array(z.string()).optional(),
});

export async function kbSearchRoutes(app: FastifyInstance): Promise<void> {
  app.post("/kb-search", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = KbSearchBody.parse(req.body);
    const params: any[] = [body.query];
    const conditions = [
      `(pn.title ILIKE '%' || $1 || '%' OR pn.summary ILIKE '%' || $1 || '%' OR pn.analysis ILIKE '%' || $1 || '%')`,
    ];

    if (body.exclude_raw_item_id) {
      params.push(body.exclude_raw_item_id);
      conditions.push(`pn.raw_item_id != $${params.length}`);
    }
    if (body.source_id) {
      params.push(body.source_id);
      conditions.push(`ri.source_id != $${params.length}`);
    }
    params.push(body.top_n);
    const { rows } = await pool.query(
      `SELECT pn.id AS news_id, pn.raw_item_id, pn.title, pn.summary, pn.published_at,
              pn.score_total, pn.importance_score, pn.source_refs,
              s.id AS source_id, s.identity AS source_identity, s.display_name AS source_name,
              ts_rank_cd(
                to_tsvector('simple', COALESCE(pn.title, '') || ' ' || COALESCE(pn.summary, '') || ' ' || COALESCE(pn.analysis, '')),
                plainto_tsquery('simple', $1)
              ) AS rank
       FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       JOIN sources s ON s.id = ri.source_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY rank DESC, COALESCE(pn.score_total, pn.importance_score) DESC NULLS LAST, pn.published_at DESC NULLS LAST
       LIMIT $${params.length}`,
      params,
    );

    return reply.send({
      query: body.query,
      results: rows.map((r) => ({
        news_id: r.news_id,
        raw_item_id: r.raw_item_id,
        title: r.title,
        summary: r.summary,
        content: r.summary,
        published_at: toISO(r.published_at),
        score_total: r.score_total == null ? null : Number(r.score_total),
        importance_score: Number(r.importance_score || 0),
        source: {
          id: r.source_id,
          identity: r.source_identity,
          name: r.source_name,
        },
        url: typeof r.source_refs === "object" && r.source_refs ? r.source_refs.url ?? null : null,
      })),
    });
  });
}

function toISO(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}
