import type { WorkflowExecution } from "@dafthunk/types";

/**
 * Service for sending workflow execution monitoring updates.
 * Provides an abstraction over the underlying communication mechanism.
 */
export interface MonitoringService {
  /**
   * Sends an execution update to the specified session.
   * @param sessionId - Optional session identifier. No-op if undefined.
   * @param execution - The execution record to send.
   */
  sendUpdate(
    sessionId: string | undefined,
    execution: WorkflowExecution
  ): Promise<void>;
}
