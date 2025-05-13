// Types for workflows

/**
 * Reference to an object stored in the runtime store
 */
export interface ObjectReference {
  id: string;
  mimeType: string;
}

export type PrimitiveValue = string | number | boolean | null | undefined;
export type JsonValue = PrimitiveValue | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = Array<JsonValue>;

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
    };

export type ParameterValue = ParameterType["value"];

export type Parameter = {
  name: string;
  description?: string;
  hidden?: boolean;
  required?: boolean;
} & ParameterType;

export interface NodeType {
  id: string;
  name: string;
  type: string;
  description?: string;
  category: string;
  icon: string;
  inputs: Parameter[];
  outputs: Parameter[];
}

export interface Position {
  x: number;
  y: number;
}

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

export interface Edge {
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

export type NodeExecutionStatus = "idle" | "executing" | "completed" | "error";

export interface NodeExecution {
  nodeId: string;
  status: NodeExecutionStatus;
  error?: string;
  outputs?: Record<string, ParameterValue>;
}

export type WorkflowExecutionStatus =
  | "idle"
  | "executing"
  | "completed"
  | "error"
  | "cancelled"
  | "paused";

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

// API Key types

/**
 * Represents an API key record as stored in the database
 * Mirrors the ApiKey type from the database schema
 */
export interface ApiKey {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a newly created API key with its secret
 * The secret is only returned once when the key is created
 */
export interface ApiKeyWithSecret {
  apiKey: string;
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * Request to create a new API key
 */
export interface CreateApiKeyRequest {
  name: string;
}

/**
 * Response for listing API keys
 */
export interface ListApiKeysResponse {
  apiKeys: ApiKey[];
}

/**
 * Response when creating a new API key
 */
export interface CreateApiKeyResponse {
  apiKey: ApiKeyWithSecret;
}

/**
 * Response when deleting an API key
 */
export interface DeleteApiKeyResponse {
  success: boolean;
}
