import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.ts";
import { callAiHubNewsL1, toAiHubL1Input } from "../../worker/ai-hub.ts";
import { buildL1InputForRawItem } from "../../worker/l1-processor.ts";

const CandidateQuery = z.object({
  search: z.string().trim().optional(),
  page_size: z.coerce.number().int().min(1).max(100).default(30),
});

const RunBody = z.object({
  news_id: z.string().uuid().optional(),
  raw_item_id: z.string().uuid().optional(),
  options: z.object({
    max_tool_calls: z.number().int().min(0).max(20).optional(),
    timeout_ms: z.number().int().min(1000).max(600000).optional(),
  }).optional(),
}).refine((v) => v.news_id || v.raw_item_id, {
  message: "news_id or raw_item_id is required",
});

export async function aiDebugRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ai-debug/candidates", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = CandidateQuery.parse(req.query);
    const params: any[] = [];
    const conditions: string[] = [];

    if (q.search) {
      params.push(q.search);
      conditions.push(`(
        pn.title ILIKE '%' || $${params.length} || '%'
        OR pn.summary ILIKE '%' || $${params.length} || '%'
        OR s.display_name ILIKE '%' || $${params.length} || '%'
        OR ri.content::text ILIKE '%' || $${params.length} || '%'
      )`);
    }

    params.push(q.page_size);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT pn.id AS news_id, pn.raw_item_id, pn.title, pn.summary, pn.published_at,
              pn.score_total, pn.importance_score,
              ri.source_item_url, ri.l0_status, ri.l1_status, ri.content,
              s.id AS source_id, s.identity AS source_identity, s.display_name AS source_name,
              s.type AS source_type
       FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       JOIN sources s ON s.id = ri.source_id
       ${where}
       ORDER BY COALESCE(pn.published_at, pn.created_at) DESC NULLS LAST
       LIMIT $${params.length}`,
      params,
    );

    return reply.send(rows.map((r) => ({
      news_id: r.news_id,
      raw_item_id: r.raw_item_id,
      title: r.title,
      summary: r.summary,
      published_at: toISO(r.published_at),
      score: r.score_total != null ? Number(r.score_total) : Number(r.importance_score || 0),
      source: {
        id: r.source_id,
        identity: r.source_identity,
        name: r.source_name,
        type: r.source_type,
      },
      source_item_url: r.source_item_url,
      l0_status: r.l0_status,
      l1_status: r.l1_status,
      raw_text_preview: extractRawText(r.content).slice(0, 240),
    })));
  });

  app.post("/ai-debug/news-l1-runs", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = RunBody.parse(req.body);
    const rawItemId = body.raw_item_id || await rawItemIdFromNewsId(body.news_id as string);
    const prepared = await buildL1InputForRawItem(pool as any, rawItemId);
    const options = {
      maxToolCalls: body.options?.max_tool_calls,
      timeoutMs: body.options?.timeout_ms,
    };
    const response = await callAiHubNewsL1(prepared.input, options);

    return reply.send({
      selected: {
        raw_item_id: rawItemId,
        source_id: prepared.row.source_id,
        source_identity: prepared.row.identity,
        source_type: prepared.row.source_type,
        published_at: toISO(prepared.row.published_at),
      },
      input: toAiHubL1Input(prepared.input, options),
      response,
    });
  });
}

async function rawItemIdFromNewsId(newsId: string): Promise<string> {
  const { rows: [row] } = await pool.query(
    "SELECT raw_item_id FROM processed_news WHERE id = $1",
    [newsId],
  );
  if (!row) {
    const err: any = new Error("news not found");
    err.statusCode = 404;
    throw err;
  }
  return row.raw_item_id;
}

function extractRawText(content: unknown): string {
  const c = typeof content === "string" ? safeJson(content) : content;
  if (!c || typeof c !== "object") return String(content || "");
  const obj = c as Record<string, unknown>;
  return (obj.text as string)
    || (obj.body as string)
    || (obj.title as string)
    || (obj.description as string)
    || JSON.stringify(obj);
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

function toISO(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}
