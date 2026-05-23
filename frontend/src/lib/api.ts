import { API_BASE_URL } from "@/config";
import { requestJson } from "@/lib/http";
import type { Alert, ChannelSource, ChannelSourceWithSource, ChannelSpace, FetchPolicy, ProcessedNews, Source, SubChannel, UUID } from "@/lib/types";

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function listSpaces(): Promise<ChannelSpace[]> {
  return requestJson(buildUrl("/v1/channel-spaces"));
}

export async function createSpace(payload: { name: string; description?: string }): Promise<ChannelSpace> {
  return requestJson(buildUrl("/v1/channel-spaces"), { method: "POST", body: payload });
}

export async function listSources(): Promise<Source[]> {
  return requestJson(buildUrl("/v1/sources"));
}

export async function createSource(payload: { type: string; name: string; config: Record<string, unknown> }): Promise<Source> {
  return requestJson(buildUrl("/v1/sources"), { method: "POST", body: payload });
}

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

export async function listNews(
  spaceId: UUID,
  opts?: { limit?: number; offset?: number; subChannelId?: UUID },
): Promise<ProcessedNews[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (opts?.subChannelId) qs.set("sub_channel_id", opts.subChannelId);
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/news?${qs.toString()}`));
}

export async function getNews(newsId: UUID): Promise<ProcessedNews> {
  return requestJson(buildUrl(`/v1/news/${newsId}`));
}

export async function listAlerts(spaceId?: UUID, limit = 50): Promise<Alert[]> {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (spaceId) qs.set("channel_space_id", spaceId);
  return requestJson(buildUrl(`/v1/alerts?${qs.toString()}`));
}

// 子频道 CRUD（v0.1 定义函数签名，v0.2 接入 UI）

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
