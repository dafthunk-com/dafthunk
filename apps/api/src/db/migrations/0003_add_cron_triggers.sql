CREATE TABLE `cron_triggers` (
	`workflow_id` text PRIMARY KEY NOT NULL,
	`cron_expression` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_run` integer,
	`next_run_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cron_triggers_workflow_id_idx` ON `cron_triggers` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `cron_triggers_active_idx` ON `cron_triggers` (`active`);--> statement-breakpoint
CREATE INDEX `cron_triggers_last_run_idx` ON `cron_triggers` (`last_run`);--> statement-breakpoint
CREATE INDEX `cron_triggers_next_run_at_idx` ON `cron_triggers` (`next_run_at`);--> statement-breakpoint
CREATE INDEX `cron_triggers_active_next_run_at_idx` ON `cron_triggers` (`active`,`next_run_at`);--> statement-breakpoint
CREATE INDEX `cron_triggers_created_at_idx` ON `cron_triggers` (`created_at`);--> statement-breakpoint
CREATE INDEX `cron_triggers_updated_at_idx` ON `cron_triggers` (`updated_at`);