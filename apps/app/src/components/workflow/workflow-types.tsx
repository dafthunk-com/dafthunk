import type { NodeType, ParameterType } from "@dafthunk/types";

// Re-export NodeType for convenience
export type { NodeType };

// Node Types
export type NodeExecutionState =
  | "idle"
  | "executing"
  | "completed"
  | "error"
  | "skipped";

// Define InputOutputType using ParameterType
export type InputOutputType = ParameterType["type"];

// Parameter Types
export interface WorkflowParameter {
  id: string;
  type: InputOutputType;
  name: string;
  description?: string;
  value?: unknown;
  hidden?: boolean;
  required?: boolean;
  repeated?: boolean;
}

export interface WorkflowNodeType extends Record<string, unknown> {
  name: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
  functionCalling?: boolean;
  asTool?: boolean;
  icon?: string;
}

// Edge Types
export interface WorkflowEdgeType extends Record<string, unknown> {
  isValid?: boolean;
  isActive?: boolean;
  sourceType?: string;
  targetType?: string;
}

// Canvas Types
export type ConnectionValidationState = "default" | "valid" | "invalid";

// Component Props Types
export type WorkflowExecutionStatus =
  | "idle"
  | "submitted"
  | "executing"
  | "completed"
  | "error"
  | "cancelled"
  | "paused"
  | "exhausted";

// Update payload for node execution state changes
export interface NodeExecutionUpdate {
  state?: NodeExecutionState;
  outputs?: Record<string, unknown>;
  error?: string;
}

// Simplified local execution type to use in the workflow builder
export interface WorkflowNodeExecution {
  nodeId: string;
  status: NodeExecutionState;
  outputs?: Record<string, unknown> | null;
  error?: string;
}

export interface WorkflowExecution {
  id?: string;
  status: WorkflowExecutionStatus;
  nodeExecutions: WorkflowNodeExecution[];
  error?: string;
}

// Dialog Form Parameter Type
export interface DialogFormParameter {
  nodeId: string;
  nameForForm: string;
  label: string;
  nodeName: string;
  isRequired: boolean;
  type: string;
}
