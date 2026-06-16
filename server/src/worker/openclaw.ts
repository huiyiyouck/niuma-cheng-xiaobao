import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { extractFirstJsonObject } from "./llm.ts";
import type { L1Input, L1Output } from "./llm.ts";

const log = workerLogger;
const execFileAsync = promisify(execFile);

// stdout 里可能混入插件告警等噪音，截取第一个 JSON 对象起始位置
function sliceJson(stdout: string): string {
  const i = stdout.indexOf("{");
  return i >= 0 ? stdout.slice(i) : stdout;
}

// ── 真实网页搜索（Server 直接调 web.search capability，不依赖模型自觉）──────
//
// 方向 B 的核心：由后端把「真实搜索结果」喂给 agent，而不是让 agent 自主搜
// （embedded 模式不跑 tool-use 循环，且模型会谎报 sources=web_search）。
export async function webSearch(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const { stdout } = await execFileAsync(
      config.openclawBin,
      ["capability", "web", "search", "--query", q, "--json"],
      { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
    );
    const data: any = JSON.parse(sliceJson(stdout));
    const results: any[] = data?.outputs?.[0]?.result?.results ?? [];
    if (!results.length) return null;
    const summary = results
      .slice(0, config.webSearchMaxResults)
      .map((r, i) => `${i + 1}. ${r.title || ""}：${String(r.content || r.snippet || "").slice(0, 200)}`)
      .join("\n");
    log.info("WEB SEARCH ok query=%s results=%d", q, results.length);
    return summary || null;
  } catch (err: any) {
    log.warn("WEB SEARCH failed query=%s err=%s", q, err.message);
    return null;
  }
}

// ── 调 news-l1 agent 做 L1 加工 ───────────────────────────────

function buildAgentMessage(input: L1Input): string {
  const kbText = input.kbResults.length > 0
    ? input.kbResults.map((r, i) => `${i + 1}. ${r.title} — ${r.summary}`).join("\n")
    : "无";
  return `来源身份：${input.sourceIdentity}（${input.domainTags.join(", ")}）
原始信息：${input.rawText}
库内相关新闻（最多5条）：${kbText}
链接内容：${input.linkContent || "无"}
搜索摘要（已由后台实搜，可信）：${input.searchSummary || "无"}`;
}

export async function processL1ViaAgent(input: L1Input): Promise<L1Output> {
  const message = buildAgentMessage(input);
  const { stdout } = await execFileAsync(
    config.openclawBin,
    [
      "agent", "--agent", config.openclawAgentId, "--local",
      "--message", message, "--json",
      "--timeout", String(Math.floor(config.openclawTimeoutMs / 1000)),
    ],
    { timeout: config.openclawTimeoutMs + 10_000, maxBuffer: 16 * 1024 * 1024 },
  );
  const envelope: any = JSON.parse(sliceJson(stdout));
  const text: string | undefined = envelope?.payloads?.[0]?.text;
  if (!text) throw new Error("openclaw agent returned empty payload");
  const obj = extractFirstJsonObject(text);
  if (!obj) throw new Error("openclaw agent output unparseable");
  return validateL1Output(obj);
}

// ── 输出校验与兜底（保证结构完整，calcScoreTotal 不会因缺字段崩溃）──────────

function num1to5(v: unknown): number {
  const n = Math.round(Number(v));
  return isNaN(n) ? 3 : Math.max(1, Math.min(5, n));
}

function dim(d: any): { score: number; reason: string } {
  return { score: num1to5(d?.score), reason: typeof d?.reason === "string" ? d.reason : "" };
}

function strArr(a: unknown): string[] {
  return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && !!x) : [];
}

export function validateL1Output(o: Record<string, unknown>): L1Output {
  const sd = (o.score_dimensions || {}) as any;
  const tags = (o.tags || {}) as any;
  const tr = (o.translation || {}) as any;
  return {
    title: typeof o.title === "string" && o.title.trim() ? o.title : "无标题",
    summary: typeof o.summary === "string" ? o.summary : "",
    translation: {
      zh: typeof tr.zh === "string" ? tr.zh : (typeof o.summary === "string" ? o.summary : ""),
      original: typeof tr.original === "string" ? tr.original : undefined,
    },
    context: Array.isArray(o.context)
      ? (o.context as any[])
          .filter((c) => c && typeof c.text === "string")
          .map((c) => ({
            text: c.text as string,
            confidence: ["fact", "inference", "uncertain"].includes(c.confidence) ? c.confidence : "uncertain",
            sources: Array.isArray(c.sources) ? c.sources : [],
          }))
      : [],
    analysis: typeof o.analysis === "string" ? o.analysis : "",
    score_dimensions: {
      timeliness: dim(sd.timeliness),
      impact: dim(sd.impact),
      confidence: dim(sd.confidence),
      clarity: dim(sd.clarity),
    },
    tags: {
      domain: strArr(tags.domain),
      entity: strArr(tags.entity),
      event: strArr(tags.event),
      content_type: strArr(tags.content_type),
      processing: strArr(tags.processing),
    },
    needs_context: Boolean(o.needs_context),
  };
}

// 回退：仅有翻译结果时构造一个最小 L1Output（评分中性，标记待重处理）
export function buildFallbackOutput(tr: { title: string; zh: string }): L1Output {
  return validateL1Output({
    title: tr.title,
    summary: tr.zh.slice(0, 200),
    translation: { zh: tr.zh },
    context: [],
    analysis: "",
    score_dimensions: {},
    tags: { processing: [] },
    needs_context: true,
  });
}
