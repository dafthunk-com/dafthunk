-- Migration: Unified Active Deployment Model
-- Simplifies execution model to 2 paths: dev (NULL) or prod (activeDeploymentId)
-- Removes complex version alias logic from cron and queue triggers

-- Add active_deployment_id to workflows table
ALTER TABLE workflows ADD COLUMN active_deployment_id TEXT REFERENCES deployments(id) ON DELETE SET NULL;
CREATE INDEX workflows_active_deployment_id_idx ON workflows(active_deployment_id);

-- Remove version fields from cron_triggers (no longer needed)
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE cron_triggers_new (
    workflow_id TEXT PRIMARY KEY REFERENCES workflows(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    next_run_at INTEGER,
    last_run INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cron_triggers_new (workflow_id, cron_expression, next_run_at, last_run, active, created_at, updated_at)
SELECT workflow_id, cron_expression, next_run_at, last_run, active, created_at, updated_at
FROM cron_triggers;

DROP TABLE cron_triggers;
ALTER TABLE cron_triggers_new RENAME TO cron_triggers;

-- Recreate indexes for cron_triggers
CREATE INDEX cron_triggers_workflow_id_idx ON cron_triggers(workflow_id);
CREATE INDEX cron_triggers_next_run_at_idx ON cron_triggers(next_run_at);
CREATE INDEX cron_triggers_active_idx ON cron_triggers(active);
CREATE INDEX cron_triggers_created_at_idx ON cron_triggers(created_at);
CREATE INDEX cron_triggers_updated_at_idx ON cron_triggers(updated_at);

-- Remove version fields from queue_triggers
CREATE TABLE queue_triggers_new (
    workflow_id TEXT PRIMARY KEY REFERENCES workflows(id) ON DELETE CASCADE,
    queue_id TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO queue_triggers_new (workflow_id, queue_id, active, created_at, updated_at)
SELECT workflow_id, queue_id, active, created_at, updated_at
FROM queue_triggers;

DROP TABLE queue_triggers;
ALTER TABLE queue_triggers_new RENAME TO queue_triggers;

-- Recreate indexes for queue_triggers
CREATE INDEX queue_triggers_workflow_id_idx ON queue_triggers(workflow_id);
CREATE INDEX queue_triggers_queue_id_idx ON queue_triggers(queue_id);
CREATE INDEX queue_triggers_active_idx ON queue_triggers(active);
CREATE INDEX queue_triggers_created_at_idx ON queue_triggers(created_at);
CREATE INDEX queue_triggers_updated_at_idx ON queue_triggers(updated_at);
