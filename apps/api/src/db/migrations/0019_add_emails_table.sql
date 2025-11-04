-- Add emails table for user-managed email inboxes
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `emails_name_idx` ON `emails` (`name`);
--> statement-breakpoint
CREATE INDEX `emails_handle_idx` ON `emails` (`handle`);
--> statement-breakpoint
CREATE INDEX `emails_organization_id_idx` ON `emails` (`organization_id`);
--> statement-breakpoint
CREATE INDEX `emails_created_at_idx` ON `emails` (`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `emails_organization_id_handle_unique_idx` ON `emails` (`organization_id`,`handle`);
--> statement-breakpoint

-- Add email_triggers table for linking workflows to email inboxes
CREATE TABLE `email_triggers` (
	`workflow_id` text PRIMARY KEY NOT NULL,
	`email_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`email_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_triggers_workflow_id_idx` ON `email_triggers` (`workflow_id`);
--> statement-breakpoint
CREATE INDEX `email_triggers_email_id_idx` ON `email_triggers` (`email_id`);
--> statement-breakpoint
CREATE INDEX `email_triggers_active_idx` ON `email_triggers` (`active`);
--> statement-breakpoint
CREATE INDEX `email_triggers_created_at_idx` ON `email_triggers` (`created_at`);
--> statement-breakpoint
CREATE INDEX `email_triggers_updated_at_idx` ON `email_triggers` (`updated_at`);
