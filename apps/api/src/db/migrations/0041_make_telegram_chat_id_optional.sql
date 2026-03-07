-- SQLite doesn't support ALTER COLUMN, so we recreate the table with chat_id nullable
-- and route webhooks by telegram_bot_id instead of chat_id

-- Step 1: Create new table with chat_id nullable
CREATE TABLE `telegram_triggers_new` (
	`workflow_id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`chat_id` text,
	`telegram_bot_id` text REFERENCES `telegram_bots`(`id`) ON DELETE SET NULL,
	`secret_token` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Step 2: Copy data
INSERT INTO `telegram_triggers_new` SELECT * FROM `telegram_triggers`;
--> statement-breakpoint

-- Step 3: Drop old table
DROP TABLE `telegram_triggers`;
--> statement-breakpoint

-- Step 4: Rename new table
ALTER TABLE `telegram_triggers_new` RENAME TO `telegram_triggers`;
--> statement-breakpoint

-- Step 5: Recreate indexes
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
CREATE INDEX `telegram_triggers_telegram_bot_id_idx` ON `telegram_triggers` (`telegram_bot_id`);
