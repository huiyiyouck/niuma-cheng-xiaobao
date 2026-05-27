import type { PoolClient } from "pg";
import { workerLogger } from "../shared/logger.ts";
import { find } from "./fetchers/registry.ts";
import { processLLM } from "./llm.ts";

const log = workerLogger;

export async function processOne(conn: PoolClient, task: any): Promise<void> {
  const rawItemId = task.raw_item_id;
  if (!rawItemId) throw new Error("missing raw_item_id");

  const { rows: [row] } = await conn.query(
    `SELECT ri.id, ri.channel_space_id, ri.source_id, ri.source_item_url,
            ri.published_at, ri.content, s.type as source_type
     FROM raw_items ri
     JOIN sources s ON s.id = ri.source_id
     WHERE ri.id = $1`,
    [rawItemId],
  );
  if (!row) throw new Error("raw_item not found");

  const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
  let text: string;
  const typeFetcher = find(row.source_type);
  if (typeFetcher) {
    text = typeFetcher.renderForLLM(content);
  } else {
    text = JSON.stringify(content);
  }

  // 查 sub_channel_id
  const { rows: [cs] } = await conn.query(
    "SELECT sub_channel_id FROM channel_sources WHERE source_id = $1 AND channel_space_id = $2 LIMIT 1",
    [row.source_id, row.channel_space_id],
  );
  const subChannelId = cs?.sub_channel_id ?? null;

  // 去重检查
  if (subChannelId && row.source_item_url) {
    const { rows: [dup] } = await conn.query(
      `SELECT 1 FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       WHERE pn.channel_space_id = $1 AND pn.sub_channel_id = $2 AND ri.source_item_url = $3
       LIMIT 1`,
      [row.channel_space_id, subChannelId, row.source_item_url],
    );
    if (dup) return;
  }

  const t0 = Date.now();
  const result = await processLLM(text, row.source_item_url);
  const elapsed = (Date.now() - t0) / 1000;
  log.info("LLM CALL source_type=%s duration=%.2fs", row.source_type, elapsed);

  const { rows: [inserted] } = await conn.query(
    `INSERT INTO processed_news(
       channel_space_id, raw_item_id, title, summary, language, source_refs, published_at,
       bullets, tags, entities, importance_score, sub_channel_id, created_at)
     VALUES($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, now())
     ON CONFLICT (raw_item_id) DO NOTHING
     RETURNING id, channel_space_id, title, published_at`,
    [
      row.channel_space_id,
      rawItemId,
      result.title || "",
      result.summary || "",
      result.language || "zh",
      JSON.stringify({ url: row.source_item_url, source_id: String(row.source_id) }),
      row.published_at || null,
      JSON.stringify(result.bullets || []),
      JSON.stringify(result.tags || []),
      JSON.stringify(result.entities || []),
      Number(result.importance_score || 0),
      subChannelId,
    ],
  );

  if (inserted) {
    log.info("NEWS CREATED id=%s title=%s sub_channel=%s", inserted.id, String(inserted.title).slice(0, 80), subChannelId);
  } else {
    log.debug("NEWS DEDUPED raw_item_id=%s", rawItemId);
  }
}
