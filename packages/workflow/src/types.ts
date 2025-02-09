/**
 * Represents a parameter (input or output) of a task
 */
export interface Parameter {
  name: string;
  type: string;
}

/**
 * Represents a task node in the workflow graph
 */
export interface Node {
  id: string;
  name: string;
  type: string;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string | null;
  position: {
    x: number;
    y: number;
  };
}

/**
 * Represents a connection between two tasks in the workflow
 */
export interface Edge {
  source: string;      // Source task ID
  target: string;      // Target task ID
  sourceOutput: string; // Source output parameter name
  targetInput: string;  // Target input parameter name
}

/**
 * Represents the entire workflow graph
 */
export interface Graph {
  nodes: Node[];
  connections: Edge[];
}

/**
 * Validation error types
 */
export type ValidationErrorType = 
  | 'CYCLE_DETECTED'
  | 'TYPE_MISMATCH'
  | 'INVALID_CONNECTION'
  | 'DUPLICATE_CONNECTION';

/**
 * Represents a validation error in the workflow
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  details?: {
    nodeId?: string;
    connectionSource?: string;
    connectionTarget?: string;
  };
} 