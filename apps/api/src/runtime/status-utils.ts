import type { WorkflowExecutionStatus } from "@dafthunk/types";

import type { ExecutionState, WorkflowExecutionContext } from "./types";

/**
 * Computes the workflow execution status from the current state.
 * This is the single source of truth for status calculation.
 *
 * Status is derived from the execution state rather than stored,
 * eliminating the possibility of inconsistent state.
 *
 * Status determination logic:
 * - "executing": Not all nodes have been visited yet
 * - "completed": All nodes visited, no errors
 * - "error": All nodes visited, at least one error
 */
export function getExecutionStatus(
  context: WorkflowExecutionContext,
  state: ExecutionState
): WorkflowExecutionStatus {
  const { orderedNodeIds } = context;
  const { executedNodes, skippedNodes, nodeErrors } = state;

  // Check if all nodes have been visited (executed, skipped, or errored)
  const allNodesVisited = orderedNodeIds.every(
    (nodeId) =>
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
