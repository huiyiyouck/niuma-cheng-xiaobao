# 软删除表的唯一约束必须排除 deleted_at

## 背景

v0.6 联调中，`display_positions` 支持软删除（`deleted_at` 非空表示移除）。Owner 在源详情页移除一个展示位置后，再次添加同一 `source_id + channel_space_id + channel_id`，前端显示无位置，但后端返回：

```json
{"detail":"该信息源在此位置已存在"}
```

## 根因

表里存在历史残留全表唯一约束：

```sql
UNIQUE (source_id, channel_space_id, channel_id)
```

该约束没有条件 `WHERE deleted_at IS NULL`。因此即使旧位置已经软删除，唯一约束仍阻止重建同一组合。

本项目当前设计是一空间一位置，真实活跃约束应由部分唯一索引表达：

```sql
CREATE UNIQUE INDEX ...
ON display_positions(source_id, channel_space_id)
WHERE deleted_at IS NULL;
```

## 修复原则

软删除表上的唯一性约束必须回答：

> 唯一的是「历史全量记录」，还是「当前活跃记录」？

如果业务语义是「当前活跃记录唯一」，必须使用**部分唯一索引**，并显式排除软删除行：

```sql
CREATE UNIQUE INDEX uq_xxx_active
ON table_name(col_a, col_b)
WHERE deleted_at IS NULL;
```

不要保留同字段的全表 `UNIQUE` 约束，否则软删除会变成不可重建。

## Review checklist

- 新增软删除字段 `deleted_at` 后，检查所有 `UNIQUE` / `unique()` / `uniqueIndex()` 是否仍符合业务语义。
- 如果允许「删除后重建」，唯一索引必须带 `WHERE deleted_at IS NULL`。
- 如果存在历史迁移残留的全表唯一约束，要写迁移显式 `DROP CONSTRAINT IF EXISTS ...`。
- 前端看到「列表没有，但新增报已存在」时，优先查软删除残留 + 唯一索引条件。

## 本次落地

- 新增迁移：`server/drizzle/0006_drop_dp_channel_unique.sql`
- DROP 残留约束：`display_positions_source_id_channel_space_id_channel_id_key`
- test 库手动验证：active 位置数为 0 时，添加同位置从 409 转为成功

关联：v0.6 `display_positions`、源详情展示位置添加/移除。