-- Slack Bots
CREATE TABLE IF NOT EXISTS `slack_bots` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `encrypted_bot_token` text NOT NULL,
  `encrypted_signing_secret` text NOT NULL,
  `app_id` text,
  `team_id` text,
  `team_name` text,
  `token_last_four` text NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `slack_bots_name_idx` ON `slack_bots` (`name`);
CREATE INDEX IF NOT EXISTS `slack_bots_organization_id_idx` ON `slack_bots` (`organization_id`);
CREATE INDEX IF NOT EXISTS `slack_bots_created_at_idx` ON `slack_bots` (`created_at`);

-- Slack Triggers
CREATE TABLE IF NOT EXISTS `slack_triggers` (
  `workflow_id` text PRIMARY KEY NOT NULL REFERENCES `workflows`(`id`) ON DELETE CASCADE,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `slack_bot_id` text REFERENCES `slack_bots`(`id`) ON DELETE SET NULL,
  `channel_id` text,
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `slack_triggers_workflow_id_idx` ON `slack_triggers` (`workflow_id`);
CREATE INDEX IF NOT EXISTS `slack_triggers_organization_id_idx` ON `slack_triggers` (`organization_id`);
CREATE INDEX IF NOT EXISTS `slack_triggers_slack_bot_id_idx` ON `slack_triggers` (`slack_bot_id`);
CREATE INDEX IF NOT EXISTS `slack_triggers_active_idx` ON `slack_triggers` (`active`);
CREATE INDEX IF NOT EXISTS `slack_triggers_created_at_idx` ON `slack_triggers` (`created_at`);
CREATE INDEX IF NOT EXISTS `slack_triggers_updated_at_idx` ON `slack_triggers` (`updated_at`);
CREATE UNIQUE INDEX IF NOT EXISTS `slack_triggers_channel_workflow_unique_idx` ON `slack_triggers` (`channel_id`, `workflow_id`);
