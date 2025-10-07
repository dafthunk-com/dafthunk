import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { createDatabase, type ExecutionStatusType, saveExecution } from "../db";
import type { RuntimeState } from "./runtime";

/**
 * Handles persistence and updates for workflow executions.
 * Manages database storage and WebSocket updates to sessions.
 */
export class ExecutionPersistence {
  constructor(private env: Bindings) {}

  /**
   * Sends execution update to workflow session via WebSocket
   */
  async sendExecutionUpdateToSession(
    workflowSessionId: string,
    execution: WorkflowExecution
  ): Promise<void> {
    try {
      const id = this.env.WORKFLOW_SESSION.idFromName(workflowSessionId);
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
        `Failed to send execution update to session ${workflowSessionId}:`,
        error
      );
    }
  }

  /**
   * Builds node execution list from runtime state
   */
  buildNodeExecutions(runtimeState: RuntimeState) {
    return runtimeState.workflow.nodes.map((node) => {
      if (runtimeState.executedNodes.has(node.id)) {
        return {
          nodeId: node.id,
          status: "completed" as const,
          outputs: runtimeState.nodeOutputs.get(node.id) || {},
        };
      }
      if (runtimeState.nodeErrors.has(node.id)) {
        return {
          nodeId: node.id,
          status: "error" as const,
          error: runtimeState.nodeErrors.get(node.id),
        };
      }
      if (runtimeState.skippedNodes.has(node.id)) {
        return {
          nodeId: node.id,
          status: "skipped" as const,
        };
      }
      return {
        nodeId: node.id,
        status: "executing" as const,
      };
    });
  }

  /**
   * Persists the workflow execution state to the database.
   */
  async saveExecutionState(
    userId: string,
    organizationId: string,
    workflowId: string,
    instanceId: string,
    runtimeState: RuntimeState,
    startedAt?: Date,
    endedAt?: Date
  ): Promise<WorkflowExecution> {
    const nodeExecutionList = this.buildNodeExecutions(runtimeState);

    const executionStatus = runtimeState.status;
    const errorMsg =
      runtimeState.nodeErrors.size > 0
        ? Array.from(runtimeState.nodeErrors.values()).join(", ")
        : undefined;

    try {
      const db = createDatabase(this.env.DB);
      return await saveExecution(db, {
        id: instanceId,
        workflowId,
        userId,
        organizationId,
        status: executionStatus as ExecutionStatusType,
        nodeExecutions: nodeExecutionList,
        error: errorMsg,
        updatedAt: new Date(),
        startedAt,
        endedAt,
      });
    } catch (error) {
      console.error("Failed to persist execution record:", error);
      // Continue without interrupting the workflow.
    }

    return {
      id: instanceId,
      workflowId,
      status: executionStatus,
      nodeExecutions: nodeExecutionList,
      error: errorMsg,
      startedAt,
      endedAt,
    };
  }
}
