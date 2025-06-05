DROP INDEX `cron_triggers_active_next_run_at_idx`;--> statement-breakpoint
ALTER TABLE `cron_triggers` ADD `version_number` integer;--> statement-breakpoint
CREATE INDEX `cron_triggers_version_number_idx` ON `cron_triggers` (`version_number`);