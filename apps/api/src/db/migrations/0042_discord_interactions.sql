-- Add public_key column to discord_bots
ALTER TABLE discord_bots ADD COLUMN public_key TEXT;

-- Recreate discord_triggers with new schema for interactions API
-- First drop old table
DROP TABLE IF EXISTS discord_triggers;

-- Create new discord_triggers table
CREATE TABLE discord_triggers (
  workflow_id TEXT PRIMARY KEY REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  discord_bot_id TEXT REFERENCES discord_bots(id) ON DELETE SET NULL,
  command_name TEXT NOT NULL,
  command_description TEXT,
  guild_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes
CREATE INDEX discord_triggers_workflow_id_idx ON discord_triggers(workflow_id);
CREATE INDEX discord_triggers_organization_id_idx ON discord_triggers(organization_id);
CREATE INDEX discord_triggers_discord_bot_id_idx ON discord_triggers(discord_bot_id);
CREATE INDEX discord_triggers_active_idx ON discord_triggers(active);
CREATE INDEX discord_triggers_created_at_idx ON discord_triggers(created_at);
CREATE INDEX discord_triggers_updated_at_idx ON discord_triggers(updated_at);
CREATE UNIQUE INDEX discord_triggers_bot_command_unique_idx ON discord_triggers(discord_bot_id, command_name);
