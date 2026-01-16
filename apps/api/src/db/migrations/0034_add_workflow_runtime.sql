-- Add runtime column to workflows table
-- Values: 'worker' (fast, synchronous, max 30s) or 'workflow' (durable with retries and checkpoints)
ALTER TABLE `workflows` ADD `runtime` text NOT NULL DEFAULT 'workflow';
CREATE INDEX `workflows_runtime_idx` ON `workflows` (`runtime`);
