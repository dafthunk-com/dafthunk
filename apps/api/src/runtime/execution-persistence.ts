import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { type ExecutionStatusType } from "../db";
import { ExecutionStore } from "../stores/execution-store";
import type { RuntimeState } from "./runtime";

/**
 * Handles persistence for workflow executions.
 * Manages database storage of execution state.
 */
export class ExecutionPersistence {
  private executionStore: ExecutionStore;

  constructor(env: Bindings) {
    this.executionStore = new ExecutionStore(env.DB, env.RESSOURCES);
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

    // Set generic workflow-level error message when there are node failures
    // Specific node errors are captured in nodeExecutions array
    const errorMsg =
      runtimeState.nodeErrors.size > 0
        ? "Workflow execution failed"
        : undefined;

    try {
      const execution = await this.executionStore.save({
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

      return execution;
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
