// API 客户端：基于后端 /v1 REST 契约（与 v0.6 联调版一致）。
// base 用相对路径：dev 由 vite proxy 转发到 :8001，生产由 nginx 反代。

type UUID = string;

interface RequestOpts {
  method?: string;
  body?: unknown;
}

const BASE = "";

async function requestJson<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : {},
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Space 空间 ────────────────────────────────────────────
export const listSpaces = () => requestJson("/v1/spaces");
export const createSpace = (payload: { name: string; description?: string; icon?: string }) =>
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
}) => requestJson("/v1/sources", { method: "POST", body: payload });
export const updateSource = (id: UUID, payload: {
  display_name?: string; source_identity?: string; domain_tags?: string[]; source_role?: string;
  content_topics?: string[]; attention_level?: string; notes?: string | null; fetch_config?: Record<string, unknown>;
}) => requestJson(`/v1/sources/${id}`, { method: "PATCH", body: payload });
export const deleteSource = (id: UUID) => requestJson(`/v1/sources/${id}`, { method: "DELETE" });
export const pauseSource = (id: UUID) => requestJson(`/v1/sources/${id}/pause`, { method: "POST" });
export const resumeSource = (id: UUID) => requestJson(`/v1/sources/${id}/resume`, { method: "POST" });
export const verifySource = (id: UUID) => requestJson(`/v1/sources/${id}/verify`, { method: "POST" });
export const preVerifySource = (payload: { type: string; source_identity: string }) =>
  requestJson("/v1/sources/pre-verify", { method: "POST", body: payload });
export const checkDuplicateSource = (payload: { type: string; source_identity: string }) =>
  requestJson("/v1/sources/check-duplicate", { method: "POST", body: payload });
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
export function listNews(spaceId: UUID, opts?: { page?: number; page_size?: number; channel_id?: string; sort?: string; search?: string }) {
  const qs = new URLSearchParams();
  qs.set("space_id", spaceId);
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.page_size) qs.set("page_size", String(opts.page_size));
  if (opts?.channel_id) qs.set("channel_id", opts.channel_id);
  if (opts?.sort) qs.set("sort", opts.sort);
  if (opts?.search) qs.set("search", opts.search);
  return requestJson(`/v1/news?${qs.toString()}`);
}
export const getNews = (id: UUID) => requestJson(`/v1/news/${id}`);

// ── Stats 统计 ────────────────────────────────────────────
export const getSpaceStats = (spaceId: UUID) => requestJson(`/v1/stats?space_id=${spaceId}`);
export const getGlobalStats = () => requestJson("/v1/global-stats");

// ── Alerts 告警 ───────────────────────────────────────────
export const listAlerts = (opts?: { include_processed?: boolean }) =>
  requestJson(`/v1/alerts${opts?.include_processed ? "?include_processed=true" : ""}`);
export const getUnreadAlertsCount = () => requestJson("/v1/alerts/unread-count");
export const markAlertProcessed = (id: UUID) => requestJson(`/v1/alerts/${id}/process`, { method: "POST" });

// ── Logs 日志 ─────────────────────────────────────────────
export const getLogsConfig = () => requestJson("/v1/logs/config");
