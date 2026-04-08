-- Drop old bot and trigger tables
DROP TABLE IF EXISTS `discord_triggers`;
DROP TABLE IF EXISTS `telegram_triggers`;
DROP TABLE IF EXISTS `whatsapp_triggers`;
DROP TABLE IF EXISTS `slack_triggers`;
DROP TABLE IF EXISTS `discord_bots`;
DROP TABLE IF EXISTS `telegram_bots`;
DROP TABLE IF EXISTS `whatsapp_accounts`;
DROP TABLE IF EXISTS `slack_bots`;

-- Unified Bots table
CREATE TABLE IF NOT EXISTS `bots` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `provider` text NOT NULL,
  `encrypted_token` text NOT NULL,
  `token_last_four` text NOT NULL,
  `metadata` text,
  `encrypted_metadata` text,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS `bots_name_idx` ON `bots` (`name`);
CREATE INDEX IF NOT EXISTS `bots_provider_idx` ON `bots` (`provider`);
CREATE INDEX IF NOT EXISTS `bots_organization_id_idx` ON `bots` (`organization_id`);
CREATE INDEX IF NOT EXISTS `bots_created_at_idx` ON `bots` (`created_at`);

-- Unified Bot Triggers table
CREATE TABLE IF NOT EXISTS `bot_triggers` (
  `workflow_id` text PRIMARY KEY NOT NULL REFERENCES `workflows`(`id`) ON DELETE CASCADE,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `bot_id` text REFERENCES `bots`(`id`) ON DELETE SET NULL,
  `provider` text NOT NULL,
  `metadata` text,
  `active` integer NOT NULL DEFAULT 1,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS `bot_triggers_organization_id_idx` ON `bot_triggers` (`organization_id`);
CREATE INDEX IF NOT EXISTS `bot_triggers_bot_id_idx` ON `bot_triggers` (`bot_id`);
CREATE INDEX IF NOT EXISTS `bot_triggers_provider_idx` ON `bot_triggers` (`provider`);
CREATE INDEX IF NOT EXISTS `bot_triggers_active_idx` ON `bot_triggers` (`active`);
CREATE INDEX IF NOT EXISTS `bot_triggers_created_at_idx` ON `bot_triggers` (`created_at`);
CREATE INDEX IF NOT EXISTS `bot_triggers_updated_at_idx` ON `bot_triggers` (`updated_at`);
