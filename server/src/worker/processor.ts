import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
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

  // v0.6 收口：AI 未显式启用时，抓取内容先直显；X/Twitter 始终直显，AI 处理后续交给独立中枢。
  let title: string;
  let summary: string;
  let bullets: string[] = [];
  let tags: string[] = [];
  let entities: any[] = [];
  let importanceScore = 0;

  if (shouldDirectDisplay(row.source_type)) {
    const direct = buildDirectNews(row.source_type, content);
    title = direct.title;
    summary = direct.summary;
    tags = direct.tags;
    entities = direct.entities;
    log.info("NEWS DIRECT source_type=%s source_id=%s title=%s", row.source_type, sourceId, title.slice(0, 80));
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

  if (shouldDirectDisplay(row.source_type)) {
    await conn.query(
      `UPDATE raw_items
       SET l0_status = 'skipped',
           l0_label = 'direct_display',
           l0_processed_at = now(),
           l1_status = 'completed',
           l1_processed_at = now()
       WHERE id = $1`,
      [rawItemId],
    );
  }
}

function shouldDirectDisplay(sourceType: string): boolean {
  return sourceType === "x_twitter" || sourceType === "jin10_flash" || !config.aiProcessingEnabled;
}

function buildDirectNews(sourceType: string, content: Record<string, unknown>) {
  if (sourceType === "jin10_flash") {
    const summary = textOf(content.summary) || textOf(content.introduction);
    return {
      title: textOf(content.title) || truncateTitle(summary) || "金十快讯",
      summary,
      tags: ["金十快讯"],
      entities: [],
    };
  }

  if (sourceType === "x_twitter") {
    const text = textOf(content.text);
    const username = textOf(content.author_username);
    return {
      title: truncateTitle(text) || (username ? `@${username}` : "X/Twitter"),
      summary: text,
      tags: ["X/Twitter"],
      entities: username ? [{ name: username, type: "account" }] : [],
    };
  }

  const title = textOf(content.title);
  const summary = textOf(content.summary) || textOf(content.content) || title;
  return {
    title: title || truncateTitle(summary) || "未命名新闻",
    summary,
    tags: [],
    entities: [],
  };
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncateTitle(text: string): string {
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}
