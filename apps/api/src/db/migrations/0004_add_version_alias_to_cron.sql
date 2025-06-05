ALTER TABLE `cron_triggers` ADD `version_alias` text DEFAULT 'dev' NOT NULL;--> statement-breakpoint
CREATE INDEX `cron_triggers_version_alias_idx` ON `cron_triggers` (`version_alias`);