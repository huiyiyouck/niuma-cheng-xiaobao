-- sources 数组语义 jsonb 列收口：domain_tags + content_topics
-- 依据：coordination REQ-003 待跟进 6i①（domain_tags）+ 我方已登记承诺「加类型校验避免继续混存」；
--       content_topics 系同款问题（语义为数组、列默认值同样误写 '{}'），一并收口。
-- 语义：两列预期类型均为数组；'{}'::jsonb 等同「未配置」= 空数组。
-- 动作：① 存量归一 ② 列默认值改 '[]' ③ CHECK 约束防继续混存。
-- 执行：DevOps psql 直连，test 先行、prod 随下次部署；幂等，可重复执行。
-- 对应代码：server/src/db/schema.ts 两列默认值已同步改 '[]'::jsonb。

BEGIN;

-- ① 存量归一：object 形态 → 其值数组（'{}' → '[]'；脏数据如 '{"0":"AI"}' → '["AI"]'，
--    与应用层容错口径一致：Array.isArray ? v : Object.values(v)）
UPDATE sources
SET domain_tags = COALESCE((SELECT jsonb_agg(value) FROM jsonb_each(domain_tags)), '[]'::jsonb)
WHERE jsonb_typeof(domain_tags) = 'object';

UPDATE sources
SET content_topics = COALESCE((SELECT jsonb_agg(value) FROM jsonb_each(content_topics)), '[]'::jsonb)
WHERE jsonb_typeof(content_topics) = 'object';

-- ② 列默认值
ALTER TABLE sources ALTER COLUMN domain_tags SET DEFAULT '[]'::jsonb;
ALTER TABLE sources ALTER COLUMN content_topics SET DEFAULT '[]'::jsonb;

-- ③ CHECK 约束（幂等：已存在则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_sources_domain_tags_is_array' AND conrelid = 'sources'::regclass
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT ck_sources_domain_tags_is_array CHECK (jsonb_typeof(domain_tags) = 'array');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_sources_content_topics_is_array' AND conrelid = 'sources'::regclass
  ) THEN
    ALTER TABLE sources
      ADD CONSTRAINT ck_sources_content_topics_is_array CHECK (jsonb_typeof(content_topics) = 'array');
  END IF;
END $$;

COMMIT;

-- 验证（期望：两列默认值均含 '[]'::jsonb；非数组行数 = 0；两条 CHECK 约束存在）：
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_name = 'sources' AND column_name IN ('domain_tags', 'content_topics');
-- SELECT count(*) FROM sources
--   WHERE jsonb_typeof(domain_tags) <> 'array' OR jsonb_typeof(content_topics) <> 'array';
-- SELECT conname FROM pg_constraint WHERE conrelid = 'sources'::regclass AND conname LIKE 'ck_sources_%';
