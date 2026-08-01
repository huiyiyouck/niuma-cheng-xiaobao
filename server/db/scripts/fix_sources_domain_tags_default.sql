-- sources.domain_tags 列默认值误写修复 + 存量归一（coordination REQ-003 待跟进 6i①）
-- 背景：契约 news-l1-db v1.6 定性——该列预期类型是数组，'{}'::jsonb 系列默认值误写，
--       语义等同「未配置」= 空数组。存量 '{}' 行统一归一为 '[]'。
-- 执行：DevOps psql 直连，test 先行、prod 随下次部署；幂等，可重复执行。
-- 对应代码：server/src/db/schema.ts sources.domainTags 默认值已同步改 '[]'::jsonb。

BEGIN;

ALTER TABLE sources ALTER COLUMN domain_tags SET DEFAULT '[]'::jsonb;

UPDATE sources
SET domain_tags = '[]'::jsonb
WHERE domain_tags = '{}'::jsonb;

COMMIT;

-- 验证（期望：默认值含 '[]'::jsonb；非数组行数 = 0）：
-- SELECT column_default FROM information_schema.columns
--   WHERE table_name = 'sources' AND column_name = 'domain_tags';
-- SELECT count(*) FROM sources WHERE jsonb_typeof(domain_tags) <> 'array';
