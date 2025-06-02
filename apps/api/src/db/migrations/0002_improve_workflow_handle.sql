DROP INDEX `workflows_handle_unique`;--> statement-breakpoint
DROP INDEX `workflows_handle_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `workflows_organization_id_handle_unique_idx` ON `workflows` (`organization_id`,`handle`);