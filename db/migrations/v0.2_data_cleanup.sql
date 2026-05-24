-- v0.2 数据清理：清空所有 Source 和新闻数据，仅保留频道空间和子频道结构
-- 设计文档 §2.3，部署步骤 §9.1 第 2 步

DELETE FROM processed_news;
DELETE FROM raw_items;
DELETE FROM tasks;
DELETE FROM source_states;
DELETE FROM channel_sources;
DELETE FROM sources;

-- channel_spaces 和 sub_channels 保留
