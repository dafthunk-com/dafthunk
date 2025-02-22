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
  type: string;
  position: { x: number; y: number };
  data: {
    name?: string;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    [key: string]: any;
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
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
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

/**
 * Execution event types
 */
export type ExecutionEventType = 
  | 'node-start'
  | 'node-complete'
  | 'node-error'
  | 'execution-complete';

/**
 * Base interface for all execution events
 */
export interface BaseExecutionEvent {
  type: ExecutionEventType;
  timestamp: string;
}

/**
 * Node start event
 */
export interface NodeStartEvent extends BaseExecutionEvent {
  type: 'node-start';
  nodeId: string;
}

/**
 * Node complete event
 */
export interface NodeCompleteEvent extends BaseExecutionEvent {
  type: 'node-complete';
  nodeId: string;
}

/**
 * Node error event
 */
export interface NodeErrorEvent extends BaseExecutionEvent {
  type: 'node-error';
  nodeId: string;
  error: string;
}

/**
 * Execution complete event
 */
export interface ExecutionCompleteEvent extends BaseExecutionEvent {
  type: 'execution-complete';
}

/**
 * Union type of all execution events
 */
export type ExecutionEvent = 
  | NodeStartEvent 
  | NodeCompleteEvent 
  | NodeErrorEvent 
  | ExecutionCompleteEvent; 