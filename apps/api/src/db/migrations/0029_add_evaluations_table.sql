CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`workflow_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scores` text,
	`error` text,
	`completed_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evaluations_workflow_id_idx` ON `evaluations` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `evaluations_organization_id_idx` ON `evaluations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `evaluations_status_idx` ON `evaluations` (`status`);--> statement-breakpoint
CREATE INDEX `evaluations_created_at_idx` ON `evaluations` (`created_at`);
