-- Remove last_run and next_run_at from cron_triggers
DROP INDEX IF EXISTS `cron_triggers_last_run_idx`;
DROP INDEX IF EXISTS `cron_triggers_next_run_at_idx`;
ALTER TABLE `cron_triggers` DROP COLUMN `last_run`;
ALTER TABLE `cron_triggers` DROP COLUMN `next_run_at`;
