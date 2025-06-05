/**
 * Represents an object reference with ID and MIME type
 */
export interface ObjectReference {
  id: string;
  mimeType: string;
}

/**
 * Workflow trigger types
 */
export type WorkflowType = "manual" | "http_request" | "email_message" | "cron";

/**
 * Primitive value types
 */
export type PrimitiveValue = string | number | boolean | null | undefined;

/**
 * JSON value types
 */
export type JsonValue = PrimitiveValue | JsonObject | JsonArray;

/**
 * JSON object type
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * JSON array type
 */
export type JsonArray = Array<JsonValue>;

/**
 * Parameter type definitions for workflow nodes
 */
export type ParameterType =
  | {
      type: "string";
      value?: string;
    }
  | {
      type: "number";
      value?: number;
    }
  | {
      type: "boolean";
      value?: boolean;
    }
  | {
      type: "image";
      value?: ObjectReference;
    }
  | {
      type: "array";
      value?: JsonArray;
    }
  | {
      type: "json";
      value?: JsonObject;
    }
  | {
      type: "document";
      value?: ObjectReference;
    }
  | {
      type: "audio";
      value?: ObjectReference;
    }
  | {
      type: "any";
      value?: any;
    };

/**
 * Parameter value type
 */
export type ParameterValue = ParameterType["value"];

/**
 * Represents a parameter with metadata and type information
 */
export type Parameter = {
  name: string;
  description?: string;
  hidden?: boolean;
  required?: boolean;
} & ParameterType;

/**
 * Represents a node type definition
 */
export interface NodeType {
  id: string;
  name: string;
  type: string;
  description?: string;
  category: string;
  icon: string;
  inputs: Parameter[];
  outputs: Parameter[];
  compatibility?: WorkflowType[]; // Optional array of workflow types this node is compatible with
}

/**
 * Represents a position in the workflow canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Represents a node in a workflow
 */
export interface Node {
  id: string;
  name: string;
  type: string;
  description?: string;
  position: Position;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string;
}

/**
 * Represents an edge connecting two nodes in a workflow
 */
export interface Edge {
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

/**
 * Represents a workflow as stored in the database
 */
export interface Workflow {
  id: string;
  name: string;
  handle: string;
  type: WorkflowType;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Represents a workflow with additional metadata
 */
export interface WorkflowWithMetadata extends Workflow {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Possible node execution statuses
 */
export type NodeExecutionStatus = "idle" | "executing" | "completed" | "error";

/**
 * Represents the execution state of a single node
 */
export interface NodeExecution {
  nodeId: string;
  status: NodeExecutionStatus;
  error?: string;
  outputs?: Record<string, ParameterValue>;
}

/**
 * Possible workflow execution statuses
 */
export type WorkflowExecutionStatus =
  | "idle"
  | "submitted"
  | "executing"
  | "completed"
  | "error"
  | "cancelled"
  | "paused";

/**
 * Represents a workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  deploymentId?: string;
  status: WorkflowExecutionStatus;
  error?: string;
  nodeExecutions: NodeExecution[];
  visibility: "public" | "private";
  /** Timestamp when execution actually started */
  startedAt?: Date;
  /** Timestamp when execution ended */
  endedAt?: Date;
}
/**
 * Represents a group of deployments for a workflow
 * Used for listing deployments grouped by workflow
 */
export interface WorkflowDeployment {
  workflowId: string;
  workflowName: string;
  latestDeploymentId: string;
  latestVersion: number;
  deploymentCount: number;
  latestCreatedAt: string | Date;
}

/**
 * Represents a specific deployment version of a workflow
 * Used for deployment details and execution
 */
export interface WorkflowDeploymentVersion {
  id: string;
  workflowId: string;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  nodes: Node[];
  edges: Edge[];
}

// Request and Response types

/**
 * Request to create a new workflow
 */
export interface CreateWorkflowRequest {
  name: string;
  type: WorkflowType;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Response when creating a new workflow
 */
export type CreateWorkflowResponse = WorkflowWithMetadata;

/**
 * Response for listing workflows
 */
export interface ListWorkflowsResponse {
  workflows: WorkflowWithMetadata[];
}

/**
 * Response when getting a workflow by ID
 */
export type GetWorkflowResponse = WorkflowWithMetadata;

/**
 * Request to update a workflow
 */
export interface UpdateWorkflowRequest {
  name: string;
  type: WorkflowType;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Response when updating a workflow
 */
export type UpdateWorkflowResponse = WorkflowWithMetadata;

/**
 * Response when deleting a workflow
 */
export interface DeleteWorkflowResponse {
  id: string;
}

/**
 * Request to execute a workflow
 */
export interface ExecuteWorkflowRequest {
  monitorProgress?: boolean;
  parameters?: Record<string, any>;
}

/**
 * Response when executing a workflow
 */
export interface ExecuteWorkflowResponse {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  nodeExecutions: NodeExecution[];
}

/**
 * Response when cancelling a workflow execution
 */
export interface CancelWorkflowExecutionResponse {
  id: string;
  status: "cancelled";
  message: string;
}

/**
 * Represents the core data for a cron trigger.
 */
export interface CronTrigger {
  workflowId: string;
  cronExpression: string;
  active: boolean;
}

/**
 * Request to create or update a cron trigger.
 */
export interface UpsertCronTriggerRequest {
  cronExpression: string;
  active?: boolean;
}

/**
 * Response when getting a cron trigger.
 * Includes the full trigger information including database-generated fields.
 */
export interface GetCronTriggerResponse {
  workflowId: string;
  cronExpression: string;
  active: boolean;
  nextRunAt: string | Date | null; // from DB
  createdAt: string | Date; // from DB
  updatedAt: string | Date; // from DB
}

/**
 * Response when creating or updating a cron trigger.
 * Returns the full trigger information.
 */
export type UpsertCronTriggerResponse = GetCronTriggerResponse;
