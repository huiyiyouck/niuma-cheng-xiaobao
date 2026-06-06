import { API_BASE_URL } from "@/config";
import { requestJson } from "@/lib/http";
import type {
  Alert,
  Channel,
  DisplayPosition,
  ProcessedNews,
  Source,
  SourceListParams,
  SourceListResponse,
  SourceVerifyResponse,
  SourceWithPositions,
  Space,
  SpaceStats,
  UUID,
} from "@/lib/types";
import type { NewsSort } from "@/lib/types";

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

// ── Space 空间 ────────────────────────────────────────────

export async function listSpaces(): Promise<Space[]> {
  return requestJson(buildUrl("/v1/spaces"));
}

export async function createSpace(payload: { name: string; description?: string }): Promise<Space> {
  return requestJson(buildUrl("/v1/spaces"), { method: "POST", body: payload });
}

export async function updateSpace(id: UUID, payload: { name?: string; description?: string }): Promise<Space> {
  return requestJson(buildUrl(`/v1/spaces/${id}`), { method: "PUT", body: payload });
}

export async function reorderSpaces(payload: { items: { id: UUID; sort_order: number }[] }): Promise<{ ok: boolean }> {
  return requestJson(buildUrl("/v1/spaces/reorder"), { method: "PUT", body: payload });
}

export async function deleteSpace(id: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/spaces/${id}`), { method: "DELETE" });
}

export async function getSpaceDeletePreview(id: UUID): Promise<import("@/lib/types").SpaceDeletePreview> {
  return requestJson(buildUrl(`/v1/spaces/${id}/delete-preview`));
}

// ── Channel 频道 ──────────────────────────────────────────

export async function listChannels(spaceId: UUID): Promise<Channel[]> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels`));
}

export async function createChannel(spaceId: UUID, payload: { name: string; sort_order?: number }): Promise<Channel> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels`), { method: "POST", body: payload });
}

export async function updateChannel(id: UUID, payload: { name?: string; sort_order?: number }): Promise<Channel> {
  return requestJson(buildUrl(`/v1/channels/${id}`), { method: "PUT", body: payload });
}

export async function reorderChannels(spaceId: UUID, payload: { items: { id: UUID; sort_order: number }[] }): Promise<{ ok: boolean }> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels/reorder`), { method: "PUT", body: payload });
}

export async function deleteChannel(id: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/channels/${id}`), { method: "DELETE" });
}

export async function getChannelDeletePreview(id: UUID): Promise<import("@/lib/types").ChannelDeletePreview> {
  return requestJson(buildUrl(`/v1/channels/${id}/delete-preview`));
}

// ── Source 信息源 CRUD ────────────────────────────────────

export async function listSources(params?: SourceListParams): Promise<SourceListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.type) qs.set("type", params.type);
  if (params?.availability_status) qs.set("availability_status", params.availability_status);
  if (params?.operational_status) qs.set("operational_status", params.operational_status);
  if (params?.domain_tag) qs.set("domain_tag", params.domain_tag);
  if (params?.source_role) qs.set("source_role", params.source_role);
  if (params?.attention_level) qs.set("attention_level", params.attention_level);
  if (params?.space_id) qs.set("space_id", params.space_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return requestJson(buildUrl(`/v1/sources${query ? "?" + query : ""}`));
}

export async function getSource(id: UUID): Promise<SourceWithPositions> {
  return requestJson(buildUrl(`/v1/sources/${id}`));
}

export async function createSource(payload: {
  type: string;
  source_identity: string;
  display_name: string;
  domain_tags?: string[];
  source_role?: string;
  content_topics?: string[];
  attention_level?: string;
  notes?: string;
}): Promise<Source> {
  return requestJson(buildUrl("/v1/sources"), { method: "POST", body: payload });
}

export async function updateSource(id: UUID, payload: {
  display_name?: string;
  source_identity?: string;
  domain_tags?: string[];
  source_role?: string;
  content_topics?: string[];
  attention_level?: string;
  notes?: string;
  fetch_config?: Record<string, unknown>;
}): Promise<Source> {
  return requestJson(buildUrl(`/v1/sources/${id}`), { method: "PUT", body: payload });
}

export async function deleteSource(id: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/sources/${id}`), { method: "DELETE" });
}

export async function getSourceDeleteImpact(id: UUID): Promise<import("@/lib/types").DeleteImpact> {
  return requestJson(buildUrl(`/v1/sources/${id}/delete-impact`));
}

// ── Source 验证 ────────────────────────────────────────────

export async function verifySource(id: UUID): Promise<SourceVerifyResponse> {
  return requestJson(buildUrl(`/v1/sources/${id}/verify`), { method: "POST" });
}

export async function preVerifySource(payload: { type: string; source_identity: string }): Promise<SourceVerifyResponse> {
  return requestJson(buildUrl("/v1/sources/pre-verify"), { method: "POST", body: payload });
}

export async function checkDuplicateSource(payload: { type: string; source_identity: string }): Promise<{ is_duplicate: boolean; existing_source?: Source }> {
  return requestJson(buildUrl("/v1/sources/check-duplicate"), { method: "POST", body: payload });
}

// 身份变更历史
export async function getIdentityHistory(sourceId: UUID): Promise<import("@/lib/types").IdentityChangeRecord[]> {
  return requestJson(buildUrl(`/v1/sources/${sourceId}/identity-history`));
}

// ── 展示位置 ──────────────────────────────────────────────

export async function addDisplayPosition(sourceId: UUID, payload: { space_id: UUID; channel_id?: UUID | null }): Promise<DisplayPosition> {
  return requestJson(buildUrl(`/v1/sources/${sourceId}/positions`), { method: "POST", body: payload });
}

export async function removeDisplayPosition(positionId: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/positions/${positionId}`), { method: "DELETE" });
}

export async function toggleDisplayPosition(positionId: UUID, enabled: boolean): Promise<DisplayPosition> {
  return requestJson(buildUrl(`/v1/positions/${positionId}/toggle`), { method: "POST", body: { enabled } });
}

// ── 空间管理中使用的 Source（按展示位置过滤）──────────────

export async function listSpaceSources(spaceId: UUID, channelId?: UUID | null): Promise<SourceWithPositions[]> {
  const qs = new URLSearchParams();
  if (channelId) qs.set("channel_id", channelId);
  const query = qs.toString();
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/sources${query ? "?" + query : ""}`));
}

// ── News 新闻 ─────────────────────────────────────────────

export async function listNews(
  spaceId: UUID,
  opts?: { limit?: number; offset?: number; channelId?: string; sort?: NewsSort; q?: string },
): Promise<ProcessedNews[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (opts?.channelId) qs.set("channel_id", opts.channelId);
  if (opts?.sort) qs.set("sort", opts.sort);
  if (opts?.q) qs.set("q", opts.q);
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/news?${qs.toString()}`));
}

export async function getNews(newsId: UUID): Promise<ProcessedNews> {
  return requestJson(buildUrl(`/v1/news/${newsId}`));
}

// ── Stats 统计 ────────────────────────────────────────────

export async function getSpaceStats(spaceId: UUID): Promise<SpaceStats> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/stats`));
}

export async function getGlobalStats(): Promise<import("@/lib/types").StatsOverview> {
  return requestJson(buildUrl("/v1/stats"));
}

export async function getAdminStats(): Promise<{ total_spaces: number; total_channels: number; total_sources: number; unprocessed_alerts: number }> {
  return requestJson(buildUrl("/v1/admin/stats"));
}

// ── Alerts 告警 ───────────────────────────────────────────

export async function listAlerts(params?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ alerts: Alert[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return requestJson(buildUrl(`/v1/alerts?${qs.toString()}`));
}

export async function updateAlertStatus(id: UUID, status: string): Promise<Alert> {
  return requestJson(buildUrl(`/v1/alerts/${id}`), { method: "PATCH", body: { status } });
}

export async function getUnprocessedAlertCount(): Promise<{ count: number }> {
  return requestJson(buildUrl("/v1/alerts/unprocessed-count"));
}

// ── Admin Logs ────────────────────────────────────────────

export async function queryLogs(params: {
  level?: string;
  source?: string;
  keyword?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<import("@/lib/types").LogQueryResponse> {
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
