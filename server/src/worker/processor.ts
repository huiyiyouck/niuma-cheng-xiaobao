import type { PoolClient } from "pg";
import { workerLogger } from "../shared/logger.ts";
import { find } from "./fetchers/registry.ts";
import { processLLM } from "./llm.ts";

const log = workerLogger;

/**
 * v0.5: 处理 raw_item 后，查找该 Source 的所有启用 display_position，
 * 对每个 position 创建 news_positions 记录，更新 source_states
 */
export async function processOne(conn: PoolClient, task: any): Promise<void> {
  const rawItemId = task.raw_item_id;
  if (!rawItemId) throw new Error("missing raw_item_id");

  const sourceId = task.source_id;

  const { rows: [row] } = await conn.query(
    `SELECT ri.id, ri.source_id, ri.source_item_url, ri.published_at, ri.content,
            s.type AS source_type, s.identity AS source_identity
     FROM raw_items ri
     JOIN sources s ON s.id = ri.source_id
     WHERE ri.id = $1`,
    [rawItemId],
  );
  if (!row) throw new Error("raw_item not found");

  const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;

  // 金十快讯不走 LLM，直接展示原始内容
  let title: string;
  let summary: string;
  let bullets: string[] = [];
  let tags: string[] = [];
  let entities: any[] = [];
  let importanceScore = 0;

  if (row.source_type === "jin10_flash") {
    summary = (content.summary as string) || (content.introduction as string) || "";
    title = (content.title as string) || summary.slice(0, 40) || "金十快讯";
    tags = ["金十快讯"];
    log.info("JIN10 DIRECT source_id=%s title=%s", sourceId, title.slice(0, 80));
  } else {
    let text: string;
    const typeFetcher = find(row.source_type);
    if (typeFetcher) {
      text = typeFetcher.renderForLLM(content);
    } else {
      text = JSON.stringify(content);
    }
    const t0 = Date.now();
    const result = await processLLM(text, row.source_item_url);
    const elapsed = (Date.now() - t0) / 1000;
    log.info("LLM CALL source_type=%s source_id=%s duration=%.2fs", row.source_type, sourceId, elapsed);
    title = result.title || "";
    summary = result.summary || "";
    bullets = result.bullets || [];
    tags = result.tags || [];
    entities = result.entities || [];
    importanceScore = Number(result.importance_score || 0);
  }

  // 插入 processed_news（ON CONFLICT raw_item_id 去重）
  const { rows: [inserted] } = await conn.query(
    `INSERT INTO processed_news(
       raw_item_id, title, summary, language, source_refs, published_at,
       bullets, tags, entities, importance_score, created_at)
     VALUES($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, now())
     ON CONFLICT (raw_item_id) DO NOTHING
     RETURNING id, title, published_at`,
    [
      rawItemId,
      title,
      summary,
      "zh",
      JSON.stringify({ url: row.source_item_url, source_id: String(row.source_id) }),
      row.published_at || null,
      JSON.stringify(bullets),
      JSON.stringify(tags),
      JSON.stringify(entities),
      importanceScore,
    ],
  );

  if (inserted) {
    log.info("NEWS CREATED id=%s title=%s", inserted.id, String(inserted.title).slice(0, 80));

    // 查找该 Source 的所有启用 display_position
    const { rows: positions } = await conn.query(
      `SELECT id FROM display_positions
       WHERE source_id = $1 AND enabled = true AND deleted_at IS NULL`,
      [row.source_id],
    );

    // 对每个 position 创建 news_positions 记录
    for (const pos of positions) {
      await conn.query(
        `INSERT INTO news_positions(news_id, position_id)
         VALUES($1, $2)
         ON CONFLICT (news_id, position_id) DO NOTHING`,
        [inserted.id, pos.id],
      );
    }

    log.info("NEWS FAN-OUT news_id=%s positions=%d", inserted.id, positions.length);
  } else {
    log.debug("NEWS DEDUPED raw_item_id=%s", rawItemId);
  }
}
