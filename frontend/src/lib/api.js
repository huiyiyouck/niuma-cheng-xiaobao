import { API_BASE_URL } from "@/config";
import { requestJson } from "@/lib/http";
export function buildUrl(path) {
    return `${API_BASE_URL}${path}`;
}
// ── Space 空间 ────────────────────────────────────────────
export async function listSpaces() {
    return requestJson(buildUrl("/v1/spaces"));
}
export async function createSpace(payload) {
    return requestJson(buildUrl("/v1/spaces"), { method: "POST", body: payload });
}
export async function updateSpace(id, payload) {
    return requestJson(buildUrl(`/v1/spaces/${id}`), { method: "PUT", body: payload });
}
export async function reorderSpaces(payload) {
    return requestJson(buildUrl("/v1/spaces/reorder"), { method: "PUT", body: payload });
}
export async function deleteSpace(id) {
    return requestJson(buildUrl(`/v1/spaces/${id}`), { method: "DELETE" });
}
export async function getSpaceDeletePreview(id) {
    return requestJson(buildUrl(`/v1/spaces/${id}/delete-preview`));
}
// ── Channel 频道 ──────────────────────────────────────────
export async function listChannels(spaceId) {
    return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels`));
}
export async function createChannel(spaceId, payload) {
    return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels`), { method: "POST", body: payload });
}
export async function updateChannel(id, payload) {
    return requestJson(buildUrl(`/v1/channels/${id}`), { method: "PUT", body: payload });
}
export async function reorderChannels(spaceId, payload) {
    return requestJson(buildUrl(`/v1/spaces/${spaceId}/channels/reorder`), { method: "PUT", body: payload });
}
export async function deleteChannel(id) {
    return requestJson(buildUrl(`/v1/channels/${id}`), { method: "DELETE" });
}
export async function getChannelDeletePreview(id) {
    return requestJson(buildUrl(`/v1/channels/${id}/delete-preview`));
}
// ── Source 信息源 CRUD ────────────────────────────────────
export async function listSources(params) {
    const qs = new URLSearchParams();
    if (params?.search)
        qs.set("search", params.search);
    if (params?.type)
        qs.set("type", params.type);
    if (params?.availability_status)
        qs.set("availability_status", params.availability_status);
    if (params?.operational_status)
        qs.set("operational_status", params.operational_status);
    if (params?.domain_tag)
        qs.set("domain_tag", params.domain_tag);
    if (params?.source_role)
        qs.set("source_role", params.source_role);
    if (params?.attention_level)
        qs.set("attention_level", params.attention_level);
    if (params?.space_id)
        qs.set("space_id", params.space_id);
    if (params?.limit)
        qs.set("limit", String(params.limit));
    if (params?.offset)
        qs.set("offset", String(params.offset));
    const query = qs.toString();
    return requestJson(buildUrl(`/v1/sources${query ? "?" + query : ""}`));
}
export async function getSource(id) {
    return requestJson(buildUrl(`/v1/sources/${id}`));
}
export async function createSource(payload) {
    return requestJson(buildUrl("/v1/sources"), { method: "POST", body: payload });
}
export async function updateSource(id, payload) {
    return requestJson(buildUrl(`/v1/sources/${id}`), { method: "PUT", body: payload });
}
export async function deleteSource(id) {
    return requestJson(buildUrl(`/v1/sources/${id}`), { method: "DELETE" });
}
export async function getSourceDeleteImpact(id) {
    return requestJson(buildUrl(`/v1/sources/${id}/delete-impact`));
}
// ── Source 验证 ────────────────────────────────────────────
export async function verifySource(id) {
    return requestJson(buildUrl(`/v1/sources/${id}/verify`), { method: "POST" });
}
export async function preVerifySource(payload) {
    return requestJson(buildUrl("/v1/sources/pre-verify"), { method: "POST", body: payload });
}
export async function checkDuplicateSource(payload) {
    return requestJson(buildUrl("/v1/sources/check-duplicate"), { method: "POST", body: payload });
}
// 身份变更历史
export async function getIdentityHistory(sourceId) {
    return requestJson(buildUrl(`/v1/sources/${sourceId}/identity-history`));
}
// ── 展示位置 ──────────────────────────────────────────────
export async function addDisplayPosition(sourceId, payload) {
    return requestJson(buildUrl(`/v1/sources/${sourceId}/positions`), { method: "POST", body: payload });
}
export async function removeDisplayPosition(positionId) {
    return requestJson(buildUrl(`/v1/positions/${positionId}`), { method: "DELETE" });
}
export async function toggleDisplayPosition(positionId, enabled) {
    return requestJson(buildUrl(`/v1/positions/${positionId}/toggle`), { method: "POST", body: { enabled } });
}
// ── 空间管理中使用的 Source（按展示位置过滤）──────────────
export async function listSpaceSources(spaceId, channelId) {
    const qs = new URLSearchParams();
    if (channelId)
        qs.set("channel_id", channelId);
    const query = qs.toString();
    return requestJson(buildUrl(`/v1/spaces/${spaceId}/sources${query ? "?" + query : ""}`));
}
// ── News 新闻 ─────────────────────────────────────────────
export async function listNews(spaceId, opts) {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    qs.set("offset", String(offset));
    if (opts?.channelId)
        qs.set("channel_id", opts.channelId);
    if (opts?.sort)
        qs.set("sort", opts.sort);
    if (opts?.q)
        qs.set("q", opts.q);
    return requestJson(buildUrl(`/v1/spaces/${spaceId}/news?${qs.toString()}`));
}
export async function getNews(newsId) {
    return requestJson(buildUrl(`/v1/news/${newsId}`));
}
// ── Stats 统计 ────────────────────────────────────────────
export async function getSpaceStats(spaceId) {
    return requestJson(buildUrl(`/v1/spaces/${spaceId}/stats`));
}
export async function getGlobalStats() {
    return requestJson(buildUrl("/v1/stats"));
}
export async function getAdminStats() {
    return requestJson(buildUrl("/v1/admin/stats"));
}
// ── Alerts 告警 ───────────────────────────────────────────
export async function listAlerts(params) {
    const qs = new URLSearchParams();
    if (params?.status)
        qs.set("status", params.status);
    if (params?.type)
        qs.set("type", params.type);
    if (params?.limit)
        qs.set("limit", String(params.limit));
    if (params?.offset)
        qs.set("offset", String(params.offset));
    return requestJson(buildUrl(`/v1/alerts?${qs.toString()}`));
}
export async function updateAlertStatus(id, status) {
    return requestJson(buildUrl(`/v1/alerts/${id}`), { method: "PATCH", body: { status } });
}
export async function getUnprocessedAlertCount() {
    return requestJson(buildUrl("/v1/alerts/unprocessed-count"));
}
// ── Admin Logs ────────────────────────────────────────────
export async function queryLogs(params) {
    const qs = new URLSearchParams();
    if (params.level)
        qs.set("level", params.level);
    if (params.source)
        qs.set("source", params.source);
    if (params.keyword)
        qs.set("keyword", params.keyword);
    if (params.from)
        qs.set("from", params.from);
    if (params.to)
        qs.set("to", params.to);
    if (params.limit)
        qs.set("limit", String(params.limit));
    if (params.offset)
        qs.set("offset", String(params.offset));
    return requestJson(buildUrl(`/v1/admin/logs?${qs.toString()}`));
}
export async function getLogsConfig() {
    return requestJson(buildUrl("/v1/admin/logs/config"));
}
