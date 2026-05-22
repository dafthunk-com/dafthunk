-- Admin inbox primitives: threads + messages + attachments.
-- Stores only minimal metadata; raw MIME, parsed bodies, and attachment blobs
-- live in the RESSOURCES R2 bucket under the `support/` key prefix.

CREATE TABLE IF NOT EXISTS `threads` (
  `id` text PRIMARY KEY NOT NULL,
  `subject` text NOT NULL,
  `from_email` text NOT NULL,
  `from_name` text,
  `user_id` text REFERENCES `users`(`id`) ON DELETE SET NULL,
  `organization_id` text REFERENCES `organizations`(`id`) ON DELETE SET NULL,
  `status` text NOT NULL DEFAULT 'open',
  `last_message_at` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS `threads_status_idx` ON `threads` (`status`);
CREATE INDEX IF NOT EXISTS `threads_last_message_at_idx` ON `threads` (`last_message_at`);
CREATE INDEX IF NOT EXISTS `threads_from_email_idx` ON `threads` (`from_email`);
CREATE INDEX IF NOT EXISTS `threads_user_id_idx` ON `threads` (`user_id`);
CREATE INDEX IF NOT EXISTS `threads_organization_id_idx` ON `threads` (`organization_id`);
CREATE INDEX IF NOT EXISTS `threads_created_at_idx` ON `threads` (`created_at`);

CREATE TABLE IF NOT EXISTS `messages` (
  `id` text PRIMARY KEY NOT NULL,
  `thread_id` text NOT NULL REFERENCES `threads`(`id`) ON DELETE CASCADE,
  `direction` text NOT NULL,
  `rfc822_message_id` text NOT NULL UNIQUE,
  `in_reply_to` text,
  `references_chain` text,
  `from_email` text NOT NULL,
  `to_email` text NOT NULL,
  `subject` text NOT NULL,
  `snippet` text NOT NULL DEFAULT '',
  `has_html` integer NOT NULL DEFAULT 0,
  `has_text` integer NOT NULL DEFAULT 0,
  `attachment_count` integer NOT NULL DEFAULT 0,
  `raw_r2_key` text NOT NULL,
  `author_admin_user_id` text REFERENCES `users`(`id`) ON DELETE SET NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS `messages_thread_id_idx` ON `messages` (`thread_id`);
CREATE INDEX IF NOT EXISTS `messages_rfc822_message_id_idx` ON `messages` (`rfc822_message_id`);
CREATE INDEX IF NOT EXISTS `messages_direction_idx` ON `messages` (`direction`);
CREATE INDEX IF NOT EXISTS `messages_created_at_idx` ON `messages` (`created_at`);

CREATE TABLE IF NOT EXISTS `attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `message_id` text NOT NULL REFERENCES `messages`(`id`) ON DELETE CASCADE,
  `filename` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `r2_key` text NOT NULL,
  `content_id` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS `attachments_message_id_idx` ON `attachments` (`message_id`);
CREATE INDEX IF NOT EXISTS `attachments_content_id_idx` ON `attachments` (`content_id`);
