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

export async function createSpace(payload: { name: string; description?: string; icon?: string }): Promise<Space> {
  return requestJson(buildUrl("/v1/spaces"), { method: "POST", body: payload });
}

export async function updateSpace(id: UUID, payload: { name?: string; description?: string; icon?: string }): Promise<Space> {
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

export async function createChannel(spaceId: UUID, payload: { name: string; description?: string | null; sort_order?: number }): Promise<Channel> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels`), { method: "POST", body: payload });
}

export async function updateChannel(spaceId: UUID, channelId: UUID, payload: { name?: string; description?: string | null; sort_order?: number }): Promise<Channel> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels/${channelId}`), { method: "PUT", body: payload });
}

export async function reorderChannels(spaceId: UUID, payload: { items: { id: UUID; sort_order: number }[] }): Promise<{ ok: boolean }> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels/reorder`), { method: "PUT", body: payload });
}

export async function deleteChannel(spaceId: UUID, channelId: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels/${channelId}`), { method: "DELETE", body: { action: "remove_all" } });
}

export async function getChannelDeletePreview(spaceId: UUID, channelId: UUID): Promise<import("@/lib/types").ChannelDeletePreview> {
  return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels/${channelId}/delete-preview`));
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
  if (params?.limit) qs.set("page_size", String(params.limit));
  if (params?.offset && params?.limit) qs.set("page", String(Math.floor(params.offset / params.limit) + 1));
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
  notes?: string | null;
  fetch_config?: Record<string, unknown>;
}): Promise<Source> {
  return requestJson(buildUrl(`/v1/sources/${id}`), { method: "PATCH", body: payload });
}

export async function deleteSource(id: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/sources/${id}`), { method: "DELETE" });
}

// v0.5.1: X Source 反向同步
export async function syncXRules(): Promise<{ added: number; updated: number; removed: number; restored: number }> {
  return requestJson(buildUrl(`/v1/x/sync-rules`), { method: "POST" });
}

export async function pauseSource(id: UUID): Promise<{ paused: boolean }> {
  return requestJson(buildUrl(`/v1/sources/${id}/pause`), { method: "POST" });
}

export async function resumeSource(id: UUID): Promise<{ paused: boolean }> {
  return requestJson(buildUrl(`/v1/sources/${id}/resume`), { method: "POST" });
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

export async function addDisplayPosition(payload: { source_id: UUID; space_id: UUID; channel_id?: UUID | null }): Promise<DisplayPosition> {
  return requestJson(buildUrl(`/v1/spaces/${payload.space_id}/positions`), { method: "POST", body: { source_id: payload.source_id, channel_id: payload.channel_id ?? null } });
}

export async function removeDisplayPosition(positionId: UUID): Promise<void> {
  return requestJson(buildUrl(`/v1/positions/${positionId}`), { method: "PATCH", body: { action: "remove" } });
}

export async function toggleDisplayPosition(positionId: UUID, enabled: boolean): Promise<DisplayPosition> {
  return requestJson(buildUrl(`/v1/positions/${positionId}`), { method: "PATCH", body: { action: enabled ? "resume" : "pause" } });
}

export async function moveDisplayPosition(positionId: UUID, channelId: UUID | null): Promise<DisplayPosition> {
  return requestJson(buildUrl(`/v1/positions/${positionId}`), { method: "PATCH", body: { action: "move", channel_id: channelId } });
}

// ── 空间管理中使用的 Source（按展示位置过滤）──────────────

function mapLifecycleStatus(s: string): string {
  const map: Record<string, string> = { normal: "normal", needs_fix: "awaiting_repair", source_error: "source_error", removed: "source_removed" };
  return map[s] || s;
}

type RawPosition = {
  id: string; source_id: string; channel_space_id: string; channel_id: string | null;
  channel_name: string | null; enabled: boolean; created_at: string;
  source: { type: string; identity: string; display_name: string; lifecycle_status: string;
    paused?: boolean; domain_tags: string[]; source_role: string; attention_level: string; notes: string | null;
    last_success_at: string | null; consecutive_failures: number; last_fetch_count: number; };
};

export async function listSpaceSources(spaceId: UUID, channelId?: UUID | null): Promise<SourceWithPositions[]> {
  const qs = new URLSearchParams();
  if (channelId) qs.set("channel_id", channelId);
  const query = qs.toString();
  const rawPositions: RawPosition[] = await requestJson(buildUrl(`/v1/spaces/${spaceId}/positions${query ? "?" + query : ""}`));

  // 按 source_id 聚合，转换为 SourceWithPositions 格式
  const sourceMap = new Map<string, SourceWithPositions>();
  for (const p of rawPositions) {
    if (!sourceMap.has(p.source_id)) {
      const s = p.source;
      sourceMap.set(p.source_id, {
        id: p.source_id,
        type: s.type as SourceWithPositions["type"],
        source_identity: s.identity,
        display_name: s.display_name,
        availability_status: mapLifecycleStatus(s.lifecycle_status) as SourceWithPositions["availability_status"],
        operational_status: "stopped",
        domain_tags: (s.domain_tags || []) as SourceWithPositions["domain_tags"],
        source_role: s.source_role as SourceWithPositions["source_role"],
        content_topics: [],
        attention_level: s.attention_level as SourceWithPositions["attention_level"],
        notes: s.notes,
        last_fetched_at: s.last_success_at,
        last_verified_at: null,
        verify_error: null,
        last_error: null,
        last_fetch_count: s.last_fetch_count ?? 0,
        next_fetch_at: null,
        consecutive_failures: s.consecutive_failures ?? 0,
        total_news_count: s.last_fetch_count ?? 0,
        fetch_config: {},
        source_origin: "manual" as const,
        x_rule_id: null,
        paused: s.paused ?? false,
        created_at: p.created_at,
        updated_at: p.created_at,
        display_positions: [],
      });
    }
    sourceMap.get(p.source_id)!.display_positions.push({
      id: p.id,
      source_id: p.source_id,
      space_id: p.channel_space_id,
      space_name: "",
      channel_id: p.channel_id,
      channel_name: p.channel_name,
      enabled: p.enabled,
      created_at: p.created_at,
    });
  }
  // 根据 display_positions 和 paused 计算 operational_status
  for (const src of sourceMap.values()) {
    if (src.paused) { src.operational_status = "stopped"; continue; }
    const hasEnabled = src.display_positions.some(p => p.enabled);
    const availabilityOk = src.availability_status === "normal";
    src.operational_status = hasEnabled && availabilityOk ? "fetching" : "stopped";
  }
  return Array.from(sourceMap.values());
}

// ── News 新闻 ─────────────────────────────────────────────

export async function listNews(
  spaceId: UUID,
  opts?: { limit?: number; offset?: number; channelId?: string; sort?: NewsSort; q?: string },
): Promise<ProcessedNews[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const qs = new URLSearchParams();
  qs.set("space_id", spaceId);
  qs.set("page", String(Math.floor(offset / limit) + 1));
  qs.set("page_size", String(limit));
  if (opts?.channelId) qs.set("channel_id", opts.channelId);
  if (opts?.sort) qs.set("sort", opts.sort);
  if (opts?.q) qs.set("search", opts.q);
  return requestJson(buildUrl(`/v1/news?${qs.toString()}`));
}

export async function getNews(newsId: UUID): Promise<ProcessedNews> {
  return requestJson(buildUrl(`/v1/news/${newsId}`));
}

// ── Stats 统计 ────────────────────────────────────────────

export async function getSpaceStats(spaceId: UUID): Promise<SpaceStats> {
  return requestJson(buildUrl(`/v1/stats?space_id=${spaceId}`));
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
}): Promise<{ alerts: Alert[]; total: number; counts: Record<string, number> }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  if (params?.limit) { qs.set("page", String(1)); qs.set("page_size", String(params.limit)); }
  if (params?.offset && params?.limit) qs.set("page", String(Math.floor(params.offset / params.limit) + 1));
  return requestJson(buildUrl(`/v1/alerts?${qs.toString()}`));
}

export async function updateAlertStatus(id: UUID, status: string): Promise<Alert> {
  return requestJson(buildUrl(`/v1/alerts/${id}`), { method: "PATCH", body: { status } });
}

export async function batchUpdateAlerts(fromStatus: string, toStatus: string): Promise<{ updated: number }> {
  return requestJson(buildUrl("/v1/alerts/batch"), { method: "PATCH", body: { status: toStatus, from: fromStatus } });
}

export async function getUnprocessedAlertCount(): Promise<{ count: number }> {
  return requestJson(buildUrl("/v1/alerts/unread-count"));
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
