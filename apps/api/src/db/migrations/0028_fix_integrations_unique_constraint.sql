-- Fix unique constraint to allow same integration name across different providers
-- This enables users to connect both Google Mail and Google Calendar with the same Google account
DROP INDEX `integrations_organization_id_name_unique_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_organization_id_name_provider_unique_idx` ON `integrations` (`organization_id`,`name`,`provider`);
