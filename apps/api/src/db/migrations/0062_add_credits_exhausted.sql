-- Denormalized cache of `hasEnoughCredits(estimatedUsage=1)` so trigger paths
-- can gate workflow execution with a single indexed boolean read. The runtime
-- flips this on; Stripe webhooks and overage-limit increases flip it off.

ALTER TABLE `organizations` ADD COLUMN `credits_exhausted` integer DEFAULT false NOT NULL;--> statement-breakpoint

CREATE INDEX `organizations_credits_exhausted_idx` ON `organizations` (`credits_exhausted`);
