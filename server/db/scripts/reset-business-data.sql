-- v0.5 数据清理脚本
-- 用途：上线新模型前清空所有旧业务数据，从空白状态启动
-- 注意：按 FK 依赖顺序从子到父 DELETE，事务包裹
-- 前置条件：必须先完成 pg_dump 备份
-- 执行方式：psql $DATABASE_URL -f server/db/scripts/reset-business-data.sql
--
-- 表名对照（新旧）：
--   sub_channels → channels（旧表已存在，按旧名清理）
--   channel_sources → display_positions（旧表已存在，按旧名清理）
-- 新表（news_positions / display_positions / source_identity_history / channels）
-- 由 drizzle migrate 创建后自然为空，此脚本不涉及。

BEGIN;

-- 第 1 层：直接依赖父表的子表
DELETE FROM alerts;                    -- FK→channel_spaces, sources

-- 第 2 层：依赖 raw_items 的表
DELETE FROM processed_news;            -- FK→raw_items

-- 第 3 层：依赖父表的任务表
DELETE FROM tasks;                     -- FK→channel_spaces, channel_sources, raw_items

-- 第 4 层：原始数据
DELETE FROM raw_items;                 -- FK→sources

-- 第 5 层：状态表（间接依赖 channel_sources）
DELETE FROM source_states;             -- FK→channel_sources

-- 第 6 层：绑定/展示位置（旧表）
DELETE FROM channel_sources;           -- FK→channel_spaces, sub_channels, sources

-- 第 7 层：子频道（旧表名，将被 rename 为 channels）
DELETE FROM sub_channels;              -- FK→channel_spaces

-- 第 8 层：信息源
DELETE FROM sources;                   -- 独立

-- 第 9 层：频道空间（顶层）
DELETE FROM channel_spaces;            -- 独立

COMMIT;
