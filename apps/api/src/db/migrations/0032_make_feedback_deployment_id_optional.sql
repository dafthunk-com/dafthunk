-- Make deployment_id nullable in feedback table
CREATE TABLE `feedback_new` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`deployment_id` text,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`sentiment` text NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`deployment_id`) REFERENCES `deployments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `feedback_new` SELECT * FROM `feedback`;
--> statement-breakpoint
DROP TABLE `feedback`;
--> statement-breakpoint
ALTER TABLE `feedback_new` RENAME TO `feedback`;
--> statement-breakpoint
CREATE INDEX `feedback_execution_id_idx` ON `feedback` (`execution_id`);--> statement-breakpoint
CREATE INDEX `feedback_deployment_id_idx` ON `feedback` (`deployment_id`);--> statement-breakpoint
CREATE INDEX `feedback_organization_id_idx` ON `feedback` (`organization_id`);--> statement-breakpoint
CREATE INDEX `feedback_user_id_idx` ON `feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `feedback_sentiment_idx` ON `feedback` (`sentiment`);--> statement-breakpoint
CREATE INDEX `feedback_created_at_idx` ON `feedback` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `feedback_execution_id_unique` ON `feedback` (`execution_id`);
