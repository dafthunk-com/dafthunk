// Types for workflows

export interface Position {
  x: number;
  y: number;
}

export interface ParameterType {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
}

export interface NodeType {
  id: string;
  name: string;
  type: string;
  description: string;
  category: string;
  inputTypes: ParameterType[];
  outputTypes: ParameterType[];
}

export interface ParameterValue {
  name: string;
  type: string;
  value?: any;
}

export interface Node {
  id: string;
  name: string;
  type: string;
  description?: string;
  position: Position;
  inputValues: ParameterValue[];
  outputValues: ParameterValue[];
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

export interface ValidationError {
  type:
    | "CYCLE_DETECTED"
    | "TYPE_MISMATCH"
    | "INVALID_CONNECTION"
    | "DUPLICATE_CONNECTION";
  message: string;
  details: {
    nodeId?: string;
    connectionSource?: string;
    connectionTarget?: string;
  };
}

export type ExecutionState = "idle" | "executing" | "completed" | "error";

export interface ExecutionEvent {
  type: "node-start" | "node-complete" | "node-error";
  nodeId: string;
  timestamp: number;
  error?: string;
}

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  error?: string;
  outputs?: Record<string, any>;
}

