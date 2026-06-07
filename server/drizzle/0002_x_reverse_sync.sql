-- v0.5.1: X Filtered Stream 反向同步
-- 平台被动同步 X Developer Portal rules，新增 3 个字段

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS source_origin varchar(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS x_rule_id text,
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

-- 回填：现有 x_twitter 类型 source 标记为 x_synced（后续 syncOnce 按 username 回填 x_rule_id）
UPDATE sources
   SET source_origin = 'x_synced'
 WHERE type = 'x_twitter' AND source_origin = 'manual';
