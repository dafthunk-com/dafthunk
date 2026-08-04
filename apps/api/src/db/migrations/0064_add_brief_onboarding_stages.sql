-- Later onboarding stages, added with the brief flow.
--
-- `workflow_created` is stamped by the generator when it saves, which happens
-- before the user has seen anything, and `workflow_executed` is stamped at the
-- top of every execution including the generator's own test run. Neither can
-- distinguish a workflow someone wanted from one they abandoned mid-flow.
--
-- `brief_resolved` is the honest "the user committed to what we understood".
-- `outcome_seen` is the browser actually rendering a result, which is what
-- time-to-first-outcome measures. `workflow_kept` is them choosing to keep it.

ALTER TABLE `users` ADD COLUMN `brief_resolved` integer;--> statement-breakpoint

ALTER TABLE `users` ADD COLUMN `outcome_seen` integer;--> statement-breakpoint

ALTER TABLE `users` ADD COLUMN `workflow_kept` integer;
