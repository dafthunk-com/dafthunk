CREATE TABLE `databases` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `databases_name_idx` ON `databases` (`name`);--> statement-breakpoint
CREATE INDEX `databases_handle_idx` ON `databases` (`handle`);--> statement-breakpoint
CREATE INDEX `databases_organization_id_idx` ON `databases` (`organization_id`);--> statement-breakpoint
CREATE INDEX `databases_created_at_idx` ON `databases` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `databases_organization_id_handle_unique_idx` ON `databases` (`organization_id`,`handle`);
