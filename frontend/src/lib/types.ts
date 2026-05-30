export type UUID = string;

export type ChannelSpace = {
  id: UUID;
  name: string;
  description: string | null;
  created_at: string;
};

export type Source = {
  id: UUID;
  type: string;
  display_name: string;
  source_url: string | null;
  status: string;
  config: Record<string, unknown>;
  last_verified_at: string | null;
  verify_error: string | null;
  created_at: string;
};

export type SourceBindingInfo = {
  channel_space_id: UUID;
  channel_space_name: string;
  sub_channel_id?: UUID | null;
  sub_channel_name?: string | null;
  enabled: boolean;
};

export type SourceWithBindings = Source & {
  channel_spaces: SourceBindingInfo[];
};

export type VerifyItem = {
  source_item_id: string;
  source_item_url?: string | null;
  title?: string | null;
  content_preview?: string | null;
  published_at?: string | null;
};

export type SourceVerifyResponse = {
  status: string;
  items: VerifyItem[];
  total_fetched: number;
  error?: string | null;
};

export type SubChannel = {
  id: UUID;
  channel_space_id: UUID;
  name: string;
  sort_order: number;
  created_at: string;
};

export type ChannelSource = {
  id: UUID;
  channel_space_id: UUID;
  source_id: UUID;
  enabled: boolean;
  fetch_policy: FetchPolicy;
  sub_channel_id?: UUID | null;
  created_at: string;
};

export type ChannelSourceWithSource = {
  channel_source: ChannelSource;
  source: Source;
};

export type FetchPolicy = {
  schedule?: {
    every_seconds?: number;
  };
  budget?: {
    max_items_per_run?: number;
  };
};

export type ProcessedNews = {
  id: UUID;
  channel_space_id: UUID;
  raw_item_id: UUID;
  sub_channel_id?: UUID | null;
  title: string;
  summary: string;
  language: string;
  source_refs: Record<string, unknown>;
  published_at: string | null;
  bullets: string[];
  tags: string[];
  entities: { name: string; type: string }[];
  importance_score: number;
  created_at: string;
};

export type Alert = {
  id: UUID;
  channel_space_id: UUID;
  type: string;
  severity: string;
  status: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type WSStatus = "disconnected" | "connecting" | "connected";

export type StatsOverview = {
  today_new: number;
  today_new_change: number;
  avg_score: number | null;
  avg_score_change: number | null;
  active_channels: number;
  total_channels: number;
  pending_tasks: number;
};

export type ChannelStats = {
  total_news: number;
  today_new: number;
  active_sources: number;
  sub_channel_count: number;
};

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

export type NewsSort = "published_desc" | "score_desc" | "score_asc";
