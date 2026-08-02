import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { processL1LLM, translateOnly } from "./llm.ts";
import type { L1Input, L1Output } from "./llm.ts";
import { webSearch, processL1ViaAgent, buildFallbackOutput } from "./openclaw.ts";
import { processL1ViaAiHub } from "./ai-hub.ts";

const log = workerLogger;

// ── 综合分计算（服务端，不依赖 LLM）─────────────────────────

function calcScoreTotal(dims: L1Output["score_dimensions"]): number {
  const raw = dims.timeliness.score * 0.25
    + dims.impact.score * 0.35
    + dims.confidence.score * 0.25
    + dims.clarity.score * 0.15;
  const final = Math.round(raw * 2 * 10) / 10;
  log.info("L1 SCORE raw=%.2f final=%.1f (T%d×0.25 + I%d×0.35 + C%d×0.25 + X%d×0.15)",
    raw, final,
    dims.timeliness.score, dims.impact.score,
    dims.confidence.score, dims.clarity.score);
  return final;
}

// ── score_total 轮询补算（遗留 #5，契约 v1.9）────────────────
// database 模式下 ai 只写 score_dimensions，score_total 由我方按同一公式补算；
// 挂 worker reclaim tick 同节奏执行，公式复用 calcScoreTotal 单一真源（不进 DB 触发器）。

function isValidDims(d: unknown): d is L1Output["score_dimensions"] {
  const dims = d as Record<string, { score?: unknown }> | null;
  return !!dims && ["timeliness", "impact", "confidence", "clarity"]
    .every((k) => typeof dims[k]?.score === "number");
}

// LLM 未表态判别（ai 侧 2026-08-02 提示的边界）：上游对缺失 scores 兜底为「结构完整但全 0 且 reason 全空」，
// 不是结构残缺——若照算会让该条以「真 0 分」沉底。判 reason：全 0 且 reason 全空 = 未表态跳过；
// 0 分但 reason 非空 = LLM 真实低分，照常补算。
function isSilentZeroDims(d: L1Output["score_dimensions"]): boolean {
  const dims = d as unknown as Record<string, { score?: number; reason?: string }>;
  return ["timeliness", "impact", "confidence", "clarity"]
    .every((k) => dims[k]?.score === 0 && !(dims[k]?.reason ?? "").trim());
}

export async function backfillScoreTotalTick(conn: PoolClient): Promise<void> {
  const { rows } = await conn.query(
    `SELECT pn.id, pn.score_dimensions
     FROM processed_news pn
     JOIN raw_items ri ON ri.id = pn.raw_item_id
     WHERE ri.l1_status = 'completed'
       AND pn.score_dimensions IS NOT NULL
       AND pn.score_total IS NULL
     LIMIT 200`,
  );
  for (const row of rows) {
    const dims = typeof row.score_dimensions === "string"
      ? JSON.parse(row.score_dimensions)
      : row.score_dimensions;
    if (!isValidDims(dims)) {
      log.warn("SCORE BACKFILL skip id=%s score_dimensions 结构不完整", row.id);
      continue;
    }
    if (isSilentZeroDims(dims)) {
      log.warn("SCORE BACKFILL skip id=%s 四维全 0 且 reason 全空（LLM 未表态兜底形态，非真实 0 分）", row.id);
      continue;
    }
    await conn.query(
      `UPDATE processed_news SET score_total = $1 WHERE id = $2 AND score_total IS NULL`,
      [calcScoreTotal(dims), row.id],
    );
  }
}

// ── 阶段 1：库内相关新闻检索（ILIKE）─────────────────────────

export async function kbSearch(conn: PoolClient, rawItemId: string, sourceId: string): Promise<Array<{ title: string; summary: string }>> {
  try {
    // 读取 raw_item 标题/摘要用于关键词提取
    const { rows: [row] } = await conn.query(
      `SELECT content FROM raw_items WHERE id = $1`,
      [rawItemId],
    );
    if (!row) return [];

    const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
    const text = (content.text as string) || (content.title as string) || (content.body as string) || "";
    const keywords = extractKeywords(text);

    if (keywords.length === 0) return [];

    const param1 = `%${keywords[0]}%`;
    const param2 = `%${keywords.length > 1 ? keywords[1] : keywords[0]}%`;

    const { rows } = await conn.query(
      `SELECT pn.title, pn.summary
       FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       WHERE ri.source_id != $1
         AND (pn.title ILIKE $2 OR pn.summary ILIKE $3)
         AND pn.published_at > now() - interval '7 days'
       ORDER BY pn.importance_score DESC, pn.published_at DESC
       LIMIT 5`,
      [sourceId, param1, param2],
    );
    return rows;
  } catch (err: any) {
    log.warn("L1 KB SEARCH FAILED raw_item_id=%s error=%s", rawItemId, err.message);
    return [];
  }
}

export function extractKeywords(text: string, maxTokens: number = 3): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
    "to", "for", "of", "and", "or", "but", "it", "this", "that",
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都",
  ]);
  const cleaned = text.replace(/[^\w一-鿿\s]/g, " ").toLowerCase();
  const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 2 && !stopWords.has(t));
  const freq: Record<string, number> = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, maxTokens).map(([w]) => w);
}

// ── 阶段 2：链接读取 ────────────────────────────────────────

export async function linkRead(rawItemUrl: string | null): Promise<string | null> {
  if (!rawItemUrl) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(rawItemUrl, { signal: controller.signal });
    clearTimeout(t);
    if (!resp.ok) return null;
    const html = await resp.text();
    // 简单文本提取：去标签取 body 文本，截取前 2000 字
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 2000);
  } catch {
    return null;
  }
}

// ── 阶段 3：外部搜索 ────────────────────────────────────────
// 由后端直接调真实 web.search（已实测可靠），把结果喂给 news-l1 agent；
// 不让 agent 自主搜——embedded 不跑 tool-use 循环，且模型会谎报 sources=web_search。
export async function externalSearch(rawText: string): Promise<string | null> {
  const query = extractKeywords(rawText, 5).join(" ");
  if (!query) return null;
  return webSearch(query);
}

// ── L1 process 主入口 ───────────────────────────────────────

export async function processL1(conn: PoolClient, task: any): Promise<void> {
  const rawItemId = task.raw_item_id;
  if (!rawItemId) throw new Error("missing raw_item_id");
  const sourceId = task.source_id;

  const prepared = await buildL1InputForRawItem(conn, rawItemId);
  const row = prepared.row;
  const content = prepared.content;
  const kbResults = prepared.kbResults;
  const linkContent = prepared.linkContent;
  const searchSummary = prepared.searchSummary;
  const l1Input = prepared.input;

  // 更新为 processing
  await conn.query(
    `UPDATE raw_items SET l1_status = 'processing' WHERE id = $1`,
    [rawItemId],
  );

  // ── 阶段 4：主处理 ───────────────────────────────────────
  let l1Result: L1Output;
  let engineTag: string;
  if (config.l1Engine === "ai") {
    try {
      l1Result = await processL1ViaAiHub(l1Input);
      engineTag = "engine:ai-hub";
      log.info("L1 STAGE4 ai-hub ok raw_item_id=%s", rawItemId);
    } catch (err: any) {
      (err as any).errorKind = classifyL1ErrorKind(err);
      throw err;
    }
  } else if (config.l1Engine === "agent") {
    try {
      l1Result = await processL1ViaAgent(l1Input);
      engineTag = "engine:agent";
      log.info("L1 STAGE4 agent ok raw_item_id=%s", rawItemId);
    } catch (err: any) {
      log.warn("L1 STAGE4 agent FAILED raw_item_id=%s err=%s — 回退内建 LLM 仅翻译", rawItemId, err.message);
      try {
        const tr = await translateOnly(l1Input.rawText);
        l1Result = buildFallbackOutput(tr);
        engineTag = "engine:fallback";
      } catch (ferr: any) {
        (ferr as any).errorKind = classifyL1ErrorKind(ferr);
        throw ferr;
      }
    }
  } else {
    try {
      l1Result = await processL1LLM(l1Input);
      engineTag = "engine:builtin";
    } catch (err: any) {
      (err as any).errorKind = classifyL1ErrorKind(err);
      throw err;
    }
  }
  // 引擎标记写入 tags.processing，便于事后筛选/重处理（尤其 engine:fallback 项）
  l1Result.tags.processing = [...(l1Result.tags.processing || []), engineTag];

  const scoreTotal = calcScoreTotal(l1Result.score_dimensions);

  // ── 阶段 5：写入 + 新闻位置分发 ────────────────────────────
  // #D7：source_refs 扩展结构定义
  const sourceRefs = {
    url: row.source_item_url || null,
    source_id: String(row.source_id),
    kb_ids: kbResults.map((_: any, i: number) => `kb_${i + 1}`),
    link_fetched: linkContent !== null,
    search_fetched: searchSummary !== null,
  };

  const { rows: [inserted] } = await conn.query(
    `INSERT INTO processed_news(
       raw_item_id, title, summary, language, source_refs, published_at,
       bullets, tags, entities, importance_score,
       translation, context, analysis, score_total, score_dimensions, tags_v2, created_at)
     VALUES($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10,
            $11::jsonb, $12::jsonb, $13, $14, $15::jsonb, $16::jsonb, now())
     ON CONFLICT (raw_item_id) DO NOTHING
     RETURNING id, title, published_at`,
    [
      rawItemId,
      l1Result.title || "无标题",
      l1Result.summary || l1Result.title || "",
      "zh",
      JSON.stringify(sourceRefs),
      row.published_at || null,
      JSON.stringify([]),  // bullets: v0.6 L1 不产出 bullets，保留空数组
      JSON.stringify([]),  // tags: v0.5 兼容字段，L1 产出在 tags_v2
      JSON.stringify([]),  // entities: v0.5 兼容字段
      0,                    // importance_score: v0.5 兼容字段
      JSON.stringify(l1Result.translation || { zh: l1Result.summary || "" }),
      JSON.stringify(l1Result.context || []),
      l1Result.analysis || null,
      scoreTotal,
      JSON.stringify(l1Result.score_dimensions),
      JSON.stringify(l1Result.tags || {}),
    ],
  );

  if (inserted) {
    // 更新 raw_items 为 completed
    await conn.query(
      `UPDATE raw_items SET l1_status = 'completed', l1_processed_at = now(), l1_attempt = $2 WHERE id = $1`,
      [rawItemId, task.attempt || 1],
    );

    log.info("L1 COMPLETED raw_item_id=%s news_id=%s title=%s score=%.1f",
      rawItemId, inserted.id, String(inserted.title).slice(0, 80), scoreTotal);

    // news_positions 由触发器 trg_processed_news_auto_link 自动创建
  } else {
    // 去重：该 raw_item 已有 processed_news，更新为 completed
    await conn.query(
      `UPDATE raw_items SET l1_status = 'completed', l1_processed_at = now() WHERE id = $1`,
      [rawItemId],
    );
    log.debug("L1 DEDUPED raw_item_id=%s", rawItemId);
  }
}

export async function buildL1InputForRawItem(conn: PoolClient, rawItemId: string): Promise<{
  row: any;
  content: Record<string, unknown>;
  input: L1Input;
  kbResults: Array<{ title: string; summary: string }>;
  linkContent: string | null;
  searchSummary: string | null;
}> {
  const { rows: [row] } = await conn.query(
    `SELECT ri.id, ri.source_id, ri.source_item_url, ri.published_at, ri.content,
            s.type AS source_type, s.identity, s.domain_tags
     FROM raw_items ri
     JOIN sources s ON s.id = ri.source_id
     WHERE ri.id = $1`,
    [rawItemId],
  );
  if (!row) throw new Error("raw_item not found");

  const rawContent = typeof row.content === "string" ? JSON.parse(row.content) : row.content;
  const content = normalizeRawContent(rawContent, row.source_item_url || null);

  log.info("L1 START raw_item_id=%s source=%s source_type=%s", rawItemId, row.identity, row.source_type);

  const rawText = extractRawText(content);
  const domainTags: string[] = Array.isArray(row.domain_tags)
    ? row.domain_tags
    : typeof row.domain_tags === "object" && row.domain_tags !== null
      ? Object.values(row.domain_tags)
      : [];

  // ── 阶段 1：库内检索（失败不阻断）─────────────────────────
  const kbResults = await kbSearch(conn, rawItemId, row.source_id);
  log.info("L1 STAGE1 kb_search raw_item_id=%s found=%d", rawItemId, kbResults.length);

  // ── 阶段 2：链接读取（失败不阻断）─────────────────────────
  const linkContent = await linkRead(row.source_item_url || null);
  log.info("L1 STAGE2 link_read raw_item_id=%s fetched=%s len=%d",
    rawItemId, linkContent ? "yes" : "no", linkContent?.length || 0);

  // ── 阶段 3：外部搜索（后端实搜，失败不阻断）────────────────
  const searchSummary = await externalSearch(rawText);
  log.info("L1 STAGE3 external_search raw_item_id=%s fetched=%s", rawItemId, searchSummary ? "yes" : "no");

  const l1Input: L1Input = {
    sourceIdentity: String(row.identity || ""),
    domainTags,
    rawContent: content,
    rawText,
    kbResults,
    linkContent,
    searchSummary,
  };
  return { row, content, input: l1Input, kbResults, linkContent, searchSummary };
}

// ── 工具函数 ─────────────────────────────────────────────────

function extractRawText(content: Record<string, unknown>): string {
  return (content.text as string)
    || (content.body as string)
    || (content.title as string)
    || (content.description as string)
    || JSON.stringify(content);
}

function normalizeRawContent(content: Record<string, unknown>, sourceItemUrl: string | null): Record<string, unknown> {
  if (!sourceItemUrl || typeof content.url === "string" || typeof content.canonical_url === "string") {
    return content;
  }
  return { ...content, url: sourceItemUrl };
}

function classifyL1ErrorKind(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("aborted")) return "network";
  if (msg.includes("429") || msg.includes("5xx") || msg.includes("retryable")) return "llm";
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) return "auth";
  if (msg.includes("json") || msg.includes("parse") || msg.includes("unparseable")) return "parse";
  if (msg.includes("link_read") || msg.includes("link fetch")) return "link";
  if (msg.includes("kb")) return "kb";
  if (msg.includes("search")) return "x_search";
  return "unknown";
}
