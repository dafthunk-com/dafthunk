import type { ParameterType } from "@dafthunk/types";

// Node Types
export type NodeExecutionState =
  | "idle"
  | "executing"
  | "completed"
  | "error"
  | "skipped";

// Define InputOutputType using ParameterType
export type InputOutputType = ParameterType["type"] | "any" | "unknown";

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
}

export interface WorkflowNodeType extends Record<string, unknown> {
  name: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
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
  category: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
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
  | "paused";

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
