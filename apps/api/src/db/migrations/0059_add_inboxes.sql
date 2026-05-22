-- Inboxes - Logical inboxes (e.g. "support"). The `id` is the opaque UUID
-- used as the top-level R2 key segment so the bucket layout doesn't depend
-- on the alias; renaming an inbox doesn't move any data.

CREATE TABLE IF NOT EXISTS `inboxes` (
  `id` text PRIMARY KEY NOT NULL,
  `alias` text NOT NULL UNIQUE,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS `inboxes_alias_idx` ON `inboxes` (`alias`);

-- Seed the support inbox with a literal UUIDv7. `INSERT OR IGNORE` so the
-- migration stays safe to re-run after a partial failure.
INSERT OR IGNORE INTO `inboxes` (`id`, `alias`)
VALUES ('019e511b-7eb8-70e3-bba4-e302ad204e03', 'support');

ALTER TABLE `threads`
  ADD COLUMN `inbox_id` text REFERENCES `inboxes`(`id`) ON DELETE RESTRICT;

UPDATE `threads`
SET `inbox_id` = '019e511b-7eb8-70e3-bba4-e302ad204e03'
WHERE `inbox_id` IS NULL;

CREATE INDEX IF NOT EXISTS `threads_inbox_id_idx` ON `threads` (`inbox_id`);
