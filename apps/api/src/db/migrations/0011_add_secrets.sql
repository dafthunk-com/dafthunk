CREATE TABLE `secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `secrets_name_idx` ON `secrets` (`name`);--> statement-breakpoint
CREATE INDEX `secrets_organization_id_idx` ON `secrets` (`organization_id`);--> statement-breakpoint
CREATE INDEX `secrets_created_at_idx` ON `secrets` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `secrets_organization_id_name_unique_idx` ON `secrets` (`organization_id`,`name`);