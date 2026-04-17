-- Drop sender email columns: sender verification is removed in favor of
-- a single platform-owned sender via Cloudflare Email Service.
ALTER TABLE `emails` DROP COLUMN `sender_email`;
--> statement-breakpoint
ALTER TABLE `emails` DROP COLUMN `sender_email_status`;
