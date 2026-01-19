-- Add MCP enabled setting to organizations table
ALTER TABLE `organizations` ADD `mcp_enabled` integer DEFAULT true NOT NULL;

-- Add index for faster lookups
CREATE INDEX `organizations_mcp_enabled_idx` ON `organizations` (`mcp_enabled`);
