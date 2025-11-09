-- Rename table from cron_triggers to scheduled_triggers
ALTER TABLE cron_triggers RENAME TO scheduled_triggers;

-- Rename column from cron_expression to schedule_expression
ALTER TABLE scheduled_triggers RENAME COLUMN cron_expression TO schedule_expression;

-- Drop old indexes
DROP INDEX IF EXISTS cron_triggers_workflow_id_idx;
DROP INDEX IF EXISTS cron_triggers_active_idx;
DROP INDEX IF EXISTS cron_triggers_created_at_idx;
DROP INDEX IF EXISTS cron_triggers_updated_at_idx;

-- Create new indexes with updated names
CREATE INDEX scheduled_triggers_workflow_id_idx ON scheduled_triggers(workflow_id);
CREATE INDEX scheduled_triggers_active_idx ON scheduled_triggers(active);
CREATE INDEX scheduled_triggers_created_at_idx ON scheduled_triggers(created_at);
CREATE INDEX scheduled_triggers_updated_at_idx ON scheduled_triggers(updated_at);
