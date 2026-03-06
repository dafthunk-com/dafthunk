CREATE TABLE `discord_triggers` (
	`workflow_id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `discord_triggers_workflow_id_idx` ON `discord_triggers` (`workflow_id`);
--> statement-breakpoint
CREATE INDEX `discord_triggers_organization_id_idx` ON `discord_triggers` (`organization_id`);
--> statement-breakpoint
CREATE INDEX `discord_triggers_guild_id_idx` ON `discord_triggers` (`guild_id`);
--> statement-breakpoint
CREATE INDEX `discord_triggers_active_idx` ON `discord_triggers` (`active`);
--> statement-breakpoint
CREATE INDEX `discord_triggers_created_at_idx` ON `discord_triggers` (`created_at`);
--> statement-breakpoint
CREATE INDEX `discord_triggers_updated_at_idx` ON `discord_triggers` (`updated_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `discord_triggers_guild_channel_workflow_unique_idx` ON `discord_triggers` (`guild_id`, `channel_id`, `workflow_id`);
