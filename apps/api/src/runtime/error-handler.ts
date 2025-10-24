import type { WorkflowExecutionStatus } from "@dafthunk/types";

import { NodeExecutionError, WorkflowValidationError } from "./types";
import type { ExecutionState, WorkflowExecutionContext } from "./types";
import { getExecutionStatus } from "./status-utils";

/**
 * Unified error handling for workflow runtime.
 * Provides single source of truth for error classification, recording, and status determination.
 */
export class ErrorHandler {
  constructor(private isDevelopment: boolean = false) {}

  /**
   * Records a node execution error.
   * Node errors are recoverable - execution can continue with other nodes.
   */
  recordNodeError(
    state: ExecutionState,
    nodeId: string,
    error: Error | string
  ): ExecutionState {
    const errorMessage = error instanceof Error ? error.message : String(error);
    state.nodeErrors.set(nodeId, errorMessage);
    return state;
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
   * Logs the final workflow status transition based on execution state.
   * Status is computed on-demand, this just logs the transition for debugging.
   */
  logStatusTransition(
    context: WorkflowExecutionContext,
    state: ExecutionState
  ): void {
    const status = getExecutionStatus(context, state);

    // Log transition in development mode
    if (this.isDevelopment) {
      if (status === "completed") {
        console.log("[State Transition] executing → completed");
      } else if (status === "error") {
        console.log("[State Transition] executing → error");
      }
    }
  }

  /**
   * Creates an error report for persistence and monitoring.
   * Returns a workflow-level error message if there are node failures.
   */
  createErrorReport(state: ExecutionState): string | undefined {
    if (state.nodeErrors.size === 0) {
      return undefined;
    }
    return "Workflow execution failed";
  }

  /**
   * Checks if a node should be skipped (already failed or skipped).
   */
  shouldSkipNode(state: ExecutionState, nodeId: string): boolean {
    return state.nodeErrors.has(nodeId) || state.skippedNodes.has(nodeId);
  }
}
