import type { MonitoringService } from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";

import type { WorkflowAgent } from "../durable-objects/workflow-agent";

export type { MonitoringService };

/**
 * Production implementation that sends updates to WorkflowAgent Durable Objects.
 * Used by Runtime to communicate execution progress to connected clients.
 */
export class CloudflareMonitoringService implements MonitoringService {
  constructor(
    private readonly workflowAgent: DurableObjectNamespace<WorkflowAgent>
  ) {}

  async sendUpdate(
    sessionId: string | undefined,
    execution: WorkflowExecution
  ): Promise<void> {
    if (!sessionId) {
      return;
    }

    try {
      const id = this.workflowAgent.idFromName(sessionId);
      const stub = this.workflowAgent.get(id);

      await stub.fetch(`https://workflow-agent/execution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(execution),
      });
    } catch (error) {
      console.error(
        `Failed to send execution update to agent ${sessionId}:`,
        error
      );
    }
  }
}
