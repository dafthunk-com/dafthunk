// Types for workflow nodes and graphs

export interface Position {
  x: number;
  y: number;
}

export interface Parameter {
  name: string;
  type: string;
  description?: string;
}

export interface NodeType {
  id: string;
  name: string;
  type: string;
  description: string;
  category: string;
  icon: string;
  inputs: Parameter[];
  outputs: Parameter[];
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

export type NodeExecutionState = 'idle' | 'executing' | 'completed' | 'error';

export interface Edge {
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

export interface Graph {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

export interface ValidationError {
  type: 'CYCLE_DETECTED' | 'TYPE_MISMATCH' | 'INVALID_CONNECTION' | 'DUPLICATE_CONNECTION';
  message: string;
  details: {
    nodeId?: string;
    connectionSource?: string;
    connectionTarget?: string;
  };
}

export interface ExecutionEvent {
  type: 'node-start' | 'node-complete' | 'node-error';
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