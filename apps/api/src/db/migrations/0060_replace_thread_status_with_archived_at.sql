-- Replace the open/pending/closed thread status with a single archived_at
-- timestamp. NULL = active inbox thread, non-null = archived. The inbound
-- email path clears archived_at when a new message arrives so archived
-- threads automatically return to the inbox on reply.

ALTER TABLE `threads` ADD COLUMN `archived_at` integer;

-- Map existing closed threads to archived; pending threads fall back to
-- active since the workflow no longer distinguishes them.
UPDATE `threads` SET `archived_at` = `updated_at` WHERE `status` = 'closed';

DROP INDEX IF EXISTS `threads_status_idx`;

ALTER TABLE `threads` DROP COLUMN `status`;

CREATE INDEX IF NOT EXISTS `threads_archived_at_idx` ON `threads` (`archived_at`);
