-- Per-admin read state for the admin support inbox. One row per
-- (thread, admin user). Updated whenever an admin opens a thread; powers
-- the unread badge on the sidebar.

CREATE TABLE IF NOT EXISTS `thread_reads` (
  `thread_id` text NOT NULL REFERENCES `threads`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `last_read_at` integer NOT NULL,
  PRIMARY KEY (`thread_id`, `user_id`)
);

CREATE INDEX IF NOT EXISTS `thread_reads_user_id_idx` ON `thread_reads` (`user_id`);
CREATE INDEX IF NOT EXISTS `thread_reads_thread_id_idx` ON `thread_reads` (`thread_id`);
