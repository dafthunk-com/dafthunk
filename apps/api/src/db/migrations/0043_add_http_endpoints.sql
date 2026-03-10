-- Endpoints
CREATE TABLE `endpoints` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `handle` text NOT NULL,
  `mode` text NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `endpoints_name_idx` ON `endpoints`(`name`);
CREATE INDEX `endpoints_handle_idx` ON `endpoints`(`handle`);
CREATE INDEX `endpoints_mode_idx` ON `endpoints`(`mode`);
CREATE INDEX `endpoints_organization_id_idx` ON `endpoints`(`organization_id`);
CREATE INDEX `endpoints_created_at_idx` ON `endpoints`(`created_at`);
CREATE UNIQUE INDEX `endpoints_organization_id_handle_unique_idx` ON `endpoints`(`organization_id`, `handle`);

-- Endpoint Triggers
CREATE TABLE `endpoint_triggers` (
  `workflow_id` text PRIMARY KEY NOT NULL REFERENCES `workflows`(`id`) ON DELETE CASCADE,
  `endpoint_id` text NOT NULL REFERENCES `endpoints`(`id`) ON DELETE CASCADE,
  `active` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `endpoint_triggers_workflow_id_idx` ON `endpoint_triggers`(`workflow_id`);
CREATE INDEX `endpoint_triggers_endpoint_id_idx` ON `endpoint_triggers`(`endpoint_id`);
CREATE INDEX `endpoint_triggers_active_idx` ON `endpoint_triggers`(`active`);
CREATE INDEX `endpoint_triggers_created_at_idx` ON `endpoint_triggers`(`created_at`);
CREATE INDEX `endpoint_triggers_updated_at_idx` ON `endpoint_triggers`(`updated_at`);
