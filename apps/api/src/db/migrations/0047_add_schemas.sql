-- Schemas - User-defined record schemas for validation
CREATE TABLE IF NOT EXISTS `schemas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`fields` text NOT NULL,
	`organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `schemas_name_idx` ON `schemas` (`name`);
CREATE INDEX IF NOT EXISTS `schemas_organization_id_idx` ON `schemas` (`organization_id`);
CREATE INDEX IF NOT EXISTS `schemas_created_at_idx` ON `schemas` (`created_at`);
