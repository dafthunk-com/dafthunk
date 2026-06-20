-- Drop the endpoints abstraction. HTTP-triggered workflows are now executed
-- directly by workflow id at `/http/:workflowId` (mirroring form triggers), so
-- the separate endpoint resource and its workflow join table are no longer used.
-- Indexes are removed implicitly when their table is dropped.

DROP TABLE IF EXISTS `endpoint_triggers`;--> statement-breakpoint

DROP TABLE IF EXISTS `endpoints`;
