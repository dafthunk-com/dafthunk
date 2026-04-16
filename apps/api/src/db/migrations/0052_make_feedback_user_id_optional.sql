-- Make user_id nullable in feedback to allow anonymous submissions
-- (e.g. via create-feedback-form node public page)
CREATE TABLE `feedback_new` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`criterion_id` text NOT NULL,
	`workflow_id` text,
	`organization_id` text NOT NULL,
	`user_id` text,
	`sentiment` text NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`criterion_id`) REFERENCES `feedback_criteria`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `feedback_new` (`id`, `execution_id`, `criterion_id`, `workflow_id`, `organization_id`, `user_id`, `sentiment`, `comment`, `created_at`, `updated_at`)
	SELECT `id`, `execution_id`, `criterion_id`, `workflow_id`, `organization_id`, `user_id`, `sentiment`, `comment`, `created_at`, `updated_at` FROM `feedback`;
--> statement-breakpoint
DROP TABLE `feedback`;
--> statement-breakpoint
ALTER TABLE `feedback_new` RENAME TO `feedback`;
--> statement-breakpoint
CREATE INDEX `feedback_execution_id_idx` ON `feedback` (`execution_id`);--> statement-breakpoint
CREATE INDEX `feedback_criterion_id_idx` ON `feedback` (`criterion_id`);--> statement-breakpoint
CREATE INDEX `feedback_workflow_id_idx` ON `feedback` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `feedback_organization_id_idx` ON `feedback` (`organization_id`);--> statement-breakpoint
CREATE INDEX `feedback_user_id_idx` ON `feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `feedback_sentiment_idx` ON `feedback` (`sentiment`);--> statement-breakpoint
CREATE INDEX `feedback_created_at_idx` ON `feedback` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `feedback_execution_id_criterion_id_unique` ON `feedback` (`execution_id`, `criterion_id`);
