-- Drop the old evaluations table and recreate with deployment_id
DROP TABLE IF EXISTS `evaluations`;

CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`deployment_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scores` text,
	`error` text,
	`completed_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`deployment_id`) REFERENCES `deployments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evaluations_deployment_id_idx` ON `evaluations` (`deployment_id`);--> statement-breakpoint
CREATE INDEX `evaluations_organization_id_idx` ON `evaluations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `evaluations_status_idx` ON `evaluations` (`status`);--> statement-breakpoint
CREATE INDEX `evaluations_created_at_idx` ON `evaluations` (`created_at`);
