CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `api_keys_name_idx` ON `api_keys` (`name`);--> statement-breakpoint
CREATE INDEX `api_keys_organization_id_idx` ON `api_keys` (`organization_id`);--> statement-breakpoint
CREATE INDEX `api_keys_created_at_idx` ON `api_keys` (`created_at`);--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`workflow_id` text,
	`version` integer NOT NULL,
	`workflow_data` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deployments_organization_id_idx` ON `deployments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `deployments_workflow_id_idx` ON `deployments` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `deployments_version_idx` ON `deployments` (`version`);--> statement-breakpoint
CREATE INDEX `deployments_created_at_idx` ON `deployments` (`created_at`);--> statement-breakpoint
CREATE INDEX `deployments_workflow_id_version_idx` ON `deployments` (`workflow_id`,`version`);--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`deployment_id` text,
	`organization_id` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`data` text NOT NULL,
	`error` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`og_image_generated` integer DEFAULT false,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deployment_id`) REFERENCES `deployments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `executions_workflow_id_idx` ON `executions` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `executions_organization_id_idx` ON `executions` (`organization_id`);--> statement-breakpoint
CREATE INDEX `executions_status_idx` ON `executions` (`status`);--> statement-breakpoint
CREATE INDEX `executions_deployment_id_idx` ON `executions` (`deployment_id`);--> statement-breakpoint
CREATE INDEX `executions_created_at_idx` ON `executions` (`created_at`);--> statement-breakpoint
CREATE INDEX `executions_started_at_idx` ON `executions` (`started_at`);--> statement-breakpoint
CREATE INDEX `executions_ended_at_idx` ON `executions` (`ended_at`);--> statement-breakpoint
CREATE INDEX `executions_visibility_idx` ON `executions` (`visibility`);--> statement-breakpoint
CREATE INDEX `executions_organization_id_status_idx` ON `executions` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `executions_workflow_id_status_idx` ON `executions` (`workflow_id`,`status`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`user_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `organization_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memberships_role_idx` ON `memberships` (`role`);--> statement-breakpoint
CREATE INDEX `memberships_user_id_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_organization_id_idx` ON `memberships` (`organization_id`);--> statement-breakpoint
CREATE INDEX `memberships_created_at_idx` ON `memberships` (`created_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_handle_unique` ON `organizations` (`handle`);--> statement-breakpoint
CREATE INDEX `organizations_name_idx` ON `organizations` (`name`);--> statement-breakpoint
CREATE INDEX `organizations_handle_idx` ON `organizations` (`handle`);--> statement-breakpoint
CREATE INDEX `organizations_created_at_idx` ON `organizations` (`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`provider` text NOT NULL,
	`github_id` text,
	`google_id` text,
	`avatar_url` text,
	`organization_id` text NOT NULL,
	`plan` text DEFAULT 'trial' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_provider_githubid_googleid_idx` ON `users` (`provider`,`github_id`,`google_id`);--> statement-breakpoint
CREATE INDEX `users_organization_id_idx` ON `users` (`organization_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `users` (`name`);--> statement-breakpoint
CREATE INDEX `users_plan_idx` ON `users` (`plan`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_created_at_idx` ON `users` (`created_at`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`data` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflows_name_idx` ON `workflows` (`name`);--> statement-breakpoint
CREATE INDEX `workflows_handle_idx` ON `workflows` (`handle`);--> statement-breakpoint
CREATE INDEX `workflows_organization_id_idx` ON `workflows` (`organization_id`);--> statement-breakpoint
CREATE INDEX `workflows_created_at_idx` ON `workflows` (`created_at`);--> statement-breakpoint
CREATE INDEX `workflows_updated_at_idx` ON `workflows` (`updated_at`);--> statement-breakpoint
CREATE INDEX `workflows_organization_id_handle_idx` ON `workflows` (`organization_id`,`handle`);