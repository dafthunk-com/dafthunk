ALTER TABLE `users` ADD `developer_mode` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `users_developer_mode_idx` ON `users` (`developer_mode`);