import type { WorkflowExecution } from "@dafthunk/types";

import type { Session } from "../session/session";

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

/**
 * Production implementation that sends updates to Workflow Session Durable Objects.
 * Used by Runtime to communicate execution progress to connected clients.
 */
export class CloudflareMonitoringService implements MonitoringService {
  constructor(
    private readonly workflowSession: DurableObjectNamespace<Session>
  ) {}

  async sendUpdate(
    sessionId: string | undefined,
    execution: WorkflowExecution
  ): Promise<void> {
    if (!sessionId) {
      return;
    }

    try {
      const id = this.workflowSession.idFromName(sessionId);
      const stub = this.workflowSession.get(id);

      await stub.fetch(`https://workflow-session/execution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(execution),
      });
    } catch (error) {
      console.error(
        `Failed to send execution update to session ${sessionId}:`,
        error
      );
    }
  }
}
