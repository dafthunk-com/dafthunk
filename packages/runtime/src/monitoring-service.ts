import type { WorkflowExecution } from "@dafthunk/types";

/**
 * Receives execution progress updates from the runtime.
 * Implementations route these to connected clients (via AgentWorkflow
 * callbacks) or discard them (worker runtime, tests).
 */
export interface MonitoringService {
  sendUpdate(execution: WorkflowExecution): Promise<void>;
}
