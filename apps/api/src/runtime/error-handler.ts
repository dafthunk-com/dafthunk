import type { WorkflowExecutionStatus } from "@dafthunk/types";

import type { ExecutedNodeSet } from "./runtime";
import type { RuntimeState } from "./runtime";
import {
  NodeExecutionError,
  WorkflowError,
  WorkflowValidationError,
} from "./error-types";

/**
 * Unified error handling for workflow runtime.
 * Provides single source of truth for error classification, recording, and status determination.
 */
export class ErrorHandler {
  /**
   * Records a node execution error.
   * Node errors are recoverable - execution can continue with other nodes.
   */
  recordNodeError(
    runtimeState: RuntimeState,
    nodeId: string,
    error: Error | string
  ): RuntimeState {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    runtimeState.nodeErrors.set(nodeId, errorMessage);
    return runtimeState;
  }

  /**
   * Determines if execution should continue based on current state.
   * Execution continues for node-level errors but stops for workflow-level errors.
   */
  shouldContinueExecution(error: Error): boolean {
    // Node execution errors are recoverable
    if (error instanceof NodeExecutionError) {
      return true;
    }

    // Workflow validation errors and system errors stop execution
    if (error instanceof WorkflowValidationError) {
      return false;
    }

    // Unknown errors stop execution by default (fail-safe)
    return false;
  }

  /**
   * Determines the final workflow status based on execution state.
   * This is the single source of truth for status calculation.
   */
  determineWorkflowStatus(runtimeState: RuntimeState): WorkflowExecutionStatus {
    const { executionPlan, executedNodes, skippedNodes, nodeErrors } =
      runtimeState;

    // Check if all nodes have been visited (executed, skipped, or errored)
    const allNodesVisited = this.areAllNodesVisited(
      executionPlan,
      executedNodes,
      skippedNodes,
      nodeErrors
    );

    if (!allNodesVisited) {
      return "executing";
    }

    // All nodes visited - determine success or failure
    return nodeErrors.size === 0 ? "completed" : "error";
  }

  /**
   * Checks if all nodes in the execution plan have been visited.
   */
  private areAllNodesVisited(
    executionPlan: RuntimeState["executionPlan"],
    executedNodes: ExecutedNodeSet,
    skippedNodes: ExecutedNodeSet,
    nodeErrors: RuntimeState["nodeErrors"]
  ): boolean {
    return executionPlan.every((unit) => {
      if (unit.type === "individual") {
        return (
          executedNodes.has(unit.nodeId) ||
          skippedNodes.has(unit.nodeId) ||
          nodeErrors.has(unit.nodeId)
        );
      }

      if (unit.type === "inline") {
        return unit.nodeIds.every(
          (id: string) =>
            executedNodes.has(id) ||
            skippedNodes.has(id) ||
            nodeErrors.has(id)
        );
      }

      return false;
    });
  }

  /**
   * Updates the runtime state status based on current execution state.
   */
  updateStatus(runtimeState: RuntimeState): RuntimeState {
    const status = this.determineWorkflowStatus(runtimeState);
    return { ...runtimeState, status };
  }

  /**
   * Creates an error report for persistence and monitoring.
   * Returns a workflow-level error message if there are node failures.
   */
  createErrorReport(runtimeState: RuntimeState): string | undefined {
    if (runtimeState.nodeErrors.size === 0) {
      return undefined;
    }
    return "Workflow execution failed";
  }

  /**
   * Checks if a node should be skipped (already failed or skipped).
   */
  shouldSkipNode(runtimeState: RuntimeState, nodeId: string): boolean {
    return (
      runtimeState.nodeErrors.has(nodeId) ||
      runtimeState.skippedNodes.has(nodeId)
    );
  }
}
