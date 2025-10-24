import type { WorkflowExecutionStatus } from "@dafthunk/types";

import { NodeExecutionError, WorkflowValidationError } from "./types";
import type { ExecutionState, WorkflowExecutionContext } from "./types";
import { StateTransitions } from "./transitions";

/**
 * Unified error handling for workflow runtime.
 * Provides single source of truth for error classification, recording, and status determination.
 */
export class ErrorHandler {
  private transitions: StateTransitions;

  constructor(isDevelopment: boolean = false) {
    this.transitions = new StateTransitions(isDevelopment);
  }

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
   * Determines the final workflow status based on execution state.
   * This is the single source of truth for status calculation.
   *
   * Note: Returns status value but does not mutate state.
   * Use updateStatus() to apply transitions.
   */
  determineWorkflowStatus(
    context: WorkflowExecutionContext,
    state: ExecutionState
  ): WorkflowExecutionStatus {
    const { orderedNodeIds } = context;
    const { executedNodes, skippedNodes, nodeErrors } = state;

    // Check if all nodes have been visited (executed, skipped, or errored)
    const allNodesVisited = orderedNodeIds.every((nodeId) =>
      executedNodes.has(nodeId) ||
      skippedNodes.has(nodeId) ||
      nodeErrors.has(nodeId)
    );

    if (!allNodesVisited) {
      return "executing";
    }

    // All nodes visited - determine success or failure
    return nodeErrors.size === 0 ? "completed" : "error";
  }

  /**
   * Updates the runtime state status based on current execution state.
   * Uses state transitions to ensure proper logging and validation.
   */
  updateStatus(
    context: WorkflowExecutionContext,
    state: ExecutionState
  ): ExecutionState {
    const status = this.determineWorkflowStatus(context, state);

    // Use transitions to apply status change
    if (status === state.status) {
      return state; // No transition needed
    }

    return this.transitions.toStatus(state, status);
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
