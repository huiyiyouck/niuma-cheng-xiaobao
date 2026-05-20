import { API_BASE_URL } from "@/config";
import { requestJson } from "@/lib/http";
import type { Alert, ChannelSource, ChannelSourceWithSource, ChannelSpace, FetchPolicy, ProcessedNews, Source, UUID } from "@/lib/types";

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
  payload: { source_id: UUID; enabled: boolean; fetch_policy: FetchPolicy },
): Promise<ChannelSource> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/sources`), { method: "POST", body: payload });
}

export async function updateChannelSource(
  channelSourceId: UUID,
  payload: { enabled?: boolean; fetch_policy?: FetchPolicy },
): Promise<ChannelSource> {
  return requestJson(buildUrl(`/v1/channel-sources/${channelSourceId}`), { method: "PUT", body: payload });
}

export async function listNews(spaceId: UUID, limit: number, offset: number): Promise<ProcessedNews[]> {
  return requestJson(buildUrl(`/v1/channel-spaces/${spaceId}/news?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`));
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
