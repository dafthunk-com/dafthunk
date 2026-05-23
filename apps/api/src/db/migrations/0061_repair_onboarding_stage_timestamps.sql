-- Repair onboarding stamps written by the prior `CURRENT_TIMESTAMP` stamper.
-- SQLite returned the TEXT 'YYYY-MM-DD HH:MM:SS' literal and stored it as
-- TEXT in the INTEGER-affinity column (not a well-formed numeric literal),
-- which Drizzle then read back as Invalid Date and surfaced as a phantom
-- "reached" stage with a null timestamp in the admin funnel.
--
-- `strftime('%s', value)` parses the UTC text back into Unix epoch seconds,
-- matching what the new `unixepoch()` stamper writes going forward.

UPDATE `users`
SET `tour_completed` = CAST(strftime('%s', `tour_completed`) AS INTEGER)
WHERE typeof(`tour_completed`) = 'text';--> statement-breakpoint

UPDATE `users`
SET `workflow_created` = CAST(strftime('%s', `workflow_created`) AS INTEGER)
WHERE typeof(`workflow_created`) = 'text';--> statement-breakpoint

UPDATE `users`
SET `workflow_executed` = CAST(strftime('%s', `workflow_executed`) AS INTEGER)
WHERE typeof(`workflow_executed`) = 'text';--> statement-breakpoint

UPDATE `users`
SET `workflow_executed_ok` = CAST(strftime('%s', `workflow_executed_ok`) AS INTEGER)
WHERE typeof(`workflow_executed_ok`) = 'text';
