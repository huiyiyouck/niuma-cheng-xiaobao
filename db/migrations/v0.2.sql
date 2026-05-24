-- v0.2 迁移：Source 重构
-- 重命名 name → display_name，新增 status/source_url/last_verified_at/verify_error

ALTER TABLE sources RENAME COLUMN name TO display_name;

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verify_error TEXT;

ALTER TABLE sources DROP CONSTRAINT IF EXISTS uq_sources_type_name;
