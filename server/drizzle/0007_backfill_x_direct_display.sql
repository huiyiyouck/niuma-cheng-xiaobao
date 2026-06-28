-- v0.6 收口：AI 处理暂不放开，X/Twitter raw_items 直接回填为可展示新闻。
-- 幂等规则：已存在 processed_news 的 raw_item 不重复创建；展示位置关联 ON CONFLICT 忽略。

WITH inserted_news AS (
  INSERT INTO processed_news(
    raw_item_id,
    title,
    summary,
    language,
    source_refs,
    published_at,
    bullets,
    tags,
    entities,
    importance_score,
    created_at
  )
  SELECT
    ri.id,
    COALESCE(NULLIF(left(trim(ri.content->>'text'), 80), ''), 'X/Twitter'),
    COALESCE(NULLIF(trim(ri.content->>'text'), ''), ''),
    'zh',
    jsonb_build_object('url', ri.source_item_url, 'source_id', ri.source_id::text),
    ri.published_at,
    '[]'::jsonb,
    '["X/Twitter"]'::jsonb,
    CASE
      WHEN NULLIF(trim(ri.content->>'author_username'), '') IS NULL THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('name', ri.content->>'author_username', 'type', 'account'))
    END,
    0,
    now()
  FROM raw_items ri
  JOIN sources s ON s.id = ri.source_id
  WHERE s.type = 'x_twitter'
    AND NOT EXISTS (
      SELECT 1 FROM processed_news pn WHERE pn.raw_item_id = ri.id
    )
  RETURNING id, raw_item_id
)
INSERT INTO news_positions(news_id, position_id)
SELECT inserted_news.id, dp.id
FROM inserted_news
JOIN raw_items ri ON ri.id = inserted_news.raw_item_id
JOIN display_positions dp ON dp.source_id = ri.source_id
WHERE dp.enabled = true
  AND dp.deleted_at IS NULL
ON CONFLICT (news_id, position_id) DO NOTHING;

UPDATE raw_items ri
SET l0_status = 'skipped',
    l0_label = 'direct_display',
    l0_processed_at = COALESCE(ri.l0_processed_at, now()),
    l1_status = 'completed',
    l1_processed_at = COALESCE(ri.l1_processed_at, now())
FROM sources s
WHERE s.id = ri.source_id
  AND s.type = 'x_twitter'
  AND EXISTS (
    SELECT 1 FROM processed_news pn WHERE pn.raw_item_id = ri.id
  );

UPDATE tasks t
SET status = 'succeeded',
    last_error = 'Skipped by v0.6 direct X display backfill',
    locked_by = NULL,
    locked_at = NULL,
    updated_at = now()
FROM raw_items ri
JOIN sources s ON s.id = ri.source_id
WHERE t.raw_item_id = ri.id
  AND s.type = 'x_twitter'
  AND t.type IN ('l0_classify', 'l1_process')
  AND t.status = 'queued'
  AND EXISTS (
    SELECT 1 FROM processed_news pn WHERE pn.raw_item_id = ri.id
  );
