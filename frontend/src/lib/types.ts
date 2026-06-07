export type UUID = string;

// ── v0.5: 空间 Space ──────────────────────────────────────
export type Space = {
  id: UUID;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

// ── v0.5: 频道 Channel ────────────────────────────────────
export type Channel = {
  id: UUID;
  space_id: UUID;
  name: string;
  sort_order: number;
  created_at: string;
};

// ── v0.5: 信息源 Source（资产化）──────────────────────────
// 双维度状态：
//   availability_status: 可用性/生命周期（normal/awaiting_repair/source_error/source_removed）
//   operational_status:  运行状态（fetching/stopped/unused）
export type AvailabilityStatus = "normal" | "awaiting_repair" | "source_error" | "source_removed";
export type OperationalStatus = "fetching" | "stopped" | "unused";
export type SourceType = "x_twitter" | "rss";
export type SourceRole = "official" | "media" | "kol" | "community" | "paper_institute" | "other";
export type AttentionLevel = "core" | "regular" | "observe";
export type DomainTag = "AI" | "财经" | "开源" | "科技" | "其他";

export type FetchConfig = {
  rss_interval_seconds?: number;
  x_compensation_interval_seconds?: number;
  max_items_per_run?: number;
};

export type Source = {
  id: UUID;
  type: SourceType;
  display_name: string;
  source_identity: string;
  // 标签
  domain_tags: DomainTag[];
  source_role: SourceRole;
  content_topics: string[];
  attention_level: AttentionLevel;
  notes: string | null;
  // 双维度状态
  availability_status: AvailabilityStatus;
  operational_status: OperationalStatus;
  // 验证
  last_verified_at: string | null;
  verify_error: string | null;
  consecutive_failures: number;
  // 抓取
  last_fetched_at: string | null;
  fetch_config: FetchConfig;
  // 统计
  total_news_count: number;
  // v0.5.1: X 反向同步
  source_origin: "manual" | "x_synced";
  x_rule_id: string | null;
  paused: boolean;
  created_at: string;
  updated_at: string;
};

// ── v0.5: 展示位置 ────────────────────────────────────────
export type DisplayPosition = {
  id: UUID;
  source_id: UUID;
  space_id: UUID;
  space_name: string;
  channel_id: UUID | null;
  channel_name: string | null;
  enabled: boolean;
  created_at: string;
};

// 带展示位置的 Source
export type SourceWithPositions = Source & {
  display_positions: DisplayPosition[];
};

// ── v0.5: 告警 Alert ──────────────────────────────────────
export type AlertType = "source_error" | "x_stream_global" | "x_auth_failure" | "system_db" | "system_queue";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "ignored";

export type Alert = {
  id: UUID;
  type: AlertType;
  severity: string;
  status: AlertStatus;
  message: string;
  source_id: UUID | null;
  source_display_name: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ── v0.5: 验证 ────────────────────────────────────────────
export type VerifyItem = {
  source_item_id: string;
  source_item_url?: string | null;
  title?: string | null;
  content_preview?: string | null;
  published_at?: string | null;
};

export type SourceVerifyResponse = {
  status: "ok" | "error";
  items: VerifyItem[];
  total_fetched: number;
  error?: string | null;
  // X 账号信息
  account_name?: string | null;
  account_username?: string | null;
  account_bio?: string | null;
  // RSS 站点信息
  site_title?: string | null;
  site_description?: string | null;
};

// ── 新闻 ProcessedNews（v0.5 适配）─────────────────────────
export type ProcessedNews = {
  id: UUID;
  space_id: UUID;
  channel_id: UUID | null;
  channel_name: string | null;
  raw_item_id: UUID;
  title: string;
  summary: string;
  language: string;
  source_id: UUID;
  source_display_name: string;
  source_availability_status: AvailabilityStatus;
  published_at: string | null;
  bullets: string[];
  tags: string[];
  entities: { name: string; type: string }[];
  importance_score: number;
  created_at: string;
};

export type NewsSort = "published_desc" | "score_desc" | "score_asc";

// ── 统计 ──────────────────────────────────────────────────
export type StatsOverview = {
  today_new: number;
  avg_score: number | null;
  active_spaces: number;
  active_sources: number;
  unprocessed_alerts: number;
};

export type SpaceStats = {
  total_news: number;
  today_new: number;
  active_sources: number;
  channel_count: number;
};

// ── 日志 ──────────────────────────────────────────────────
export type LogEntry = {
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  extra?: Record<string, unknown> | null;
};

export type LogQueryResponse = {
  entries: LogEntry[];
  total: number;
  has_more: boolean;
};

// ── v0.5: 列表/分页参数 ───────────────────────────────────
export type SourceListParams = {
  search?: string;
  type?: SourceType;
  availability_status?: AvailabilityStatus;
  operational_status?: OperationalStatus;
  domain_tag?: DomainTag;
  source_role?: SourceRole;
  attention_level?: AttentionLevel;
  space_id?: UUID;
  limit?: number;
  offset?: number;
};

export type SourceListResponse = {
  sources: SourceWithPositions[];
  total: number;
};

// ── v0.5: 删除影响预览 ────────────────────────────────────
export type DeleteImpact = {
  affected_positions: number;
  preserved_news: number;
  additional_info?: string;
};

export type SpaceDeletePreview = {
  space_name: string;
  channel_count: number;
  position_count: number;
  news_count: number;
};

export type ChannelDeletePreview = {
  channel_name: string;
  position_count: number;
  has_space_root_position: boolean;
};

// ── v0.5: 身份变更历史 ────────────────────────────────────
export type IdentityChangeRecord = {
  id: UUID;
  source_id: UUID;
  old_identity: string;
  new_identity: string;
  changed_at: string;
};
