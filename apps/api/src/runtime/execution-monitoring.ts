import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";

/**
 * Handles real-time monitoring updates for workflow executions.
 * Sends execution state to a workflow session Durable Object.
 */
export class ExecutionMonitoring {
  constructor(
    private env: Bindings,
    private sessionId?: string
  ) {}

  /**
   * Sends execution update to the workflow session Durable Object.
   * No-op if no session ID is provided.
   */
  async sendUpdate(execution: WorkflowExecution): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      const id = this.env.WORKFLOW_SESSION.idFromName(this.sessionId);
      const stub = this.env.WORKFLOW_SESSION.get(id);

      await stub.fetch(`https://workflow-session/execution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(execution),
      });
    } catch (error) {
      console.error(
        `Failed to send execution update to session ${this.sessionId}:`,
        error
      );
    }
  }
}
