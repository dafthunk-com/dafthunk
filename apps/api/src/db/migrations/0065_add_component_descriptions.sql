-- Instance-level descriptions for the org's own components.
--
-- The workflow generator grounds its judgement on what a workspace already
-- owns, and a name alone cannot carry that: "main" says nothing about what a
-- database holds, "alerts" nothing about what a queue is for. Schemas already
-- have a description column; this brings the other five families level, so
-- every org resource can explain itself to the generator (and to people).
--
-- NOT NULL DEFAULT '' rather than nullable, mirroring `schemas.description`:
-- absent and empty mean the same thing everywhere this is read.

ALTER TABLE `datasets` ADD COLUMN `description` text NOT NULL DEFAULT '';--> statement-breakpoint

ALTER TABLE `queues` ADD COLUMN `description` text NOT NULL DEFAULT '';--> statement-breakpoint

ALTER TABLE `databases` ADD COLUMN `description` text NOT NULL DEFAULT '';--> statement-breakpoint

ALTER TABLE `emails` ADD COLUMN `description` text NOT NULL DEFAULT '';--> statement-breakpoint

ALTER TABLE `bots` ADD COLUMN `description` text NOT NULL DEFAULT '';
