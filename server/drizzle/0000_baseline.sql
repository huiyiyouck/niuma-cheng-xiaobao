CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_space_id" uuid NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"message" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_space_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"fetch_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sub_channel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_channel_sources_space_source" UNIQUE("channel_space_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "channel_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_spaces_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "processed_news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_space_id" uuid NOT NULL,
	"raw_item_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"language" varchar(20) DEFAULT 'zh' NOT NULL,
	"source_refs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"importance_score" numeric DEFAULT '0' NOT NULL,
	"sub_channel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_news_raw_item_id_unique" UNIQUE("raw_item_id")
);
--> statement-breakpoint
CREATE TABLE "raw_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_space_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_item_id" text NOT NULL,
	"source_item_url" text,
	"published_at" timestamp with time zone,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_raw_items_source_item" UNIQUE("source_id","source_item_id")
);
--> statement-breakpoint
CREATE TABLE "source_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_source_id" uuid NOT NULL,
	"cursor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_fetch_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_states_channel_source_id_unique" UNIQUE("channel_source_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"source_url" text,
	"status" varchar(20) DEFAULT 'unverified' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"verify_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_space_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_sub_channels_space_name" UNIQUE("channel_space_id","name")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"channel_space_id" uuid NOT NULL,
	"channel_source_id" uuid,
	"raw_item_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_channel_space_id_channel_spaces_id_fk" FOREIGN KEY ("channel_space_id") REFERENCES "public"."channel_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_sources" ADD CONSTRAINT "channel_sources_channel_space_id_channel_spaces_id_fk" FOREIGN KEY ("channel_space_id") REFERENCES "public"."channel_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_sources" ADD CONSTRAINT "channel_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_sources" ADD CONSTRAINT "channel_sources_sub_channel_id_sub_channels_id_fk" FOREIGN KEY ("sub_channel_id") REFERENCES "public"."sub_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_news" ADD CONSTRAINT "processed_news_channel_space_id_channel_spaces_id_fk" FOREIGN KEY ("channel_space_id") REFERENCES "public"."channel_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_news" ADD CONSTRAINT "processed_news_raw_item_id_raw_items_id_fk" FOREIGN KEY ("raw_item_id") REFERENCES "public"."raw_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_news" ADD CONSTRAINT "processed_news_sub_channel_id_sub_channels_id_fk" FOREIGN KEY ("sub_channel_id") REFERENCES "public"."sub_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_items" ADD CONSTRAINT "raw_items_channel_space_id_channel_spaces_id_fk" FOREIGN KEY ("channel_space_id") REFERENCES "public"."channel_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_items" ADD CONSTRAINT "raw_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_states" ADD CONSTRAINT "source_states_channel_source_id_channel_sources_id_fk" FOREIGN KEY ("channel_source_id") REFERENCES "public"."channel_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_channels" ADD CONSTRAINT "sub_channels_channel_space_id_channel_spaces_id_fk" FOREIGN KEY ("channel_space_id") REFERENCES "public"."channel_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_channel_space_id_channel_spaces_id_fk" FOREIGN KEY ("channel_space_id") REFERENCES "public"."channel_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_channel_source_id_channel_sources_id_fk" FOREIGN KEY ("channel_source_id") REFERENCES "public"."channel_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_raw_item_id_raw_items_id_fk" FOREIGN KEY ("raw_item_id") REFERENCES "public"."raw_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_alerts_space_created" ON "alerts" USING btree ("channel_space_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_channel_sources_space_enabled" ON "channel_sources" USING btree ("channel_space_id","enabled");--> statement-breakpoint
CREATE INDEX "ix_processed_news_space_published" ON "processed_news" USING btree ("channel_space_id","published_at");--> statement-breakpoint
CREATE INDEX "ix_processed_news_sub_published" ON "processed_news" USING btree ("channel_space_id","sub_channel_id","published_at");--> statement-breakpoint
CREATE INDEX "ix_raw_items_space_published" ON "raw_items" USING btree ("channel_space_id","published_at");--> statement-breakpoint
CREATE INDEX "ix_raw_items_url" ON "raw_items" USING btree ("source_item_url") WHERE "raw_items"."source_item_url" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_source_states_next_fetch_at" ON "source_states" USING btree ("next_fetch_at");--> statement-breakpoint
CREATE INDEX "ix_sub_channels_space_sort" ON "sub_channels" USING btree ("channel_space_id","sort_order");--> statement-breakpoint
CREATE INDEX "ix_tasks_queue" ON "tasks" USING btree ("status","run_after","priority");--> statement-breakpoint
CREATE INDEX "ix_tasks_locked_at" ON "tasks" USING btree ("locked_at");
--> statement-breakpoint
-- COMMENT 元数据补充（drizzle-kit generate 不自动产 COMMENT，从 server/db/migrations/v0.4.sql 保留）
COMMENT ON COLUMN "alerts"."status" IS '告警状态：active / acknowledged / resolved';