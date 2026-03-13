-- Remove handle columns and related indexes from all tables

-- organizations
DROP INDEX IF EXISTS `organizations_handle_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `organizations_handle_idx`;--> statement-breakpoint
ALTER TABLE `organizations` DROP COLUMN `handle`;--> statement-breakpoint

-- workflows
DROP INDEX IF EXISTS `workflows_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `workflows` DROP COLUMN `handle`;--> statement-breakpoint

-- datasets
DROP INDEX IF EXISTS `datasets_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `datasets_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `datasets` DROP COLUMN `handle`;--> statement-breakpoint

-- queues
DROP INDEX IF EXISTS `queues_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `queues_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `queues` DROP COLUMN `handle`;--> statement-breakpoint

-- databases
DROP INDEX IF EXISTS `databases_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `databases_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `databases` DROP COLUMN `handle`;--> statement-breakpoint

-- emails
DROP INDEX IF EXISTS `emails_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `emails_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `emails` DROP COLUMN `handle`;--> statement-breakpoint

-- endpoints
DROP INDEX IF EXISTS `endpoints_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `endpoints_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `endpoints` DROP COLUMN `handle`;--> statement-breakpoint

-- discord_bots
DROP INDEX IF EXISTS `discord_bots_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `discord_bots_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `discord_bots` DROP COLUMN `handle`;--> statement-breakpoint

-- telegram_bots
DROP INDEX IF EXISTS `telegram_bots_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `telegram_bots_organization_id_handle_unique_idx`;--> statement-breakpoint
ALTER TABLE `telegram_bots` DROP COLUMN `handle`;
