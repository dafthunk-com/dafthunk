import type {
  JsonArray,
  JsonObject,
  NodeType,
  ObjectReference,
  QueueMessage,
  ScheduledTrigger,
  Workflow,
} from "@dafthunk/types";

import type { EmailMessage, HttpRequest } from "./node-types";

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
  /** Incoming HTTP request (for webhook-triggered workflows) */
  readonly httpRequest?: HttpRequest;
  /** Incoming email message (for email-triggered workflows) */
  readonly emailMessage?: EmailMessage;
  /** Incoming queue message (for queue-triggered workflows) */
  readonly queueMessage?: QueueMessage;
  /** Incoming scheduled trigger (for cron-triggered workflows) */
  readonly scheduledTrigger?: ScheduledTrigger;
  /** Session ID for real-time monitoring updates */
  readonly workflowSessionId?: string;
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
    }
  | {
      nodeId: string;
      status: "pending";
      /** Event type the runtime should wait for (e.g., "agent-complete:nodeId") */
      eventType: string;
      /** How long to wait before timing out (e.g., "30 minutes") */
      timeout: string;
    };

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
 * Interface for executable node classes with static nodeType property.
 * Used to access node type metadata from executable node instances.
 */
export interface ExecutableNodeConstructor {
  readonly nodeType: NodeType;
  new (...args: unknown[]): unknown;
}
