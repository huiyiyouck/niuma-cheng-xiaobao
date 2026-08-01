-- processed_news 补 needs_context 列（coordination 契约 news-l1-db v1.9 Q-1 定案）
-- 语义：ai 写入的质量信号——上下文不足、本条结果存疑（L1Output 既有字段，database 模式不再丢弃）。
-- 时序红线：须在 ai v0.2 写回联调前落地，否则 ai 写入报错算我方违约（ai 侧以列存在为前置核对项）。
-- 权限：processed_news 表级 GRANT 已覆盖 ai_worker，无需权限动作。
-- 执行：DevOps psql 直连，test 先行、prod 随下次部署；幂等，可重复执行。
-- 对应代码：server/src/db/schema.ts processedNews.needsContext 已同步。

ALTER TABLE processed_news ADD COLUMN IF NOT EXISTS needs_context boolean;

-- 验证（期望：一行 needs_context / boolean / 可空）：
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'processed_news' AND column_name = 'needs_context';
