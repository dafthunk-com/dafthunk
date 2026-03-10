-- Add enabled column to workflows
ALTER TABLE workflows ADD COLUMN enabled integer NOT NULL DEFAULT 1;

-- Migrate existing data: enable workflows that had an active deployment
UPDATE workflows SET enabled = 1 WHERE active_deployment_id IS NOT NULL;

-- Drop indexes BEFORE dropping columns (SQLite requires this)
DROP INDEX IF EXISTS workflows_active_deployment_id_idx;
DROP INDEX IF EXISTS feedback_criteria_deployment_id_idx;
DROP INDEX IF EXISTS feedback_deployment_id_idx;

-- Drop columns
ALTER TABLE workflows DROP COLUMN active_deployment_id;
ALTER TABLE feedback_criteria DROP COLUMN deployment_id;
ALTER TABLE feedback DROP COLUMN deployment_id;

-- Drop deployments table and its indexes
DROP INDEX IF EXISTS deployments_organization_id_idx;
DROP INDEX IF EXISTS deployments_workflow_id_idx;
DROP INDEX IF EXISTS deployments_version_idx;
DROP INDEX IF EXISTS deployments_created_at_idx;
DROP INDEX IF EXISTS deployments_workflow_id_version_idx;
DROP TABLE IF EXISTS deployments;

-- Add index for the new enabled column
CREATE INDEX IF NOT EXISTS workflows_enabled_idx ON workflows(enabled);
