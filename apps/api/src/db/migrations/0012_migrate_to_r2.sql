PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_secrets`("id", "name", "encrypted_value", "organization_id", "created_at", "updated_at") SELECT "id", "name", "encrypted_value", "organization_id", "created_at", "updated_at" FROM `secrets`;--> statement-breakpoint
DROP TABLE `secrets`;--> statement-breakpoint
ALTER TABLE `__new_secrets` RENAME TO `secrets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `secrets_name_idx` ON `secrets` (`name`);--> statement-breakpoint
CREATE INDEX `secrets_organization_id_idx` ON `secrets` (`organization_id`);--> statement-breakpoint
CREATE INDEX `secrets_created_at_idx` ON `secrets` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `secrets_organization_id_name_unique_idx` ON `secrets` (`organization_id`,`name`);--> statement-breakpoint
DROP INDEX `executions_visibility_idx`;--> statement-breakpoint
ALTER TABLE `executions` DROP COLUMN `data`;--> statement-breakpoint
ALTER TABLE `executions` DROP COLUMN `visibility`;--> statement-breakpoint
ALTER TABLE `executions` DROP COLUMN `og_image_generated`;--> statement-breakpoint
ALTER TABLE `deployments` DROP COLUMN `workflow_data`;--> statement-breakpoint
ALTER TABLE `workflows` DROP COLUMN `data`;