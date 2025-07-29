import type { ParameterType } from "@dafthunk/types";

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
  value?: any;
  isConnected?: boolean;
  hidden?: boolean;
  required?: boolean;
  repeated?: boolean; // Flag for parameters that can accept multiple connections
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
}

// Edge Types
export interface WorkflowEdgeType extends Record<string, unknown> {
  isValid?: boolean;
  isActive?: boolean;
  sourceType?: string;
  targetType?: string;
}

// Node Template Types
export interface NodeTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  tags: string[];
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  functionCalling?: boolean;
  asTool?: boolean;
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

// Simplified local execution type to use in the workflow builder
export type WorkflowNodeExecution = {
  nodeId: string;
  status: NodeExecutionState;
  outputs?: Record<string, any>;
  error?: string;
};

export interface WorkflowExecution {
  status: WorkflowExecutionStatus;
  nodeExecutions: WorkflowNodeExecution[];
  error?: string;
}
