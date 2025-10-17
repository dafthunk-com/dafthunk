CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_token` text NOT NULL,
	`encrypted_refresh_token` text,
	`token_expires_at` integer,
	`metadata` text,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integrations_name_idx` ON `integrations` (`name`);--> statement-breakpoint
CREATE INDEX `integrations_provider_idx` ON `integrations` (`provider`);--> statement-breakpoint
CREATE INDEX `integrations_organization_id_idx` ON `integrations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `integrations_created_at_idx` ON `integrations` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_organization_id_name_unique_idx` ON `integrations` (`organization_id`,`name`);