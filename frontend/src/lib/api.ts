import { API_BASE_URL } from "@/config";
import { requestJson } from "@/lib/http";
import type {
  Alert,
  ChannelSource,
  ChannelSourceWithSource,
  ChannelSpace,
  ChannelStats,
  FetchPolicy,
  LogQueryResponse,
  ProcessedNews,
  Source,
  SourceVerifyResponse,
  SourceWithBindings,
  SubChannel,
  UUID,
} from "@/lib/types";
import type { NewsSort } from "@/lib/types";

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// ── ChannelSpace ──────────────────────────────────────────

export async function listSpaces(): Promise<ChannelSpace[]> {
  return requestJson(buildUrl("/v1/channel-spaces"));
}

export async function createSpace(payload: { name: string; description?: string }): Promise<ChannelSpace> {
  return requestJson(buildUrl("/v1/channel-spaces"), { method: "POST", body: payload });
}

// ── Source CRUD (v0.2 重构版) ────────────────────────────

export async function listSources(opts?: { status?: string; type?: string }): Promise<SourceWithBindings[]> {
  const qs = new URLSearchParams();
  if (opts?.status) qs.set("status", opts.status);
  if (opts?.type) qs.set("type", opts.type);
  const query = qs.toString();
  return requestJson(buildUrl(`/v1/sources${query ? "?" + query : ""}`));
}

export async function createSource(payload: {
  display_name: string;
  source_url?: string;
  type?: string;
  config?: Record<string, unknown>;
}): Promise<Source> {
  return requestJson(buildUrl("/v1/sources"), { method: "POST", body: payload });
}

export async function getSource(id: UUID): Promise<SourceWithBindings> {
  return requestJson(buildUrl(`/v1/sources/${id}`));
}

export async function updateSource(
  id: UUID,
  payload: { display_name?: string; source_url?: string; type?: string; config?: Record<string, unknown> },
): Promise<Source> {
  return requestJson(buildUrl(`/v1/sources/${id}`), { method: "PUT", body: payload });
}

export async function deleteSource(id: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/sources/${id}`), { method: "DELETE" });
}

// ── Source 验证 ──────────────────────────────────────────

export async function verifySource(id: UUID): Promise<SourceVerifyResponse> {
  return requestJson(buildUrl(`/v1/sources/${id}/verify`), { method: "POST" });
}

export async function markVerified(id: UUID): Promise<{ status: string }> {
  return requestJson(buildUrl(`/v1/sources/${id}/mark-verified`), { method: "POST" });
}

export async function detectSourceType(url: string): Promise<{ type: string; url: string }> {
  return requestJson(buildUrl(`/v1/sources/detect-type?url=${encodeURIComponent(url)}`));
}

// ── ChannelSource 绑定 ───────────────────────────────────

export async function listChannelSources(spaceId: UUID): Promise<ChannelSourceWithSource[]> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/sources`));
}

export async function bindSource(
  spaceId: UUID,
  payload: { source_id: UUID; enabled: boolean; fetch_policy: FetchPolicy; sub_channel_id?: UUID },
): Promise<ChannelSource> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/sources`), { method: "POST", body: payload });
}

export async function updateChannelSource(
  channelSourceId: UUID,
  payload: { enabled?: boolean; fetch_policy?: FetchPolicy; sub_channel_id?: UUID },
): Promise<ChannelSource> {
  return requestJson(buildUrl(`/v1/channel-sources/${channelSourceId}`), { method: "PUT", body: payload });
}

// ── News ─────────────────────────────────────────────────

export async function listNews(
  spaceId: UUID,
  opts?: { limit?: number; offset?: number; subChannelId?: string; sort?: NewsSort; q?: string },
): Promise<ProcessedNews[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (opts?.subChannelId) qs.set("sub_channel_id", opts.subChannelId);
  if (opts?.sort) qs.set("sort", opts.sort);
  if (opts?.q) qs.set("q", opts.q);
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/news?${qs.toString()}`));
}

export async function getNews(newsId: UUID): Promise<ProcessedNews> {
  return requestJson(buildUrl(`/v1/news/${newsId}`));
}

// ── Stats ────────────────────────────────────────────────

export async function getChannelStats(spaceId: UUID): Promise<ChannelStats> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/stats`));
}

export async function getGlobalStats(): Promise<ChannelStats> {
  return requestJson(buildUrl("/v1/stats"));
}

// ── SubChannel ───────────────────────────────────────────

export async function listSubChannels(spaceId: UUID): Promise<SubChannel[]> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/sub-channels`));
}

export async function createSubChannel(spaceId: UUID, payload: { name: string; sort_order?: number }): Promise<SubChannel> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/sub-channels`), { method: "POST", body: payload });
}

export async function updateSubChannel(subChannelId: UUID, payload: { name?: string; sort_order?: number }): Promise<SubChannel> {
  return requestJson(buildUrl(`/v1/sub-channels/${subChannelId}`), { method: "PUT", body: payload });
}

export async function deleteSubChannel(subChannelId: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/sub-channels/${subChannelId}`), { method: "DELETE" });
}

// ── Admin Logs ───────────────────────────────────────────

export async function queryLogs(params: {
  level?: string;
  source?: string;
  keyword?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<LogQueryResponse> {
  const qs = new URLSearchParams();
  if (params.level) qs.set("level", params.level);
  if (params.source) qs.set("source", params.source);
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return requestJson(buildUrl(`/v1/admin/logs?${qs.toString()}`));
}

export async function getLogsConfig(): Promise<{ levels: string[]; sources: string[]; log_files: Record<string, string> }> {
  return requestJson(buildUrl("/v1/admin/logs/config"));
}

// ── Alerts ───────────────────────────────────────────────

export async function listAlerts(spaceId?: UUID, limit = 50): Promise<Alert[]> {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (spaceId) qs.set("channel_space_id", spaceId);
  return requestJson(buildUrl(`/v1/alerts?${qs.toString()}`));
}
