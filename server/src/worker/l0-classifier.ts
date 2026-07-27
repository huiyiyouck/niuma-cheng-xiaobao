import type { PoolClient } from "pg";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { classifyL0LLM } from "./llm.ts";
import type { L0Input } from "./llm.ts";
import { maxAttemptsForTaskType } from "./dispatcher.ts";

const log = workerLogger;

// ── 规则引擎 ─────────────────────────────────────────────────

interface RuleResult {
  skip: boolean;
  reason?: string;
}

function ruleEngine(content: Record<string, unknown>, existingHash: string | null): RuleResult {
  // a. 空文本
  const text = extractText(content);
  if (!text || text.trim().length === 0) {
    return { skip: true, reason: "empty_text" };
  }

  // b. 内容哈希重复
  // （在 classifyL0 中通过 DB 查询，此处仅检查 hash 是否与已知重复哈希一致）
  if (existingHash) {
    return { skip: true, reason: "duplicate_content_hash" };
  }

  // c. 纯 emoji（字母+数字占比 < 5%）
  const alphanumeric = text.replace(/[^a-zA-Z0-9一-鿿]/g, "").length;
  if (alphanumeric / Math.max(1, text.length) < 0.05) {
    return { skip: true, reason: "emoji_only" };
  }

  // d. 纯转发无新增文本
  const isRetweet = content.retweet || content.is_retweet;
  const hasAddedText = content.added_text || content.quoted_text;
  if (isRetweet && !hasAddedText) {
    return { skip: true, reason: "retweet_no_added_text" };
  }

  // e. 抽奖/招聘/无关广告关键词
  const spamPatterns = [
    /抽奖.*转发/, /转发.*抽奖/, /关注.*送/, /免费领取/,
    /招聘/, /急招/, /高薪诚聘/, /内推/,
    /广告(?!费|收入|市场|投放)/,
  ];
  for (const p of spamPatterns) {
    if (p.test(text)) {
      return { skip: true, reason: `spam:${p.source}` };
    }
  }

  return { skip: false };
}

function extractText(content: Record<string, unknown>): string {
  return (content.text as string)
    || (content.body as string)
    || (content.description as string)
    || (content.title as string)
    || JSON.stringify(content);
}

// ── 关键词提取 ───────────────────────────────────────────────

function extractKeywords(text: string, maxTokens: number = 3): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
    "to", "for", "of", "and", "or", "but", "it", "this", "that",
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都",
    "一个", "没有", "这个", "也", "还", "要", "会", "可以",
  ]);

  const cleaned = text.replace(/[^\w一-鿿\s]/g, " ").toLowerCase();
  const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 2 && !stopWords.has(t));

  const freq: Record<string, number> = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTokens)
    .map(([word]) => word);
}

// ── L0 classify 主入口 ───────────────────────────────────────

export async function classifyL0(conn: PoolClient, task: any): Promise<void> {
  const rawItemId = task.raw_item_id;
  if (!rawItemId) throw new Error("missing raw_item_id");

  const { rows: [row] } = await conn.query(
    `SELECT ri.id, ri.source_id, ri.content, ri.content_hash, ri.source_item_url, ri.published_at,
            s.type AS source_type, s.identity, s.domain_tags, s.attention_level
     FROM raw_items ri
     JOIN sources s ON s.id = ri.source_id
     WHERE ri.id = $1`,
    [rawItemId],
  );
  if (!row) throw new Error("raw_item not found");

  const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content;

  // 先更新为 processing
  await conn.query(
    `UPDATE raw_items SET l0_status = 'processing' WHERE id = $1`,
    [rawItemId],
  );

  // 1. 规则引擎判定
  const ruleResult = ruleEngine(content, null);
  if (ruleResult.skip) {
    await conn.query(
      `UPDATE raw_items SET l0_status = 'skipped', l0_label = $2, l0_processed_at = now() WHERE id = $1`,
      [rawItemId, ruleResult.reason],
    );
    log.info("L0 SKIPPED raw_item_id=%s reason=%s", rawItemId, ruleResult.reason);
    return;
  }

  // 2. LLM 判定（语义判断：与 Source 主题无关 / 乱码）
  const domainTags: string[] = Array.isArray(row.domain_tags)
    ? row.domain_tags
    : typeof row.domain_tags === "object" && row.domain_tags !== null
      ? Object.values(row.domain_tags)
      : [];
  const attentionLevel = String(row.attention_level || "regular");

  const l0Input: L0Input = {
    content,
    sourceIdentity: String(row.identity || ""),
    domainTags,
    attentionLevel,
  };

  let l0Result: { label: string; skipReason?: string };
  try {
    l0Result = await classifyL0LLM(l0Input);
  } catch (err: any) {
    // LLM 调用失败 → 错误由 dispatcher requeueTask 处理
    (err as any).errorKind = classifyL0ErrorKind(err);
    throw err;
  }

  if (l0Result.label === "skip") {
    await conn.query(
      `UPDATE raw_items SET l0_status = 'skipped', l0_label = $2, l0_processed_at = now() WHERE id = $1`,
      [rawItemId, l0Result.skipReason || "llm_skip"],
    );
    log.info("L0 SKIPPED (LLM) raw_item_id=%s reason=%s", rawItemId, l0Result.skipReason);
    return;
  }

  // 3+4. 通过 → 占位 processed_news（database 模式，#PM-IMPL-1/#A1）+ 置 queued + 建 L1 task。
  // 遗留 #3：三步包显式事务——若置 queued 后建 task 前崩溃，该条将永远 queued 无 task 不被处理
  const l1TaskType = config.aiIntegrationMode === "database" ? "l1_ai_process" : "l1_process";
  await conn.query("BEGIN");
  try {
    if (config.aiIntegrationMode === "database") {
      const direct = extractPlaceholderNews(row.source_type, content);
      // 遗留 #4：published_at 写 raw_items 真值（原 NULL 致列表按时间排序沉底）；
      // language 固定 'zh'（契约 news-l1-db C-7：该列为产出内容语种，非原文语种）
      await conn.query(
        `INSERT INTO processed_news(
           raw_item_id, title, summary, language, source_refs, published_at,
           bullets, tags, entities, importance_score, created_at)
         VALUES($1, $2, $3, 'zh', $4::jsonb, $5, $6::jsonb, $7::jsonb, $8::jsonb, 0, now())
         ON CONFLICT (raw_item_id) DO NOTHING`,
        [
          rawItemId,
          direct.title,
          direct.summary,
          JSON.stringify({ source_id: String(row.source_id) }),
          row.published_at ?? null,
          JSON.stringify([]),
          JSON.stringify(direct.tags || []),
          JSON.stringify([]),
        ],
      );
      log.info("L0 PLACEHOLDER raw_item_id=%s title=%s", rawItemId, direct.title.slice(0, 80));
    }

    await conn.query(
      `UPDATE raw_items SET l0_status = 'passed', l0_label = $2, l0_processed_at = now(),
           l1_status = 'queued'
       WHERE id = $1`,
      [rawItemId, l0Result.label],
    );

    await conn.query(
      `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, max_attempts, created_at, updated_at)
       VALUES($1, $2, $3, 'queued', 0, now(), $4, now(), now())`,
      [l1TaskType, row.source_id, rawItemId, maxAttemptsForTaskType(l1TaskType)],
    );
    await conn.query("COMMIT");
  } catch (err) {
    await conn.query("ROLLBACK");
    throw err;
  }

  log.info("L0 PASSED raw_item_id=%s label=%s l1_task=%s", rawItemId, l0Result.label, l1TaskType);
}

/** 从 raw_items.content 提取占位标题/摘要（AI 处理前的基础展示；language 由调用方按契约 C-7 固定 'zh'） */
function extractPlaceholderNews(sourceType: string, content: Record<string, unknown>) {
  if (sourceType === "x_twitter") {
    const text = textOf(content.text);
    const username = textOf(content.author_username);
    return {
      title: truncateTitle(text) || (username ? `@${username}` : "X/Twitter"),
      summary: text,
      tags: ["X/Twitter"],
    };
  }

  const title = textOf(content.title);
  const summary = textOf(content.summary) || textOf(content.content) || title;
  return {
    title: title || truncateTitle(summary) || "未命名新闻",
    summary,
    tags: [],
  };
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncateTitle(text: string): string {
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function classifyL0ErrorKind(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("timeout") || msg.includes("aborted")) return "network";
  if (msg.includes("json") || msg.includes("parse")) return "parse";
  if (msg.includes("401") || msg.includes("403")) return "auth";
  return "llm";
}
