-- v0.2 回滚

ALTER TABLE sources RENAME COLUMN display_name TO name;

ALTER TABLE sources
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS last_verified_at,
  DROP COLUMN IF EXISTS verify_error;

-- 重新添加旧约束（若已有同名 Source 数据，此约束可能失败）
ALTER TABLE sources ADD CONSTRAINT uq_sources_type_name UNIQUE (type, name);
