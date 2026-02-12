/**
 * Pure functions for managing workflow execution state.
 * These operate on ExecutionState and WorkflowExecutionContext without side effects
 * (aside from the controlled mutation in applyNodeResult).
 */

import type {
  NodeType,
  Workflow,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

import type {
  ExecutableNodeConstructor,
  ExecutionState,
  NodeExecutionResult,
  SkipReasonResult,
  WorkflowExecutionContext,
} from "./execution-types";

/**
 * Applies a node execution result to the execution state.
 * Single place where state is mutated after node execution.
 */
export function applyNodeResult(
  state: ExecutionState,
  result: NodeExecutionResult
): void {
  switch (result.status) {
    case "completed":
      state.nodeOutputs[result.nodeId] = result.outputs;
      state.executedNodes.push(result.nodeId);
      state.nodeUsage[result.nodeId] = result.usage;
      break;
    case "skipped":
      state.skippedNodes.push(result.nodeId);
      break;
    case "error":
      state.nodeErrors[result.nodeId] = result.error;
      if (result.usage !== undefined && result.usage > 0) {
        state.nodeUsage[result.nodeId] = result.usage;
      }
      break;
  }
}

/**
 * Computes the workflow execution status from the current state.
 * This is the single source of truth for status calculation.
 *
 * Status is derived from the execution state rather than stored,
 * eliminating the possibility of inconsistent state.
 *
 * Status determination logic:
 * - "executing": Not all nodes have been visited yet
 * - "completed": All nodes visited successfully (only conditional skips allowed)
 * - "error": Any nodes failed or were skipped due to upstream failures
 */
export function getExecutionStatus(
  context: WorkflowExecutionContext,
  state: ExecutionState
): WorkflowExecutionStatus {
  const { workflow, orderedNodeIds } = context;
  const { executedNodes, skippedNodes, nodeErrors } = state;

  // Check if all nodes have been visited (executed, skipped, or errored)
  const allNodesVisited = orderedNodeIds.every(
    (nodeId) =>
      executedNodes.includes(nodeId) ||
      skippedNodes.includes(nodeId) ||
      nodeId in nodeErrors
  );

  if (!allNodesVisited) {
    return "executing";
  }

  // Any node errors means the workflow failed
  if (Object.keys(nodeErrors).length > 0) {
    return "error";
  }

  // Check if any skipped nodes are due to upstream failures (not conditional branching)
  for (const skippedNodeId of skippedNodes) {
    const { reason } = inferSkipReason(workflow, state, skippedNodeId);
    if (reason === "upstream_failure") {
      return "error";
    }
  }

  // All nodes completed or were conditionally skipped (expected behavior)
  return "completed";
}

/**
 * Infers the reason a node was skipped, with full traceability.
 *
 * Uses recursion to trace skip chains back to their root cause:
 * - If an upstream node errored, or was skipped due to an upstream failure,
 *   this node is classified as "upstream_failure"
 * - If an upstream node executed but didn't populate the expected output
 *   (conditional branch), or was skipped due to a conditional branch,
 *   this node is classified as "conditional_branch"
 *
 * Every skipped node must have a determinable reason - if we can't find one,
 * we default to "upstream_failure" to be conservative (treat as error).
 */
export function inferSkipReason(
  workflow: Workflow,
  state: ExecutionState,
  nodeId: string
): SkipReasonResult {
  const inboundEdges = workflow.edges.filter((edge) => edge.target === nodeId);

  const failureBlockers: string[] = [];
  const conditionalBlockers: string[] = [];

  // Analyze each upstream edge
  for (const edge of inboundEdges) {
    // Upstream errored directly
    if (edge.source in state.nodeErrors) {
      failureBlockers.push(edge.source);
      continue;
    }

    // Upstream was skipped - recursively determine why
    if (state.skippedNodes.includes(edge.source)) {
      const upstreamResult = inferSkipReason(workflow, state, edge.source);
      if (upstreamResult.reason === "upstream_failure") {
        failureBlockers.push(edge.source);
      } else {
        conditionalBlockers.push(edge.source);
      }
      continue;
    }

    // Upstream executed but didn't populate this specific output (conditional fork)
    if (state.executedNodes.includes(edge.source)) {
      const sourceOutputs = state.nodeOutputs[edge.source];
      if (sourceOutputs && !(edge.sourceOutput in sourceOutputs)) {
        conditionalBlockers.push(edge.source);
      }
    }

    // This edge has available data - doesn't contribute to skip
  }

  // Prioritize upstream failures over conditional branches
  if (failureBlockers.length > 0) {
    return {
      reason: "upstream_failure",
      blockedBy: failureBlockers,
    };
  }

  if (conditionalBlockers.length > 0) {
    return {
      reason: "conditional_branch",
      blockedBy: conditionalBlockers,
    };
  }

  // If we reach here, we couldn't determine a specific reason.
  // This shouldn't happen in a well-formed workflow, but if it does,
  // treat it as a failure to be conservative (don't mask potential bugs).
  return {
    reason: "upstream_failure",
    blockedBy: [],
  };
}

/**
 * Type guard to check if a value is a valid RuntimeValue.
 * Ensures type-safe handling of runtime values throughout execution.
 */
export function isRuntimeValue(
  value: unknown
): value is import("./execution-types").RuntimeValue {
  if (value === null || value === undefined) {
    return false;
  }

  const valueType = typeof value;

  // Primitives
  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean"
  ) {
    return true;
  }

  // Objects (ObjectReference, JsonObject, JsonArray)
  if (valueType === "object") {
    // ObjectReference: has id + mimeType
    if ("id" in (value as object) && "mimeType" in (value as object)) {
      return true;
    }
    // JsonArray
    if (Array.isArray(value)) {
      return true;
    }
    // JsonObject: plain object (not a class instance like Date, Uint8Array, etc.)
    if (Object.getPrototypeOf(value) === Object.prototype) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Helper function to get NodeType from an executable node instance.
 * Provides type-safe access to static nodeType property.
 */
export function getNodeType(executable: unknown): NodeType | null {
  if (!executable || typeof executable !== "object") {
    return null;
  }

  const constr = executable.constructor as
    | ExecutableNodeConstructor
    | undefined;
  return constr?.nodeType ?? null;
}
