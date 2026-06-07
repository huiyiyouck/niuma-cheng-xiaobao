import { z } from "zod";

// ── 通用工具 ──────────────────────────────────────────────

function nonBlankStr(maxLen: number) {
  return z.string().min(1).max(maxLen).refine((v) => v.trim().length > 0, {
    message: "不可为空字符串或纯空格",
  });
}

// ── ChannelSpace ──────────────────────────────────────────

export const ChannelSpaceCreate = z.object({
  name: nonBlankStr(200),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
  icon: z.string().max(10).default("📁"),
});

export const ChannelSpaceUpdate = z.object({
  name: nonBlankStr(200).optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  icon: z.string().max(10).optional(),
});

export const ChannelSpacesReorder = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(200),
});

// ── Channel ───────────────────────────────────────────────

export const ChannelCreate = z.object({
  name: nonBlankStr(100),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
});

export const ChannelUpdate = z.object({
  name: nonBlankStr(100).optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const ChannelDeleteBody = z.object({
  action: z.enum(["migrate_to_root", "remove_all"]),
});

export const ChannelsReorder = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(200),
});

// ── Source ────────────────────────────────────────────────

export const SourceCreate = z.object({
  type: z.enum(["x_twitter", "rss", "jin10_flash"]),
  identity: nonBlankStr(500),
  display_name: nonBlankStr(200),
  domain_tags: z.array(z.string()).default([]),
  source_role: z
    .enum(["official", "media", "kol", "community", "research", "other"])
    .default("other"),
  content_topics: z.array(z.string()).default([]),
  attention_level: z.enum(["core", "regular", "observe"]).default("regular"),
  notes: z.string().nullable().optional(),
  fetch_interval_sec: z.number().int().positive().nullable().optional(),
  max_items_per_fetch: z.number().int().positive().nullable().optional(),
  compensation_interval_sec: z.number().int().positive().default(86400),
  config: z.record(z.unknown()).default({}),
  // 从空间管理页发起新建时，自动添加到指定位置
  auto_add_to_space_id: z.string().uuid().optional(),
  auto_add_to_channel_id: z.string().uuid().nullable().optional(),
});

export const SourceUpdate = z.object({
  display_name: nonBlankStr(200).optional(),
  domain_tags: z.array(z.string()).optional(),
  source_role: z
    .enum(["official", "media", "kol", "community", "research", "other"])
    .optional(),
  content_topics: z.array(z.string()).optional(),
  attention_level: z.enum(["core", "regular", "observe"]).optional(),
  notes: z.string().nullable().optional(),
  fetch_interval_sec: z.number().int().positive().nullable().optional(),
  max_items_per_fetch: z.number().int().positive().nullable().optional(),
  compensation_interval_sec: z.number().int().positive().optional(),
  config: z.record(z.unknown()).optional(),
});

export const SourceIdentityUpdate = z.object({
  new_identity: nonBlankStr(500),
});

export const SourceVerify = z.object({
  type: z.enum(["x_twitter", "rss", "jin10_flash"]),
  identity: nonBlankStr(500),
  config: z.record(z.unknown()).default({}),
});

// ── 查询参数 ──────────────────────────────────────────────

export const SourcesQuery = z.object({
  search: z.string().optional(),
  type: z.enum(["x_twitter", "rss", "jin10_flash"]).optional(),
  lifecycle_status: z
    .enum(["normal", "needs_fix", "source_error", "removed"])
    .optional(),
  operational_status: z.enum(["fetching", "stopped"]).optional(),
  domain_tags: z.string().optional(), // 逗号分隔
  source_role: z
    .enum(["official", "media", "kol", "community", "research", "other"])
    .optional(),
  attention_level: z.enum(["core", "regular", "observe"]).optional(),
  space_id: z.string().uuid().optional(),
  sort: z
    .enum(["created_desc", "name_asc", "last_success_desc"])
    .default("created_desc"),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const NewsQuery = z.object({
  space_id: z.string().uuid().optional(),
  channel_id: z.string().uuid().optional(),
  search: z.string().optional(),
  min_score: z.coerce.number().min(0).max(10).optional(),
  sort: z.enum(["published_desc", "score_desc"]).default("published_desc"),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const AlertsQuery = z.object({
  status: z.enum(["active", "acknowledged", "resolved", "ignored"]).optional(),
  type: z.string().optional(),
  severity: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(200).default(50),
});

export const AlertStatusUpdate = z.object({
  status: z.enum(["acknowledged", "resolved", "ignored", "active"]),
});

export const LogsQuery = z.object({
  level: z.string().optional(),
  source: z.string().optional(),
  keyword: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const StatsQuery = z.object({
  space_id: z.string().uuid().optional(),
});

// ── DisplayPosition ───────────────────────────────────────

export const PositionCreate = z.object({
  source_id: z.string().uuid(),
  channel_id: z.string().uuid().nullable().optional(), // null/不传 = 空间根节点
});

export const PositionUpdate = z.object({
  action: z.enum(["pause", "resume", "remove", "move"]),
  removal_reason: z.string().optional(),
  channel_id: z.string().uuid().nullable().optional(),
});

export const PositionsQuery = z.object({
  channel_id: z.string().uuid().nullable().optional(), // 不传=空间根节点，传null/null值=空间根节点，传uuid=指定频道
});

// ── 类型导出 ──────────────────────────────────────────────

export type ChannelSpaceCreate = z.infer<typeof ChannelSpaceCreate>;
export type ChannelSpaceUpdate = z.infer<typeof ChannelSpaceUpdate>;
export type ChannelSpacesReorder = z.infer<typeof ChannelSpacesReorder>;
export type ChannelCreate = z.infer<typeof ChannelCreate>;
export type ChannelUpdate = z.infer<typeof ChannelUpdate>;
export type ChannelDeleteBody = z.infer<typeof ChannelDeleteBody>;
export type ChannelsReorder = z.infer<typeof ChannelsReorder>;
export type SourceCreate = z.infer<typeof SourceCreate>;
export type SourceUpdate = z.infer<typeof SourceUpdate>;
export type SourceIdentityUpdate = z.infer<typeof SourceIdentityUpdate>;
export type SourceVerify = z.infer<typeof SourceVerify>;
export type SourcesQuery = z.infer<typeof SourcesQuery>;
export type NewsQuery = z.infer<typeof NewsQuery>;
export type AlertsQuery = z.infer<typeof AlertsQuery>;
export type AlertStatusUpdate = z.infer<typeof AlertStatusUpdate>;
export type LogsQuery = z.infer<typeof LogsQuery>;
export type StatsQuery = z.infer<typeof StatsQuery>;
export type PositionCreate = z.infer<typeof PositionCreate>;
export type PositionUpdate = z.infer<typeof PositionUpdate>;
export type PositionsQuery = z.infer<typeof PositionsQuery>;
