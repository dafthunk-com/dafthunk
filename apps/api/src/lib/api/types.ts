// Types for workflows
import {ObjectReference} from "../runtime/store";

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
      value?: Array<any>;
    }
  | {
      type: "json";
      value?: Record<string, any>;
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

export interface NodeExecution {
  nodeId: string;
  success: boolean;
  error?: string;
  outputs?: Record<string, ParameterValue>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  success: boolean;
  error?: string;
  nodeExecutions: NodeExecution[];
}
