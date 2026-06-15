-- 删除历史残留的 channel 级全表唯一约束 display_positions_source_id_channel_space_id_channel_id_key。
-- 该约束建于早期版本、未排除软删除（无 WHERE deleted_at IS NULL），
-- 导致展示位置被软删除（deleted_at 置值）后，无法重新添加同一 (source, space, channel)，
-- 后端 INSERT 触发唯一冲突并误报「该信息源在此位置已存在」。
-- 「一空间一位置」业务约束由应用层 POST 检查 + uq_dp_source_space 部分唯一索引保证，
-- 该 channel 级全表唯一约束既多余又有 bug，直接删除。
ALTER TABLE display_positions DROP CONSTRAINT IF EXISTS display_positions_source_id_channel_space_id_channel_id_key;
