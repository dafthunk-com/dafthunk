-- Decouple the externally-visible email handle from the internal UUID id.
-- Existing rows used the UUID id as the local part of the address, so backfill
-- with id to keep legacy addresses routable. (The original `handle` column from
-- 0019 was removed by 0045; this re-introduces it with a different design:
-- globally unique, slug + random suffix, decoupled from the PK.)
ALTER TABLE `emails` ADD COLUMN `handle` text;--> statement-breakpoint
UPDATE `emails` SET `handle` = `id` WHERE `handle` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `emails_handle_unique_idx` ON `emails` (`handle`);
