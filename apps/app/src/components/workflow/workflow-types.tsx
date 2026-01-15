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
  value?: any;
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

// Simplified local execution type to use in the workflow builder
export type WorkflowNodeExecution = {
  nodeId: string;
  status: NodeExecutionState;
  outputs?: Record<string, any> | null;
  error?: string;
};

export interface WorkflowExecution {
  id?: string;
  status: WorkflowExecutionStatus;
  nodeExecutions: WorkflowNodeExecution[];
  error?: string;
}

// Dialog Form Parameter Type
export type DialogFormParameter = {
  nodeId: string; // Unique ID of the node
  nameForForm: string; // The key to use in the form data object, e.g., 'customer_email'
  label: string; // User-friendly label for the form input, e.g., "Customer Email"
  nodeName: string; // Original name of the workflow node, for context
  isRequired: boolean; // Whether this parameter is required
  type: string; // Parameter type, e.g., 'form-data-string', 'form-data-number'
};
