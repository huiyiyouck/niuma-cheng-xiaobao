import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

// ── v0.5 兼容类型 ───────────────────────────────────────────
interface NewsCard {
  title: string;
  summary: string;
  language: string;
  bullets: string[];
  tags: string[];
  entities: Array<{ name: string; type: string }>;
  importance_score: number;
}

// ── v0.6 L0/L1 类型 ─────────────────────────────────────────
export interface L0Input {
  content: Record<string, unknown>;
  sourceIdentity: string;
  domainTags: string[];
  attentionLevel: string;
}

export interface L0Output {
  label: "normal_candidate" | "high_priority_candidate" | "needs_context_candidate" | "skip";
  skipReason?: string;
}

export interface L1Input {
  sourceIdentity: string;
  domainTags: string[];
  rawContent: Record<string, unknown>;
  rawText: string;
  kbResults: Array<{ title: string; summary: string }>;
  linkContent: string | null;
  searchSummary: string | null;
}

export interface L1Output {
  title: string;
  summary: string;
  translation: { zh: string; original?: string };
  context: Array<{
    text: string;
    confidence: "fact" | "inference" | "uncertain";
    sources: Array<"source" | "link" | "library" | "x_search" | "web_search">;
  }>;
  analysis: string;
  score_dimensions: {
    timeliness: { score: number; reason: string };
    impact: { score: number; reason: string };
    confidence: { score: number; reason: string };
    clarity: { score: number; reason: string };
  };
  tags: {
    domain: string[];
    entity: string[];
    event: string[];
    content_type: string[];
    processing: string[];
  };
  needs_context: boolean;
}

// ── 通用工具 ────────────────────────────────────────────────

export function extractFirstJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ── callLLM<T> 通用 helper（v0.6 新增，向前兼容 v0.5）───────

export interface LLMCallOpts {
  model?: string;
  timeout?: number;
}

export async function callLLM<T>(prompt: string, opts: LLMCallOpts = {}): Promise<T> {
  if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is required");

  const model = opts.model || config.openaiModel;
  const timeoutMs = opts.timeout || config.llmTimeoutMs;
  const maxRetries = Math.max(1, config.llmMaxRetries);
  const promptSize = prompt.length;

  log.info("LLM CALL model=%s prompt_len=%d retries_max=%d timeout_ms=%d", model, promptSize, maxRetries, timeoutMs);

  let lastErr: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
      clearTimeout(t);

      if ([429, 500, 502, 503, 504].includes(resp.status)) {
        throw new Error(`LLM retryable error: HTTP ${resp.status}`);
      }
      if (!resp.ok) {
        throw new Error(`LLM error: HTTP ${resp.status} ${await resp.text()}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      const latency = Date.now() - t0;
      const usage = data.usage;
      const usageStr = usage
        ? `tokens_in=${usage.prompt_tokens} tokens_out=${usage.completion_tokens} tokens_total=${usage.total_tokens}`
        : "usage=n/a";

      let obj: Record<string, unknown>;
      let parseMethod = "json.parse";
      try {
        obj = JSON.parse(content);
      } catch {
        const extracted = extractFirstJsonObject(content);
        if (!extracted) throw new Error(`LLM returned unparseable content: ${content.slice(0, 200)}`);
        obj = extracted;
        parseMethod = "extractFirstJsonObject";
      }

      if (typeof obj === "string") {
        try {
          obj = JSON.parse(obj);
          parseMethod = "double-parse";
        } catch {
          obj = { raw: obj } as Record<string, unknown>;
          parseMethod = "raw-string";
        }
      }

      log.info("LLM OK attempt=%d/%d latency_ms=%d parse=%s resp_len=%d %s",
        i + 1, maxRetries, latency, parseMethod, content.length, usageStr);
      return obj as unknown as T;
    } catch (err: any) {
      lastErr = err;
      const latency = Date.now() - t0;
      log.warn("LLM RETRY attempt=%d/%d latency_ms=%d err=%s", i + 1, maxRetries, latency, err.message);
      if (i >= maxRetries - 1) break;
      const delay = config.llmRetryBaseSeconds * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }
  }

  log.error("LLM EXHAUSTED model=%s retries=%d last_err=%s", model, maxRetries, lastErr?.message);
  throw lastErr || new Error("LLM processing failed");
}

// ── v0.5 processLLM（重构为 callLLM 封装）───────────────────

function validateLLMOutput(result: Record<string, unknown>): NewsCard {
  let title = typeof result.title === "string" && result.title.trim()
    ? result.title
    : "无标题";
  let summary = typeof result.summary === "string" && result.summary.trim()
    ? result.summary
    : title;
  let bullets: string[] = Array.isArray(result.bullets)
    ? result.bullets.filter((b): b is string => typeof b === "string" && !!b).slice(0, 5)
    : [];
  let tags: string[] = Array.isArray(result.tags)
    ? result.tags.filter((t): t is string => typeof t === "string" && !!t).slice(0, 5)
    : [];
  let entities: Array<{ name: string; type: string }> = Array.isArray(result.entities)
    ? result.entities.filter(
        (e): e is { name: string; type: string } =>
          typeof e === "object" && e !== null && typeof e.name === "string" && !!e.name,
      )
    : [];

  let score = Number(result.importance_score);
  if (isNaN(score)) score = 0;
  score = Math.max(0, Math.min(10, score));

  let language = typeof result.language === "string" && result.language.trim()
    ? result.language
    : "zh";

  return { title, summary, language, bullets, tags, entities, importance_score: score };
}

export async function processLLM(text: string, sourceUrl?: string | null): Promise<NewsCard> {
  const prompt = `把下面内容处理成中文新闻卡片，做翻译与深度摘要。
要求：
1) 如果原文是英文，翻译成中文
2) 输出中文标题(title)和中文摘要(summary)
3) summary 80-200 字
4) 提炼 3-5 个核心要点(bullets)，每个不超过 50 字
5) 生成 3-5 个分类标签(tags)
6) 识别关键实体(entities)，每个包含 name 和 type(person/org/product/tech)
7) 评估重要性评分(importance_score)，0-10 浮点数，考虑时效性、影响力、相关性
8) 只输出严格 JSON，不要输出多余文字
JSON 格式：{"title":"...","summary":"...","bullets":["..."],"tags":["..."],"entities":[{"name":"...","type":"..."}],"importance_score":7.5,"language":"zh"}
source_url: ${sourceUrl || ""}

content:
${text}`;

  log.info("LLM v0.5 PROCESS source_url=%s content_len=%d", sourceUrl || "(none)", text.length);
  const result = await callLLM<Record<string, unknown>>(prompt, { model: config.openaiModel });
  const validated = validateLLMOutput(result);
  log.info("LLM v0.5 RESULT title=%s score=%.1f tags=%d entities=%d",
    validated.title.slice(0, 80), validated.importance_score, validated.tags.length, validated.entities.length);
  return validated;
}

// ── v0.6 L0 classifier ──────────────────────────────────────

export async function classifyL0LLM(input: L0Input): Promise<L0Output> {
  const prompt = `判断以下信息是否需要送入后续的 AI 分析处理流程。

Source 身份：${input.sourceIdentity}
Source 领域标签：${input.domainTags.join(", ")}
Source 关注级别：${input.attentionLevel}

原始信息内容：
${JSON.stringify(input.content, null, 2)}

判断标准：
- normal_candidate：正常信息，与 Source 领域相关，应送入分析
- high_priority_candidate：高优先级（重大事件、突发新闻、官方公告）
- needs_context_candidate：需要补充背景（含链接/项目代号/缩写，单独一条信息上下文不足）
- skip：明显无关、纯广告、抽奖、纯转发无新增内容（给出 skipReason）

只输出严格 JSON：{"label":"normal_candidate"|"high_priority_candidate"|"needs_context_candidate"|"skip","skipReason":"仅 label=skip 时需要"}`;

  log.info("LLM L0 CLASSIFY source=%s attention=%s tags=%s",
    input.sourceIdentity, input.attentionLevel, input.domainTags.join(","));
  const result = await callLLM<L0Output>(prompt, { model: config.l0LlmModel });
  log.info("LLM L0 RESULT label=%s skipReason=%s", result.label, result.skipReason || "(none)");
  return result;
}

// ── v0.6 L1 processor ───────────────────────────────────────

export async function processL1LLM(input: L1Input): Promise<L1Output> {
  const kbText = input.kbResults.length > 0
    ? input.kbResults.map((r, i) => `${i + 1}. ${r.title} — ${r.summary}`).join("\n")
    : "无";

  const prompt = `你的角色：信息分析助手

输入：
- Source 身份：${input.sourceIdentity}（${input.domainTags.join(", ")}）
- 原始信息：${input.rawText}
- 库内相关新闻（最多 5 条）：${kbText}
- 链接内容：${input.linkContent || "无"}
- 搜索摘要：${input.searchSummary || "无"}

请输出以下 JSON（只输出 JSON，不要多余文字）：
{
  "title": "中文标题",
  "summary": "中文摘要（80-200字）",
  "translation": { "zh": "中文翻译", "original": "原文" },
  "context": [
    {
      "text": "一段背景补全文本",
      "confidence": "fact|inference|uncertain",
      "sources": ["source"|"link"|"library"|"x_search"|"web_search"]
    }
  ],
  "analysis": "AI 分析与评价",
  "score_dimensions": {
    "timeliness": { "score": 1-5 整数, "reason": "评分理由" },
    "impact": { "score": 1-5 整数, "reason": "评分理由" },
    "confidence": { "score": 1-5 整数, "reason": "评分理由" },
    "clarity": { "score": 1-5 整数, "reason": "评分理由" }
  },
  "tags": {
    "domain": ["标签"],
    "entity": ["标签"],
    "event": ["标签"],
    "content_type": ["标签"],
    "processing": ["标签"]
  },
  "needs_context": true|false
}`;

  log.info("LLM L1 PROCESS source=%s raw_len=%d kb_count=%d has_link=%s has_search=%s",
    input.sourceIdentity, input.rawText.length, input.kbResults.length,
    input.linkContent ? "yes" : "no", input.searchSummary ? "yes" : "no");
  const result = await callLLM<L1Output>(prompt, {
    model: config.l1LlmModel,
    timeout: config.llmTimeoutMs,
  });
  const dims = result.score_dimensions;
  log.info("LLM L1 RESULT title=%s tags_count=%d scores=T%d I%d C%d X%d needs_context=%s",
    (result.title || "").slice(0, 80),
    (result.tags?.domain || []).length + (result.tags?.entity || []).length + (result.tags?.event || []).length + (result.tags?.content_type || []).length + (result.tags?.processing || []).length,
    dims?.timeliness?.score || 0, dims?.impact?.score || 0,
    dims?.confidence?.score || 0, dims?.clarity?.score || 0,
    result.needs_context);
  return result;
}

// ── v0.6 回退：内建 LLM 只做翻译（agent 处理失败时的保底，不做分析/评分）─────

export async function translateOnly(text: string): Promise<{ title: string; zh: string }> {
  const prompt = `把下面内容翻译成中文，并起一个简短中文标题。只输出严格 JSON，不要多余文字：
{"title":"中文标题","zh":"中文翻译"}

content:
${text}`;
  const result = await callLLM<Record<string, unknown>>(prompt, { model: config.l1LlmModel });
  return {
    title: typeof result.title === "string" && result.title.trim() ? result.title : "无标题",
    zh: typeof result.zh === "string" && result.zh.trim() ? result.zh : text,
  };
}
