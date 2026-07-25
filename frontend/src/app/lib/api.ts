// API 客户端：基于后端 /v1 REST 契约（与 v0.6 联调版一致）。
// base 用相对路径：dev 由 vite proxy 转发到 :8001，生产由 nginx 反代。

type UUID = string;

interface RequestOpts {
  method?: string;
  body?: unknown;
}

const BASE = "";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, path: string, detail: string) {
    super(`HTTP ${status} ${path} ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function requestJson<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = opts.body !== undefined ? { "Content-Type": "application/json" } : {};
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ApiError(res.status, path, detail);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Space 空间 ────────────────────────────────────────────
export const listSpaces = () => requestJson("/v1/spaces");
export const createSpace = (payload: { name: string; description?: string; icon?: string; sort_order?: number }) =>
  requestJson("/v1/spaces", { method: "POST", body: payload });
export const updateSpace = (id: UUID, payload: { name?: string; description?: string; icon?: string }) =>
  requestJson(`/v1/spaces/${id}`, { method: "PUT", body: payload });
export const deleteSpace = (id: UUID) => requestJson(`/v1/spaces/${id}`, { method: "DELETE" });
export const getSpaceDeletePreview = (id: UUID) => requestJson(`/v1/spaces/${id}/delete-preview`);
export const reorderSpaces = (items: { id: UUID; sort_order: number }[]) =>
  requestJson("/v1/spaces/reorder", { method: "PUT", body: { items } });

// 空间图标上传/删除（multipart）
export async function uploadSpaceIcon(id: UUID, file: File): Promise<{ icon_url: string; icon_type: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/v1/spaces/${id}/icon`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`HTTP ${res.status} icon upload`);
  return res.json();
}
export const deleteSpaceIcon = (id: UUID) => requestJson(`/v1/spaces/${id}/icon`, { method: "DELETE" });

// ── Channel 频道 ──────────────────────────────────────────
export const listChannels = (spaceId: UUID) => requestJson(`/v1/spaces/${spaceId}/channels`);
export const createChannel = (spaceId: UUID, payload: { name: string; description?: string | null; sort_order?: number }) =>
  requestJson(`/v1/spaces/${spaceId}/channels`, { method: "POST", body: payload });
export const updateChannel = (spaceId: UUID, channelId: UUID, payload: { name?: string; description?: string | null; sort_order?: number }) =>
  requestJson(`/v1/spaces/${spaceId}/channels/${channelId}`, { method: "PUT", body: payload });
export const deleteChannel = (spaceId: UUID, channelId: UUID) =>
  requestJson(`/v1/spaces/${spaceId}/channels/${channelId}`, { method: "DELETE", body: { action: "remove_all" } });
export const getChannelDeletePreview = (spaceId: UUID, channelId: UUID) =>
  requestJson(`/v1/spaces/${spaceId}/channels/${channelId}/delete-preview`);
export const reorderChannels = (spaceId: UUID, items: { id: UUID; sort_order: number }[]) =>
  requestJson(`/v1/spaces/${spaceId}/channels/reorder`, { method: "PUT", body: { items } });

// ── Source 信息源 ─────────────────────────────────────────
export function listSources(params?: {
  search?: string; type?: string; lifecycle_status?: string; operational_status?: string;
  domain_tag?: string; source_role?: string; attention_level?: string; space_id?: string;
  page?: number; page_size?: number;
}) {
  const qs = new URLSearchParams();
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const query = qs.toString();
  return requestJson(`/v1/sources${query ? "?" + query : ""}`);
}
export const getSource = (id: UUID) => requestJson(`/v1/sources/${id}`);
export const createSource = (payload: {
  type: string; source_identity: string; display_name: string;
  domain_tags?: string[]; source_role?: string; content_topics?: string[]; attention_level?: string; notes?: string;
}) => requestJson("/v1/sources", { method: "POST", body: {
  type: payload.type,
  identity: payload.source_identity, // 后端字段名为 identity
  display_name: payload.display_name,
  domain_tags: payload.domain_tags,
  source_role: payload.source_role,
  content_topics: payload.content_topics,
  attention_level: payload.attention_level,
  notes: payload.notes,
} });
export const updateSource = (id: UUID, payload: {
  display_name?: string; source_identity?: string; domain_tags?: string[]; source_role?: string;
  content_topics?: string[]; attention_level?: string; notes?: string | null; fetch_config?: Record<string, unknown>;
}) => requestJson(`/v1/sources/${id}`, { method: "PATCH", body: payload });
export const deleteSource = (id: UUID) => requestJson(`/v1/sources/${id}`, { method: "DELETE" });
export const pauseSource = (id: UUID) => requestJson(`/v1/sources/${id}/pause`, { method: "POST" });
export const resumeSource = (id: UUID) => requestJson(`/v1/sources/${id}/resume`, { method: "POST" });
// 新建前预验证：后端只有 POST /v1/sources/verify（body 字段为 identity）
export const preVerifySource = (payload: { type: string; source_identity: string }) =>
  requestJson("/v1/sources/verify", { method: "POST", body: { type: payload.type, identity: payload.source_identity } });
export const syncXRules = () => requestJson("/v1/x/sync-rules", { method: "POST" });

// ── 展示位置 ──────────────────────────────────────────────
export const addDisplayPosition = (payload: { source_id: UUID; space_id: UUID; channel_id?: UUID | null }) =>
  requestJson(`/v1/spaces/${payload.space_id}/positions`, { method: "POST", body: { source_id: payload.source_id, channel_id: payload.channel_id ?? null } });
export const removeDisplayPosition = (positionId: UUID) =>
  requestJson(`/v1/positions/${positionId}`, { method: "PATCH", body: { action: "remove" } });
export const toggleDisplayPosition = (positionId: UUID, enabled: boolean) =>
  requestJson(`/v1/positions/${positionId}`, { method: "PATCH", body: { action: enabled ? "resume" : "pause" } });
export const moveDisplayPosition = (positionId: UUID, channelId: UUID | null) =>
  requestJson(`/v1/positions/${positionId}`, { method: "PATCH", body: { action: "move", channel_id: channelId } });

// 空间管理中按展示位置聚合的 Source（一个 source 含其在该空间的所有 position）
function mapLifecycleStatus(s: string): string {
  const map: Record<string, string> = { normal: "normal", needs_fix: "awaiting_repair", source_error: "source_error", removed: "source_removed" };
  return map[s] || s;
}
export async function listSpaceSources(spaceId: UUID, channelId?: UUID | null): Promise<any[]> {
  const qs = new URLSearchParams();
  if (channelId) qs.set("channel_id", channelId);
  const query = qs.toString();
  const rawPositions: any[] = await requestJson(`/v1/spaces/${spaceId}/positions${query ? "?" + query : ""}`);
  const sourceMap = new Map<string, any>();
  for (const p of rawPositions) {
    if (!sourceMap.has(p.source_id)) {
      const s = p.source;
      sourceMap.set(p.source_id, {
        id: p.source_id,
        type: s.type,
        source_identity: s.identity,
        display_name: s.display_name,
        availability_status: mapLifecycleStatus(s.lifecycle_status),
        domain_tags: s.domain_tags || [],
        source_role: s.source_role,
        attention_level: s.attention_level,
        notes: s.notes,
        last_fetched_at: s.last_success_at,
        consecutive_failures: s.consecutive_failures ?? 0,
        total_news_count: s.last_fetch_count ?? 0,
        paused: s.paused ?? false,
        display_positions: [],
      });
    }
    sourceMap.get(p.source_id).display_positions.push({
      id: p.id, source_id: p.source_id, space_id: p.channel_space_id, space_name: "",
      channel_id: p.channel_id, channel_name: p.channel_name, enabled: p.enabled, created_at: p.created_at,
    });
  }
  return Array.from(sourceMap.values());
}

// ── News 新闻 ─────────────────────────────────────────────
// v0.6.1 展示分层契约（对齐后端 newsToOut / newsDetailToOut）
export type ProcessType = "direct" | "ai";
export type L1Status =
  | "not_started" | "queued" | "processing" | "completed"
  | "retryable_failed" | "final_failed" | "skipped";

export interface NewsOut {
  id: UUID;
  title: string;
  summary: string | null;
  published_at: string | null;
  source: { id: UUID | null; name: string | null };
  score_total: number | null;
  tags_v2: unknown;
  process_type: ProcessType | null;
  l1_status: L1Status | null;
  l1_error: string | null;
  language: string | null;
  tags: string[];
  entities: unknown[];
  importance_score: number;
  created_at: string | null;
  [key: string]: unknown; // v0.5 兼容扁平字段
}

export interface NewsDetailOut extends NewsOut {
  score_dimensions: Record<string, number> | null; // timeliness/impact/confidence/clarity
  analysis: string | null;
  context: unknown[];
  translation: unknown;
  l0_status: string | null;
}

export function listNews(spaceId: UUID, opts?: { page?: number; page_size?: number; channel_id?: string; source_id?: string; sort?: string; search?: string }) {
  const qs = new URLSearchParams();
  qs.set("space_id", spaceId);
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.page_size) qs.set("page_size", String(opts.page_size));
  if (opts?.channel_id) qs.set("channel_id", opts.channel_id);
  if (opts?.source_id) qs.set("source_id", opts.source_id);
  if (opts?.sort) qs.set("sort", opts.sort);
  if (opts?.search) qs.set("search", opts.search);
  return requestJson<NewsOut[]>(`/v1/news?${qs.toString()}`);
}
export const getNews = (id: UUID) => requestJson<NewsDetailOut>(`/v1/news/${id}`);

// ── AI 处理统计（v0.6.1 §5.7 监控页 AI 概览）──────────────
export interface GlobalLevelStatusCounts {
  completed: number;
  skipped: number;
  retryable_failed: number;
  final_failed: number;
  pending: number;
  processing: number;
  total_ai: number;
  window_started_at: string;
}
export const getGlobalLevelStatusCounts = () =>
  requestJson<GlobalLevelStatusCounts>("/v1/global-level-status-counts");

// ── Stats 统计 ────────────────────────────────────────────
export const getSpaceStats = (spaceId: UUID) => requestJson(`/v1/stats?space_id=${spaceId}`);
export const getGlobalStats = () => requestJson("/v1/stats");

// ── Alerts 告警 ───────────────────────────────────────────
// status 省略时返回全部状态最新若干条；传 "active" 只看未处理，避免被大量 resolved 挤出分页上限
export const listAlerts = (opts?: { status?: string }) =>
  requestJson(`/v1/alerts?page_size=200${opts?.status ? `&status=${opts.status}` : ""}`);
export const getUnreadAlertsCount = () => requestJson("/v1/alerts/unread-count");
// 状态机：active → acknowledged|ignored；acknowledged → resolved|ignored；ignored → active
export const updateAlertStatus = (id: UUID, status: "acknowledged" | "ignored" | "resolved" | "active") =>
  requestJson(`/v1/alerts/${id}`, { method: "PATCH", body: { status } });
// 批量更新告警状态：传 status=acknowledged 一键把全部 active 告警标为已确认
export const batchUpdateAlertStatus = (status: "acknowledged" | "ignored" | "resolved") =>
  requestJson(`/v1/alerts/batch`, { method: "PATCH", body: { status } });

// ── Logs 日志（后端真实路径为 /v1/admin/logs）─────────────
export const getLogsConfig = () => requestJson("/v1/admin/logs/config");
export function listLogs(opts?: {
  level?: string; source?: string; keyword?: string;
  from?: string; to?: string;
  limit?: number; offset?: number;
}) {
  const qs = new URLSearchParams();
  if (opts) for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const query = qs.toString();
  return requestJson(`/v1/admin/logs${query ? "?" + query : ""}`);
}

// ── AI 联调 ───────────────────────────────────────────────
export function listAiDebugCandidates(opts?: { search?: string; page_size?: number }) {
  const qs = new URLSearchParams();
  if (opts?.search) qs.set("search", opts.search);
  if (opts?.page_size) qs.set("page_size", String(opts.page_size));
  const query = qs.toString();
  return requestJson(`/v1/ai-debug/candidates${query ? "?" + query : ""}`);
}

export function runAiDebugNewsL1(payload: {
  news_id?: UUID;
  raw_item_id?: UUID;
  options?: { max_tool_calls?: number; timeout_ms?: number };
}) {
  return requestJson("/v1/ai-debug/news-l1-runs", { method: "POST", body: payload });
}
