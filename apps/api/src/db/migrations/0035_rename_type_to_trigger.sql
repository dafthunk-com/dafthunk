-- Rename type column to trigger in workflows table
-- This reflects the semantic meaning: type → how workflow is triggered
ALTER TABLE `workflows` RENAME COLUMN `type` TO `trigger`;

-- Drop old index and create new one with correct name
DROP INDEX IF EXISTS `workflows_type_idx`;
CREATE INDEX `workflows_trigger_idx` ON `workflows` (`trigger`);
