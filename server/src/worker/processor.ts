import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { find } from "./fetchers/registry.ts";
import { processLLM } from "./llm.ts";

const log = workerLogger;

/**
 * v0.6.1: 处理 raw_item 后，创建 processed_news。
 * 触发器自动关联 news_positions（SECURITY DEFINER），不再手动创建。
 * - direct 类：直显内容，l1_status = completed
 * - ai 类（http 模式）：走内建 LLM 处理，l1_status = completed
 * - ai 类（database 模式）：占位在 l0-classifier.ts 中创建，此处不处理
 */
export async function processOne(conn: PoolClient, task: any): Promise<void> {
  const rawItemId = task.raw_item_id;
  if (!rawItemId) throw new Error("missing raw_item_id");

  const sourceId = task.source_id;

  const { rows: [row] } = await conn.query(
    `SELECT ri.id, ri.source_id, ri.source_item_url, ri.published_at, ri.content,
            ri.process_type,
            s.type AS source_type, s.identity AS source_identity
     FROM raw_items ri
     JOIN sources s ON s.id = ri.source_id
     WHERE ri.id = $1`,
    [rawItemId],
  );
  if (!row) throw new Error("raw_item not found");

  const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
  const processType = row.process_type || "direct";

  // direct 类 或 ai 类 http 模式：原有处理逻辑
  let title: string;
  let summary: string;
  let bullets: string[] = [];
  let tags: string[] = [];
  let entities: any[] = [];
  let importanceScore = 0;

  if (shouldDirectDisplay(processType)) {
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
  // 触发器自动创建 news_positions，不再手动关联（#DD10 修复）
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
      detectLanguage(title || summary),
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
  } else {
    log.debug("NEWS DEDUPED raw_item_id=%s", rawItemId);
  }

  if (shouldDirectDisplay(processType)) {
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

/** v0.6.1: shouldDirectDisplay 改为读 process_type（#DD9 修复） */
function shouldDirectDisplay(processType: string): boolean {
  return processType === "direct";
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

/** 简单语言检测：含中文字符则 zh，否则 en（#PM-IMPL-3 修复） */
function detectLanguage(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  return "en";
}
