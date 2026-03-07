-- Discord Bots table
CREATE TABLE `discord_bots` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `handle` text NOT NULL,
  `encrypted_bot_token` text NOT NULL,
  `application_id` text NOT NULL,
  `token_last_four` text NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE INDEX `discord_bots_name_idx` ON `discord_bots` (`name`);
CREATE INDEX `discord_bots_handle_idx` ON `discord_bots` (`handle`);
CREATE INDEX `discord_bots_organization_id_idx` ON `discord_bots` (`organization_id`);
CREATE INDEX `discord_bots_created_at_idx` ON `discord_bots` (`created_at`);
CREATE UNIQUE INDEX `discord_bots_organization_id_handle_unique_idx` ON `discord_bots` (`organization_id`, `handle`);

-- Telegram Bots table
CREATE TABLE `telegram_bots` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `handle` text NOT NULL,
  `encrypted_bot_token` text NOT NULL,
  `bot_username` text,
  `token_last_four` text NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE INDEX `telegram_bots_name_idx` ON `telegram_bots` (`name`);
CREATE INDEX `telegram_bots_handle_idx` ON `telegram_bots` (`handle`);
CREATE INDEX `telegram_bots_organization_id_idx` ON `telegram_bots` (`organization_id`);
CREATE INDEX `telegram_bots_created_at_idx` ON `telegram_bots` (`created_at`);
CREATE UNIQUE INDEX `telegram_bots_organization_id_handle_unique_idx` ON `telegram_bots` (`organization_id`, `handle`);

-- Add discord_bot_id to discord_triggers
ALTER TABLE `discord_triggers` ADD COLUMN `discord_bot_id` text REFERENCES `discord_bots`(`id`) ON DELETE SET NULL;
CREATE INDEX `discord_triggers_discord_bot_id_idx` ON `discord_triggers` (`discord_bot_id`);

-- Add telegram_bot_id to telegram_triggers
ALTER TABLE `telegram_triggers` ADD COLUMN `telegram_bot_id` text REFERENCES `telegram_bots`(`id`) ON DELETE SET NULL;
CREATE INDEX `telegram_triggers_telegram_bot_id_idx` ON `telegram_triggers` (`telegram_bot_id`);
