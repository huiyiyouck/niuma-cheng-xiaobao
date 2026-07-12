import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── channel_spaces ────────────────────────────────────────
// v0.5: 新增 sort_order、icon
// v0.6: 新增 icon_url、icon_type 支持图片上传
export const channelSpaces = pgTable("channel_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default("📁"),
  iconUrl: text("icon_url"),
  iconType: varchar("icon_type", { length: 20 }).notNull().default("emoji"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── channels（原 sub_channels）─────────────────────────────
// v0.5: 表名从 sub_channels 重命名为 channels，字段结构不变
export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_channels_space_name").on(table.channelSpaceId, table.name),
    index("ix_channels_space_sort").on(table.channelSpaceId, table.sortOrder),
  ],
);

// ── sources（大幅扩展）─────────────────────────────────────
// v0.5: 新增双维度状态、标签字段、抓取配置，identity 替代 source_url
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // 身份
    type: varchar("type", { length: 20 }).notNull(),
    identity: varchar("identity", { length: 500 }).notNull(), // 原 source_url，统一为"来源身份"
    displayName: varchar("display_name", { length: 200 }).notNull(),
    // 双维度状态
    lifecycleStatus: varchar("lifecycle_status", { length: 20 })
      .notNull()
      .default("normal"),
    // operational_status 为计算字段，不存储
    // 标签
    domainTags: jsonb("domain_tags").notNull().default(sql`'{}'::jsonb`),
    sourceRole: varchar("source_role", { length: 20 }).notNull().default("other"),
    contentTopics: jsonb("content_topics").notNull().default(sql`'{}'::jsonb`),
    attentionLevel: varchar("attention_level", { length: 20 }).notNull().default("regular"),
    notes: text("notes"),
    // 抓取配置（全局）
    fetchIntervalSec: integer("fetch_interval_sec"),
    maxItemsPerFetch: integer("max_items_per_fetch"),
    compensationIntervalSec: integer("compensation_interval_sec").default(86400),
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    // 验证
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verifyError: text("verify_error"),
    // X Filtered Stream 反向同步标识（v0.5.1）
    sourceOrigin: varchar("source_origin", { length: 20 }).notNull().default("manual"),
    xRuleId: text("x_rule_id"),
    paused: boolean("paused").notNull().default(false),
    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // 去重索引：同一类型的来源身份全局唯一（大小写不敏感）
    uniqueIndex("uq_sources_type_identity").on(
      table.type,
      sql`LOWER(${table.identity})`,
    ),
    uniqueIndex("uq_sources_display_name").on(sql`LOWER(${table.displayName})`),
  ],
);

// ── display_positions（新表，替代 channel_sources）─────────
// v0.5: channel_id=NULL 表示空间根节点；软删除 deleted_at
export const displayPositions = pgTable(
  "display_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").references(() => channels.id, {
      onDelete: "cascade",
    }), // NULL = 空间根节点
    enabled: boolean("enabled").notNull().default(true),
    // 软删除（历史快照）
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    removalReason: text("removal_reason"), // 'channel_deleted' | 'space_deleted' | 'manual'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // 同一空间内，同一 Source 不能在同一位置重复
    // 部分唯一索引：同一空间下，一个 Source 只能有一个活跃位置（无论根节点还是频道）
    sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_dp_source_space ON display_positions(source_id, channel_space_id) WHERE deleted_at IS NULL`,
    // 计算 operational_status 的查询依赖此索引
    sql`CREATE INDEX IF NOT EXISTS ix_dp_source_enabled ON display_positions(source_id, enabled, deleted_at) WHERE deleted_at IS NULL`,
    // 获取空间+频道下的展示位置
    sql`CREATE INDEX IF NOT EXISTS ix_dp_space_channel ON display_positions(channel_space_id, channel_id, deleted_at) WHERE deleted_at IS NULL`,
  ],
);

// ── source_states（升至 Source 级）─────────────────────────
// v0.5: channel_source_id → source_id（UNIQUE），新增 last_fetch_count
export const sourceStates = pgTable(
  "source_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .unique()
      .references(() => sources.id, { onDelete: "cascade" }),
    cursor: jsonb("cursor").notNull().default(sql`'{}'::jsonb`),
    nextFetchAt: timestamp("next_fetch_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastFetchCount: integer("last_fetch_count"), // 最近一次抓取产出条数
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ix_source_states_next_fetch").on(table.nextFetchAt)],
);

// ── raw_items ─────────────────────────────────────────────
// v0.5: 移除 channel_space_id，新增 fetched_at
// v0.6: 新增 L0/L1 状态字段（ADR-002 双字段独立）
// v0.6.1: 新增 process_type 字段（ADR-007），区分 direct/ai 处理类型
export const rawItems = pgTable(
  "raw_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceItemId: text("source_item_id").notNull(),
    sourceItemUrl: text("source_item_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    content: jsonb("content").notNull().default(sql`'{}'::jsonb`),
    contentHash: text("content_hash"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    // v0.6 L0 状态字段
    l0Status: varchar("l0_status", { length: 30 }).notNull().default("pending"),
    l0Label: varchar("l0_label", { length: 50 }),
    l0ProcessedAt: timestamp("l0_processed_at", { withTimezone: true }),
    l0Error: text("l0_error"),
    // v0.6 L1 状态字段
    l1Status: varchar("l1_status", { length: 30 }).notNull().default("not_started"),
    l1Error: text("l1_error"),
    l1Attempt: integer("l1_attempt").notNull().default(0),
    l1NextRetryAt: timestamp("l1_next_retry_at", { withTimezone: true }),
    l1ProcessedAt: timestamp("l1_processed_at", { withTimezone: true }),
    // v0.6.1 处理类型：direct（直显）/ ai（AI 处理）
    processType: varchar("process_type", { length: 20 }).notNull().default("ai"),
  },
  (table) => [
    unique("uq_raw_items_source_item").on(table.sourceId, table.sourceItemId),
    index("ix_raw_items_source_published").on(table.sourceId, table.publishedAt),
    sql`CREATE INDEX IF NOT EXISTS ix_raw_items_url ON raw_items(source_item_url) WHERE source_item_url IS NOT NULL`,
    // v0.6 L0/L1 队列索引
    sql`CREATE INDEX IF NOT EXISTS ix_raw_items_l0_queue ON raw_items(l0_status, l1_status, published_at) WHERE l0_status = 'passed' AND l1_status = 'not_started'`,
    sql`CREATE INDEX IF NOT EXISTS ix_raw_items_l1_queue ON raw_items(l1_status, l1_next_retry_at, published_at) WHERE l1_status IN ('queued', 'retryable_failed')`,
    // v0.6.1 AI 待处理队列索引（供 ai_worker 轮询 claim）
    sql`CREATE INDEX IF NOT EXISTS ix_raw_items_ai_queue ON raw_items(l1_status, published_at) WHERE process_type = 'ai' AND l1_status IN ('queued', 'retryable_failed')`,
    // v0.6.1 直显类快速查询索引
    sql`CREATE INDEX IF NOT EXISTS ix_raw_items_direct_published ON raw_items(source_id, published_at DESC) WHERE process_type = 'direct'`,
  ],
);

// ── processed_news ────────────────────────────────────────
// v0.5: 移除 channel_space_id 和 channel_id
// v0.6: jsonb 增量扩展（ADR-003），新增 L1 输出字段
export const processedNews = pgTable(
  "processed_news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawItemId: uuid("raw_item_id")
      .notNull()
      .unique()
      .references(() => rawItems.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    language: varchar("language", { length: 20 }).notNull().default("zh"),
    sourceRefs: jsonb("source_refs").notNull().default(sql`'{}'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    bullets: jsonb("bullets").notNull().default(sql`'[]'::jsonb`),
    tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
    entities: jsonb("entities").notNull().default(sql`'[]'::jsonb`),
    importanceScore: numeric("importance_score").notNull().default("0"),
    // v0.6 L1 输出字段
    translation: jsonb("translation"),
    context: jsonb("context"),
    analysis: text("analysis"),
    scoreTotal: numeric("score_total"),
    scoreDimensions: jsonb("score_dimensions"),
    tagsV2: jsonb("tags_v2"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ix_processed_news_published").on(table.publishedAt)],
);

// ── news_positions（新 m:n 关联表）─────────────────────────
export const newsPositions = pgTable(
  "news_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    newsId: uuid("news_id")
      .notNull()
      .references(() => processedNews.id, { onDelete: "cascade" }),
    positionId: uuid("position_id")
      .notNull()
      .references(() => displayPositions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_np_news_position").on(table.newsId, table.positionId),
    index("ix_np_position_news").on(table.positionId, table.newsId),
    index("ix_np_news").on(table.newsId),
  ],
);

// ── tasks ─────────────────────────────────────────────────
// v0.5: 移除 channel_space_id、channel_source_id，新增 source_id
// v0.6: 新增 l0_classify / l1_process / l1_retry type + last_error_kind
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    rawItemId: uuid("raw_item_id").references(() => rawItems.id, {
      onDelete: "cascade",
    }),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedBy: text("locked_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastErrorKind: varchar("last_error_kind", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ix_tasks_queue").on(table.status, table.runAfter, table.priority),
    index("ix_tasks_locked_at").on(table.lockedAt),
  ],
);

// ── alerts ────────────────────────────────────────────────
// v0.5: channel_space_id nullable，新增 source_id、scope、dedup_key、resolved_at、last_triggered_at
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: varchar("scope", { length: 20 }).notNull().default("source"),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    channelSpaceId: uuid("channel_space_id").references(() => channelSpaces.id, {
      onDelete: "set null",
    }), // 改为 nullable
    type: text("type").notNull(),
    severity: text("severity").notNull().default("warning"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    message: text("message").notNull(),
    meta: jsonb("meta").notNull().default(sql`'{}'::jsonb`),
    // 去重
    dedupKey: text("dedup_key"),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ix_alerts_scope_source").on(table.scope, table.sourceId, table.status),
    sql`CREATE INDEX IF NOT EXISTS ix_alerts_unread ON alerts(status, created_at) WHERE status = 'active'`,
    sql`CREATE INDEX IF NOT EXISTS ix_alerts_dedup ON alerts(dedup_key) WHERE status = 'active'`,
  ],
);

// ── source_identity_history（新表）─────────────────────────
export const sourceIdentityHistory = pgTable("source_identity_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  oldIdentity: text("old_identity").notNull(),
  newIdentity: text("new_identity").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
