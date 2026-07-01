import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import type { L1Input, L1Output } from "./llm.ts";
import { validateL1Output } from "./openclaw.ts";

const log = workerLogger;

export interface AiHubL1Input {
  source_identity: string;
  domain_tags: string[];
  raw_content: Record<string, unknown>;
  raw_text: string;
  kb_results: Array<Record<string, unknown>>;
  link_content: string | null;
  search_summary: string | null;
  options: {
    max_tool_calls: number;
    timeout_ms: number;
  };
}

export interface AiHubToolSummary {
  web_search: number;
  link_read: number;
  kb_search: number;
}

export interface AiHubRunResponse {
  run_id: string;
  status: "succeeded" | "failed";
  elapsed_ms: number;
  tool_summary: AiHubToolSummary;
  output: L1Output | null;
  error: string | null;
}

export interface AiHubRunOptions {
  maxToolCalls?: number;
  timeoutMs?: number;
}

export function toAiHubL1Input(input: L1Input, options: AiHubRunOptions = {}): AiHubL1Input {
  return {
    source_identity: input.sourceIdentity,
    domain_tags: input.domainTags,
    raw_content: input.rawContent,
    raw_text: input.rawText,
    kb_results: input.kbResults,
    link_content: input.linkContent,
    search_summary: input.searchSummary,
    options: {
      max_tool_calls: options.maxToolCalls ?? 4,
      timeout_ms: options.timeoutMs ?? config.aiHubTimeoutMs,
    },
  };
}

export async function callAiHubNewsL1(input: L1Input, options: AiHubRunOptions = {}): Promise<AiHubRunResponse> {
  const body = toAiHubL1Input(input, options);
  const controller = new AbortController();
  const timeoutMs = body.options.timeout_ms;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${config.aiHubBaseUrl.replace(/\/$/, "")}/v1/runs/news-l1`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.aiHubApiToken) headers.Authorization = `Bearer ${config.aiHubApiToken}`;

    const startedAt = Date.now();
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`AI Hub HTTP ${resp.status}: ${text.slice(0, 300)}`);
    }
    const raw = text ? JSON.parse(text) : {};
    const result: AiHubRunResponse = {
      run_id: String(raw.run_id || ""),
      status: raw.status === "succeeded" ? "succeeded" : "failed",
      elapsed_ms: Number(raw.elapsed_ms ?? Date.now() - startedAt),
      tool_summary: {
        web_search: Number(raw.tool_summary?.web_search ?? 0),
        link_read: Number(raw.tool_summary?.link_read ?? 0),
        kb_search: Number(raw.tool_summary?.kb_search ?? 0),
      },
      output: raw.output ? validateL1Output(raw.output) : null,
      error: raw.error == null ? null : String(raw.error),
    };
    log.info("AI HUB news-l1 status=%s run_id=%s elapsed_ms=%d", result.status, result.run_id, result.elapsed_ms);
    return result;
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error(`AI Hub timeout after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function processL1ViaAiHub(input: L1Input): Promise<L1Output> {
  const result = await callAiHubNewsL1(input);
  if (result.status !== "succeeded" || !result.output) {
    throw new Error(result.error || "AI Hub news-l1 failed without output");
  }
  return result.output;
}
