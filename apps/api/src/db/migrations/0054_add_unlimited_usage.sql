-- Add unlimited_usage flag for organizations exempted from credit limits
-- (e.g., internal/test accounts without a Stripe subscription).
ALTER TABLE `organizations` ADD COLUMN `unlimited_usage` integer DEFAULT false NOT NULL;
