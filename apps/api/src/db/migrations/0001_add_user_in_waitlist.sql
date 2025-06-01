ALTER TABLE `users` ADD `in_waitlist` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `users_in_waitlist_idx` ON `users` (`in_waitlist`);