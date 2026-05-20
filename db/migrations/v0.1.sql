-- v0.1 数据层完善迁移

-- 1. 创建 sub_channels 表
CREATE TABLE IF NOT EXISTS sub_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_space_id UUID NOT NULL REFERENCES channel_spaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sub_channels_space_name UNIQUE (channel_space_id, name)
);

CREATE INDEX IF NOT EXISTS ix_sub_channels_space_sort
  ON sub_channels(channel_space_id, sort_order);

-- 2. channel_sources 新增 sub_channel_id 列
ALTER TABLE channel_sources
  ADD COLUMN IF NOT EXISTS sub_channel_id UUID REFERENCES sub_channels(id) ON DELETE SET NULL;

-- 3. processed_news 新增 sub_channel_id 列
ALTER TABLE processed_news
  ADD COLUMN IF NOT EXISTS sub_channel_id UUID REFERENCES sub_channels(id) ON DELETE SET NULL;

-- 4. processed_news 新增复合索引（子频道筛选 + 去重查询）
CREATE INDEX IF NOT EXISTS ix_processed_news_sub_published
  ON processed_news(channel_space_id, sub_channel_id, published_at DESC);

-- 5. raw_items.source_item_url 补充索引（去重查询加速）
CREATE INDEX IF NOT EXISTS ix_raw_items_url
  ON raw_items(source_item_url)
  WHERE source_item_url IS NOT NULL;
