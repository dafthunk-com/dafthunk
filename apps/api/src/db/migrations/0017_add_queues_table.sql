CREATE TABLE `queues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `queues_name_idx` ON `queues` (`name`);--> statement-breakpoint
CREATE INDEX `queues_handle_idx` ON `queues` (`handle`);--> statement-breakpoint
CREATE INDEX `queues_organization_id_idx` ON `queues` (`organization_id`);--> statement-breakpoint
CREATE INDEX `queues_created_at_idx` ON `queues` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `queues_organization_id_handle_unique_idx` ON `queues` (`organization_id`,`handle`);--> statement-breakpoint
CREATE TABLE `queue_triggers` (
	`workflow_id` text PRIMARY KEY NOT NULL,
	`queue_id` text NOT NULL,
	`version_alias` text DEFAULT 'dev' NOT NULL,
	`version_number` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `queue_triggers_workflow_id_idx` ON `queue_triggers` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `queue_triggers_queue_id_idx` ON `queue_triggers` (`queue_id`);--> statement-breakpoint
CREATE INDEX `queue_triggers_version_alias_idx` ON `queue_triggers` (`version_alias`);--> statement-breakpoint
CREATE INDEX `queue_triggers_version_number_idx` ON `queue_triggers` (`version_number`);--> statement-breakpoint
CREATE INDEX `queue_triggers_active_idx` ON `queue_triggers` (`active`);--> statement-breakpoint
CREATE INDEX `queue_triggers_created_at_idx` ON `queue_triggers` (`created_at`);--> statement-breakpoint
CREATE INDEX `queue_triggers_updated_at_idx` ON `queue_triggers` (`updated_at`);
