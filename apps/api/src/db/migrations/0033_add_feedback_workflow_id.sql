-- Add workflow_id column to feedback table
-- This is nullable to support existing records, but new feedback will always have it set
ALTER TABLE `feedback` ADD COLUMN `workflow_id` text REFERENCES `workflows`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX `feedback_workflow_id_idx` ON `feedback` (`workflow_id`);
