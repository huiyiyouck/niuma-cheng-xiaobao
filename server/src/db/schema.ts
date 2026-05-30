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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── channel_spaces ────────────────────────────────────────

export const channelSpaces = pgTable("channel_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── sources ───────────────────────────────────────────────

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  sourceUrl: text("source_url"),
  status: varchar("status", { length: 20 }).notNull().default("unverified"),
  config: jsonb("config").notNull().default({}),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  verifyError: text("verify_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── sub_channels ──────────────────────────────────────────

export const subChannels = pgTable(
  "sub_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_sub_channels_space_name").on(table.channelSpaceId, table.name),
    index("ix_sub_channels_space_sort").on(table.channelSpaceId, table.sortOrder),
  ],
);

// ── channel_sources ───────────────────────────────────────

export const channelSources = pgTable(
  "channel_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    fetchPolicy: jsonb("fetch_policy").notNull().default({}),
    subChannelId: uuid("sub_channel_id").references(() => subChannels.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_channel_sources_space_source").on(table.channelSpaceId, table.sourceId),
    index("ix_channel_sources_space_enabled").on(table.channelSpaceId, table.enabled),
  ],
);

// ── source_states ─────────────────────────────────────────

export const sourceStates = pgTable(
  "source_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSourceId: uuid("channel_source_id")
      .notNull()
      .unique()
      .references(() => channelSources.id, { onDelete: "cascade" }),
    cursor: jsonb("cursor").notNull().default({}),
    nextFetchAt: timestamp("next_fetch_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ix_source_states_next_fetch_at").on(table.nextFetchAt)],
);

// ── raw_items ─────────────────────────────────────────────

export const rawItems = pgTable(
  "raw_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceItemId: text("source_item_id").notNull(),
    sourceItemUrl: text("source_item_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    content: jsonb("content").notNull().default({}),
    contentHash: text("content_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_raw_items_source_item").on(table.sourceId, table.sourceItemId),
    index("ix_raw_items_space_published").on(table.channelSpaceId, table.publishedAt),
    index("ix_raw_items_url").on(table.sourceItemUrl).where(sql`${table.sourceItemUrl} IS NOT NULL`),
  ],
);

// ── processed_news ────────────────────────────────────────

export const processedNews = pgTable(
  "processed_news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    rawItemId: uuid("raw_item_id")
      .notNull()
      .unique()
      .references(() => rawItems.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    language: varchar("language", { length: 20 }).notNull().default("zh"),
    sourceRefs: jsonb("source_refs").notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    bullets: jsonb("bullets").notNull().default([]),
    tags: jsonb("tags").notNull().default([]),
    entities: jsonb("entities").notNull().default([]),
    importanceScore: numeric("importance_score").notNull().default("0"),
    subChannelId: uuid("sub_channel_id").references(() => subChannels.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ix_processed_news_space_published").on(table.channelSpaceId, table.publishedAt),
    index("ix_processed_news_sub_published").on(table.channelSpaceId, table.subChannelId, table.publishedAt),
  ],
);

// ── tasks ─────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    channelSourceId: uuid("channel_source_id").references(() => channelSources.id, {
      onDelete: "cascade",
    }),
    rawItemId: uuid("raw_item_id").references(() => rawItems.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(0),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    attempt: integer("attempt").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedBy: text("locked_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ix_tasks_queue").on(table.status, table.runAfter, table.priority),
    index("ix_tasks_locked_at").on(table.lockedAt),
  ],
);

// ── alerts ────────────────────────────────────────────────

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelSpaceId: uuid("channel_space_id")
      .notNull()
      .references(() => channelSpaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    severity: text("severity").notNull().default("warning"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    message: text("message").notNull(),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ix_alerts_space_created").on(table.channelSpaceId, table.createdAt)],
);
