/**
 * Pure functions for managing workflow execution state.
 * These operate on ExecutionState and WorkflowExecutionContext without side effects
 * (aside from the controlled mutation in applyNodeResult).
 */

import type { NodeType, WorkflowExecutionStatus } from "@dafthunk/types";

import type { ExecutionGraph } from "./execution-graph";
import type {
  ExecutableNodeConstructor,
  ExecutionState,
  NodeExecutionResult,
  SkipReasonResult,
  UpstreamAnalysis,
} from "./execution-types";

/**
 * Applies a node execution result to the execution state.
 * Single place where state is mutated after node execution.
 */
export function applyNodeResult(
  state: ExecutionState,
  result: NodeExecutionResult
): void {
  if (result.status !== "skipped" && result.inputs) {
    state.nodeInputs[result.nodeId] = result.inputs;
  }

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
    case "pending":
      // Pending nodes haven't produced outputs yet — inputs (applied above) are
      // all they contribute. The runtime resolves them via waitForNodeEvent and
      // applies the final result.
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
  graph: ExecutionGraph,
  state: ExecutionState
): WorkflowExecutionStatus {
  const { skippedNodes, nodeErrors } = state;

  // Membership is checked once per node, so index the arrays first rather than
  // scanning them per lookup — this runs on every progress update.
  const visited = new Set([...state.executedNodes, ...skippedNodes]);
  const allNodesVisited = graph.nodeIds.every(
    (nodeId) => visited.has(nodeId) || nodeId in nodeErrors
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
    const { reason } = inferSkipReason(graph, state, skippedNodeId);
    if (reason === "upstream_failure") {
      return "error";
    }
  }

  // All nodes completed or were conditionally skipped (expected behavior)
  return "completed";
}

/**
 * Analyzes a node's upstream edges to decide whether it can run, and if not,
 * why. This is the single analyzer behind both the scheduling decision ("skip
 * this node") and the reported classification ("because upstream failed").
 *
 * An edge is a *blocker* when it can never deliver a value: its source errored,
 * its source was skipped, or its source ran without populating the specific
 * output this edge reads (a conditional fork). A node is skipped only when
 * every inbound edge is blocked — one live edge is enough to execute.
 *
 * Blockers are classified by tracing skip chains recursively back to their root
 * cause, and failures win over conditionals so a genuine error is never
 * reported as expected branching.
 */
export function analyzeUpstream(
  graph: ExecutionGraph,
  state: ExecutionState,
  nodeId: string
): UpstreamAnalysis {
  const inboundEdges = graph.inboundEdges(nodeId);

  const failureBlockers: string[] = [];
  const conditionalBlockers: string[] = [];

  for (const edge of inboundEdges) {
    // Upstream errored directly
    if (edge.source in state.nodeErrors) {
      failureBlockers.push(edge.source);
      continue;
    }

    // Upstream was skipped - recursively determine why
    if (state.skippedNodes.includes(edge.source)) {
      const upstream = analyzeUpstream(graph, state, edge.source);
      if (upstream.reason === "upstream_failure") {
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

  const blockedCount = failureBlockers.length + conditionalBlockers.length;
  const shouldSkip =
    inboundEdges.length > 0 && blockedCount === inboundEdges.length;

  // Prioritize upstream failures over conditional branches. When no blocker is
  // identifiable we fall back to "upstream_failure" so an unexplained skip
  // surfaces as an error rather than being masked as expected branching.
  if (conditionalBlockers.length > 0 && failureBlockers.length === 0) {
    return {
      shouldSkip,
      reason: "conditional_branch",
      blockedBy: conditionalBlockers,
    };
  }

  return {
    shouldSkip,
    reason: "upstream_failure",
    blockedBy: failureBlockers,
  };
}

/**
 * Infers the reason an already-skipped node was skipped.
 * Thin projection of {@link analyzeUpstream} for reporting call sites.
 */
export function inferSkipReason(
  graph: ExecutionGraph,
  state: ExecutionState,
  nodeId: string
): SkipReasonResult {
  const { reason, blockedBy } = analyzeUpstream(graph, state, nodeId);
  return { reason, blockedBy };
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
