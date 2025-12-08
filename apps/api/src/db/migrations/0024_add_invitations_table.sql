-- Add invitations table for organization membership invitations
CREATE TABLE `invitations` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `organization_id` text NOT NULL,
  `role` text DEFAULT 'member' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `invited_by` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create indexes for invitations table
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);
CREATE INDEX `invitations_organization_id_idx` ON `invitations` (`organization_id`);
CREATE INDEX `invitations_status_idx` ON `invitations` (`status`);
CREATE INDEX `invitations_invited_by_idx` ON `invitations` (`invited_by`);
CREATE INDEX `invitations_expires_at_idx` ON `invitations` (`expires_at`);
CREATE INDEX `invitations_created_at_idx` ON `invitations` (`created_at`);
CREATE UNIQUE INDEX `invitations_organization_id_email_status_unique_idx` ON `invitations` (`organization_id`, `email`, `status`);
