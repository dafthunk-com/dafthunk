-- WhatsApp Accounts
CREATE TABLE IF NOT EXISTS `whatsapp_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `phone_number_id` text NOT NULL,
  `encrypted_access_token` text NOT NULL,
  `token_last_four` text NOT NULL,
  `waba_id` text,
  `encrypted_app_secret` text,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `whatsapp_accounts_name_idx` ON `whatsapp_accounts` (`name`);
CREATE INDEX IF NOT EXISTS `whatsapp_accounts_organization_id_idx` ON `whatsapp_accounts` (`organization_id`);
CREATE INDEX IF NOT EXISTS `whatsapp_accounts_phone_number_id_idx` ON `whatsapp_accounts` (`phone_number_id`);
CREATE INDEX IF NOT EXISTS `whatsapp_accounts_created_at_idx` ON `whatsapp_accounts` (`created_at`);

-- WhatsApp Triggers
CREATE TABLE IF NOT EXISTS `whatsapp_triggers` (
  `workflow_id` text PRIMARY KEY NOT NULL REFERENCES `workflows`(`id`) ON DELETE CASCADE,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `phone_number_id` text,
  `whatsapp_account_id` text REFERENCES `whatsapp_accounts`(`id`) ON DELETE SET NULL,
  `verify_token` text,
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `whatsapp_triggers_workflow_id_idx` ON `whatsapp_triggers` (`workflow_id`);
CREATE INDEX IF NOT EXISTS `whatsapp_triggers_organization_id_idx` ON `whatsapp_triggers` (`organization_id`);
CREATE INDEX IF NOT EXISTS `whatsapp_triggers_phone_number_id_idx` ON `whatsapp_triggers` (`phone_number_id`);
CREATE INDEX IF NOT EXISTS `whatsapp_triggers_whatsapp_account_id_idx` ON `whatsapp_triggers` (`whatsapp_account_id`);
CREATE INDEX IF NOT EXISTS `whatsapp_triggers_active_idx` ON `whatsapp_triggers` (`active`);
CREATE INDEX IF NOT EXISTS `whatsapp_triggers_created_at_idx` ON `whatsapp_triggers` (`created_at`);
CREATE INDEX IF NOT EXISTS `whatsapp_triggers_updated_at_idx` ON `whatsapp_triggers` (`updated_at`);
CREATE UNIQUE INDEX IF NOT EXISTS `whatsapp_triggers_phone_workflow_unique_idx` ON `whatsapp_triggers` (`phone_number_id`, `workflow_id`);
