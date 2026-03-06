CREATE TABLE `telegram_triggers` (
	`workflow_id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`chat_id` text NOT NULL,
	`secret_token` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `telegram_triggers_workflow_id_idx` ON `telegram_triggers` (`workflow_id`);
--> statement-breakpoint
CREATE INDEX `telegram_triggers_organization_id_idx` ON `telegram_triggers` (`organization_id`);
--> statement-breakpoint
CREATE INDEX `telegram_triggers_chat_id_idx` ON `telegram_triggers` (`chat_id`);
--> statement-breakpoint
CREATE INDEX `telegram_triggers_active_idx` ON `telegram_triggers` (`active`);
--> statement-breakpoint
CREATE INDEX `telegram_triggers_created_at_idx` ON `telegram_triggers` (`created_at`);
--> statement-breakpoint
CREATE INDEX `telegram_triggers_updated_at_idx` ON `telegram_triggers` (`updated_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_triggers_chat_workflow_unique_idx` ON `telegram_triggers` (`chat_id`, `workflow_id`);
