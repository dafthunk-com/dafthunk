import type {
  JsonArray,
  JsonObject,
  NodeType,
  ObjectReference,
  Workflow,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

/**
 * Runtime value types - JSON-serializable values used during workflow execution.
 * These represent the "wire format" that flows between nodes and gets persisted.
 *
 * - Primitives: string, number, boolean
 * - ObjectReference: pointer to binary data in R2 (images, documents, etc.)
 * - JsonArray/JsonObject: structured data
 */
export type RuntimeValue =
  | string
  | number
  | boolean
  | ObjectReference
  | JsonArray
  | JsonObject;

/**
 * Runtime values for a single node.
 * Maps parameter names to their values (single or array for repeated parameters).
 *
 * Example:
 * {
 *   "prompt": "Hello world",
 *   "temperature": 0.7,
 *   "images": [{ id: "...", mimeType: "image/png" }, { id: "...", mimeType: "image/jpeg" }]
 * }
 */
export type NodeRuntimeValues = Record<string, RuntimeValue | RuntimeValue[]>;

/**
 * Runtime state for entire workflow execution.
 * Maps node IDs to their runtime values.
 *
 * Example:
 * Map {
 *   "node-1" => { "text": "output from node 1" },
 *   "node-2" => { "result": 42, "status": "completed" }
 * }
 */
export type WorkflowRuntimeState = Record<string, NodeRuntimeValues>;

/**
 * A group of node IDs that can be executed in parallel.
 * Nodes within the same level have no dependencies on each other.
 */
export interface ExecutionLevel {
  readonly nodeIds: readonly string[];
}

/**
 * Immutable execution context.
 * Contains workflow definition and execution levels that never change during execution.
 * Created once at initialization, passed by reference throughout execution.
 */
export interface WorkflowExecutionContext {
  /** The workflow definition being executed (immutable) */
  readonly workflow: Workflow;
  /** Execution levels - nodes grouped by dependency level for parallel execution */
  readonly executionLevels: readonly ExecutionLevel[];
  /** Flattened list of all node IDs (derived from executionLevels, for convenience) */
  readonly orderedNodeIds: readonly string[];
  /** Workflow ID for reference */
  readonly workflowId: string;
  /** Organization ID for scoping */
  readonly organizationId: string;
  /** Execution instance ID */
  readonly executionId: string;
  /** Deployment ID if executing a deployed version */
  readonly deploymentId?: string;
}

/**
 * Mutable execution state.
 * Tracks node outputs, execution status, and errors.
 * Updated throughout execution using immutable updates.
 *
 * Note: Status is computed on-demand using getExecutionStatus() utility.
 * This eliminates the possibility of inconsistent state between status
 * and the underlying execution tracking (executedNodes, skippedNodes, nodeErrors).
 */
export interface ExecutionState {
  /** Outputs from executed nodes */
  nodeOutputs: WorkflowRuntimeState;
  /** Array of successfully executed node IDs */
  executedNodes: string[];
  /** Array of skipped node IDs (due to missing inputs or upstream failures) */
  skippedNodes: string[];
  /** Record of node IDs to error messages */
  nodeErrors: Record<string, string>;
  /** Record of node IDs to their actual usage */
  nodeUsage: Record<string, number>;
}

/**
 * Result of executing a single node.
 * Immutable description of what happened - no state mutation required.
 * Used to decouple node execution from state management.
 */
export type NodeExecutionResult =
  | {
      nodeId: string;
      status: "completed";
      outputs: NodeRuntimeValues;
      usage: number;
    }
  | {
      nodeId: string;
      status: "skipped";
      /** Skipped nodes don't produce outputs */
      outputs: null;
      /** Skipped nodes consume no usage */
      usage: 0;
      /** Reason for skipping (included for Workflows introspection API) */
      skipReason?: "upstream_failure" | "conditional_branch";
      /** Node IDs that caused this node to be skipped */
      blockedBy?: string[];
    }
  | {
      nodeId: string;
      status: "error";
      error: string;
      /** Usage consumed before the error (e.g., API call made but parsing failed) */
      usage?: number;
    };

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
 * Skip reasons for nodes that were not executed.
 * - "upstream_failure": Node skipped because an upstream node errored or was skipped due to failure
 * - "conditional_branch": Node skipped because it's on an inactive conditional branch (expected)
 */
export type SkipReason = "upstream_failure" | "conditional_branch";

/**
 * Result of inferring why a node was skipped.
 * Includes both the classification and the specific nodes that caused the skip.
 */
export interface SkipReasonResult {
  /** Why the node was skipped */
  readonly reason: SkipReason;
  /** Node IDs that directly caused this node to be skipped */
  readonly blockedBy: readonly string[];
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
        continue;
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
 * Integration data structure available at runtime.
 * Contains decrypted tokens and metadata for OAuth integrations.
 * All fields are JSON-serializable for Cloudflare Workflows compatibility.
 */
export interface IntegrationData {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly token: string;
  readonly refreshToken?: string;
  readonly tokenExpiresAt?: string; // ISO 8601 timestamp string for serialization
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Type guard to check if a value is a valid RuntimeValue.
 * Ensures type-safe handling of runtime values throughout execution.
 */
export function isRuntimeValue(value: unknown): value is RuntimeValue {
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
    // ObjectReference check
    if ("id" in (value as object) && "mimeType" in (value as object)) {
      return true;
    }

    // JsonArray or JsonObject
    return true;
  }

  return false;
}

/**
 * Interface for executable node classes with static nodeType property.
 * Used to access node type metadata from executable node instances.
 */
export interface ExecutableNodeConstructor {
  readonly nodeType: NodeType;
  new (...args: unknown[]): unknown;
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

/**
 * Error types for workflow runtime execution.
 * Categorizes errors by their handling strategy.
 */

/**
 * Base class for all workflow-related errors
 */
export abstract class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly nodeId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Workflow validation errors - stop execution immediately
 * These are non-retryable and indicate the workflow structure is invalid.
 */
export class WorkflowValidationError extends WorkflowError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Cyclic graph error - workflow contains a cycle
 */
export class CyclicGraphError extends WorkflowError {
  constructor(
    message: string = "Unable to derive execution order. The graph may contain a cycle."
  ) {
    super(message);
  }
}

/**
 * Node execution errors - continue execution
 * These errors are recoverable at the workflow level - other nodes can still execute.
 */
export class NodeExecutionError extends WorkflowError {
  constructor(
    nodeId: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message, nodeId);
  }
}

/**
 * Node not found in workflow
 */
export class NodeNotFoundError extends NodeExecutionError {
  constructor(nodeId: string) {
    super(nodeId, `Node not found: ${nodeId}`);
  }
}

/**
 * Node type not implemented in registry
 */
export class NodeTypeNotImplementedError extends NodeExecutionError {
  constructor(nodeId: string, nodeType: string) {
    super(nodeId, `Node type not implemented: ${nodeType}`);
  }
}

/**
 * System errors - stop execution
 * These indicate infrastructure or resource issues.
 */
export class SystemError extends WorkflowError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Insufficient compute credits to run workflow
 */
export class InsufficientCreditsError extends SystemError {
  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Insufficient compute credits. Required: ${required}, Available: ${available}`
    );
  }
}

/**
 * Subscription required to execute a subscription-only node
 */
export class SubscriptionRequiredError extends SystemError {
  constructor(
    public readonly nodeId: string,
    public readonly nodeType: string
  ) {
    super(
      `Subscription required to execute node "${nodeType}". Upgrade your plan to use this feature.`
    );
  }
}
