-- Promote onboarding stages into D1 as nullable timestamp columns on `users`.
-- Each column is null until the user first reaches that milestone, then
-- stamped with the integer Unix timestamp (matching `created_at`/`updated_at`).
-- Replaces the prior `tour_completed` boolean: same column name, type changes
-- from boolean (INTEGER NOT NULL DEFAULT 0) to nullable timestamp INTEGER.

-- Add the three new stage columns (nullable timestamps).
ALTER TABLE `users` ADD COLUMN `workflow_created` integer;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `workflow_executed` integer;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `workflow_executed_ok` integer;--> statement-breakpoint

-- Migrate tour_completed from boolean to nullable timestamp.
-- Preserve the "this user completed the tour" signal as `created_at` (the
-- closest known timestamp; the exact completion time wasn't recorded).
ALTER TABLE `users` ADD COLUMN `tour_completed_new` integer;--> statement-breakpoint
UPDATE `users` SET `tour_completed_new` = `created_at` WHERE `tour_completed` = 1;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `tour_completed`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `tour_completed_new` TO `tour_completed`;--> statement-breakpoint

-- Backfill workflow_created from the org's first workflow. Per-user
-- attribution isn't recoverable from existing data (workflows are
-- org-scoped); this approximation gives every member of an org with
-- workflows a non-null stamp, which keeps the funnel useful at launch.
UPDATE `users`
SET `workflow_created` = (
  SELECT MIN(`workflows`.`created_at`)
  FROM `workflows`
  WHERE `workflows`.`organization_id` = `users`.`organization_id`
)
WHERE `workflow_created` IS NULL;

-- workflow_executed and workflow_executed_ok cannot be backfilled from D1
-- (executions live in Analytics Engine). New executions will populate them
-- going forward; legacy data stays null.
