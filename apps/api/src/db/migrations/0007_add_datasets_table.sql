CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `datasets_name_idx` ON `datasets` (`name`);--> statement-breakpoint
CREATE INDEX `datasets_handle_idx` ON `datasets` (`handle`);--> statement-breakpoint
CREATE INDEX `datasets_organization_id_idx` ON `datasets` (`organization_id`);--> statement-breakpoint
CREATE INDEX `datasets_created_at_idx` ON `datasets` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `datasets_organization_id_handle_unique_idx` ON `datasets` (`organization_id`,`handle`);