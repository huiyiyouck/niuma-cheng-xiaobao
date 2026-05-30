-- v0.4: 告警状态管理
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
COMMENT ON COLUMN alerts.status IS '告警状态：active / acknowledged / resolved';
