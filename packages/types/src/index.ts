// Types for workflows

/**
 * Reference to an object stored in the runtime store
 */
export interface ObjectReference {
  id: string;
  type: string;
}

export type PrimitiveValue = string | number | boolean | null | undefined;
export type JsonValue = PrimitiveValue | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

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
  status: WorkflowExecutionStatus;
  error?: string;
  nodeExecutions: NodeExecution[];
} 