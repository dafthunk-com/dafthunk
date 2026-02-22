-- Clean-slate feedback system: multi-criteria evaluation
-- Drops existing feedback table (no backward compatibility)

DROP TABLE IF EXISTS `feedback`;

-- Feedback criteria: evaluation questions per workflow/deployment
-- workflow-level (deployment_id NULL) = editable templates
-- deployment-level (deployment_id set) = frozen copies created at deploy time
CREATE TABLE `feedback_criteria` (
  `id` text PRIMARY KEY NOT NULL,
  `workflow_id` text NOT NULL REFERENCES `workflows`(`id`) ON DELETE CASCADE,
  `deployment_id` text REFERENCES `deployments`(`id`) ON DELETE CASCADE,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `question` text NOT NULL,
  `description` text,
  `display_order` integer NOT NULL DEFAULT 0,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `feedback_criteria_workflow_id_idx` ON `feedback_criteria` (`workflow_id`);
CREATE INDEX `feedback_criteria_deployment_id_idx` ON `feedback_criteria` (`deployment_id`);
CREATE INDEX `feedback_criteria_organization_id_idx` ON `feedback_criteria` (`organization_id`);
CREATE INDEX `feedback_criteria_display_order_idx` ON `feedback_criteria` (`display_order`);

-- Rebuilt feedback table with criterion_id
CREATE TABLE `feedback` (
  `id` text PRIMARY KEY NOT NULL,
  `execution_id` text NOT NULL,
  `criterion_id` text NOT NULL REFERENCES `feedback_criteria`(`id`) ON DELETE CASCADE,
  `workflow_id` text REFERENCES `workflows`(`id`) ON DELETE CASCADE,
  `deployment_id` text REFERENCES `deployments`(`id`) ON DELETE CASCADE,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `sentiment` text NOT NULL,
  `comment` text,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `feedback_execution_id_idx` ON `feedback` (`execution_id`);
CREATE INDEX `feedback_criterion_id_idx` ON `feedback` (`criterion_id`);
CREATE INDEX `feedback_workflow_id_idx` ON `feedback` (`workflow_id`);
CREATE INDEX `feedback_deployment_id_idx` ON `feedback` (`deployment_id`);
CREATE INDEX `feedback_organization_id_idx` ON `feedback` (`organization_id`);
CREATE INDEX `feedback_user_id_idx` ON `feedback` (`user_id`);
CREATE INDEX `feedback_sentiment_idx` ON `feedback` (`sentiment`);
CREATE INDEX `feedback_created_at_idx` ON `feedback` (`created_at`);
CREATE UNIQUE INDEX `feedback_execution_id_criterion_id_unique` ON `feedback` (`execution_id`, `criterion_id`);
