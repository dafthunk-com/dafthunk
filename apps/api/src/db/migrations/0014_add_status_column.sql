ALTER TABLE `integrations` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX `integrations_status_idx` ON `integrations` (`status`);