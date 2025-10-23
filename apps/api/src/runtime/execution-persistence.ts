import type { Workflow, WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { type ExecutionStatusType } from "../db";
import { ExecutionStore } from "../stores/execution-store";
import type { ErrorHandler } from "./error-handler";
import type { ExecutionState } from "./types";

/**
 * Handles persistence for workflow executions.
 * Manages database storage of execution state.
 */
export class ExecutionPersistence {
  private executionStore: ExecutionStore;

  constructor(
    env: Bindings,
    private errorHandler: ErrorHandler
  ) {
    this.executionStore = new ExecutionStore(env.DB, env.RESSOURCES);
  }

  /**
   * Builds node execution list from execution state
   */
  buildNodeExecutions(workflow: Workflow, state: ExecutionState) {
    return workflow.nodes.map((node) => {
      if (state.executedNodes.has(node.id)) {
        return {
          nodeId: node.id,
          status: "completed" as const,
          outputs: state.nodeOutputs.get(node.id) || {},
        };
      }
      if (state.nodeErrors.has(node.id)) {
        return {
          nodeId: node.id,
          status: "error" as const,
          error: state.nodeErrors.get(node.id),
        };
      }
      if (state.skippedNodes.has(node.id)) {
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
    workflow: Workflow,
    instanceId: string,
    state: ExecutionState,
    startedAt?: Date,
    endedAt?: Date
  ): Promise<WorkflowExecution> {
    const nodeExecutionList = this.buildNodeExecutions(workflow, state);

    const executionStatus = state.status;

    // Get error message from error handler
    const errorMsg = this.errorHandler.createErrorReport(state);

    try {
      const execution = await this.executionStore.save({
        id: instanceId,
        workflowId: workflow.id,
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
      workflowId: workflow.id,
      status: executionStatus,
      nodeExecutions: nodeExecutionList,
      error: errorMsg,
      startedAt,
      endedAt,
    };
  }
}
