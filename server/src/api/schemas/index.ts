import { z } from "zod";

// ── 通用 ──────────────────────────────────────────────────

// 非空字符串（等价 Pydantic NonBlankStr）
const nonBlankStr = z.string().refine((v) => v.trim().length > 0, {
  message: "name 不可为空字符串或纯空格",
}).pipe(z.string().min(1));

// ── ChannelSpace ──────────────────────────────────────────

export const ChannelSpaceCreate = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
});

// ── Source ────────────────────────────────────────────────

export const SourceCreate = z.object({
  display_name: z.string().min(1).max(200),
  source_url: z.string().nullable().optional(),
  type: z.string().optional(),
  config: z.record(z.unknown()).default({}),
});

export const SourceUpdate = z.object({
  display_name: z.string().min(1).max(200).optional(),
  source_url: z.string().nullable().optional(),
  type: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// ── ChannelSource ─────────────────────────────────────────

export const ChannelSourceBind = z.object({
  source_id: z.string().uuid(),
  enabled: z.boolean().default(true),
  fetch_policy: z.record(z.unknown()).default({}),
  sub_channel_id: z.string().uuid().nullable().optional(),
});

export const ChannelSourceUpdatePolicy = z.object({
  enabled: z.boolean().optional(),
  fetch_policy: z.record(z.unknown()).optional(),
  sub_channel_id: z.string().uuid().nullable().optional(),
});

// ── SubChannel ────────────────────────────────────────────

export const SubChannelCreate = z.object({
  name: z.string().min(1).max(100).refine((v) => v.trim().length > 0, {
    message: "name 不可为空字符串或纯空格",
  }),
  sort_order: z.number().int().min(0).default(0),
});

export const SubChannelUpdate = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
});

// ── 查询参数 ──────────────────────────────────────────────

export const NewsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sub_channel_id: z.string().optional(),
  sort: z.enum(["published_desc", "score_desc", "score_asc"]).default("published_desc"),
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

export const AlertsQuery = z.object({
  channel_space_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ── 类型导出 ──────────────────────────────────────────────

export type ChannelSpaceCreate = z.infer<typeof ChannelSpaceCreate>;
export type SourceCreate = z.infer<typeof SourceCreate>;
export type SourceUpdate = z.infer<typeof SourceUpdate>;
export type ChannelSourceBind = z.infer<typeof ChannelSourceBind>;
export type ChannelSourceUpdatePolicy = z.infer<typeof ChannelSourceUpdatePolicy>;
export type SubChannelCreate = z.infer<typeof SubChannelCreate>;
export type SubChannelUpdate = z.infer<typeof SubChannelUpdate>;
