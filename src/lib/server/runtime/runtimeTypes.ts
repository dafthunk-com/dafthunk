// Types for workflows
import { BaseExecutableNode } from "./nodes/baseNode";
import {
  RuntimeParameter,
  RuntimeParameterConstructor,
} from "./runtimeParameterTypes";
import { NodeType as NodeTypeDefinition } from "./nodes/nodeTypes";
import { NodeParameter } from "./nodes/nodeParameterTypes";
import { RuntimeParameterRegistry } from "./runtimeParameterTypeRegistry";

export interface Position {
  x: number;
  y: number;
}

export interface Parameter {
  name: string;
  type: RuntimeParameterConstructor;
  description?: string;
  value?: RuntimeParameter;
  hidden?: boolean;
  required?: boolean;
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
  outputs?: Record<string, NodeParameter>;
}

export interface NodeContext {
  nodeId: string;
  workflowId: string;
  inputs: Record<string, any>;
  onProgress?: (progress: number) => void;
  env?: {
    AI?: {
      run: (model: string, options: any) => any;
    };
    [key: string]: any;
  };
}

// This interface represents concrete (non-abstract) node implementations
export interface NodeImplementationConstructor {
  new (node: Node): BaseExecutableNode;
  readonly nodeType: NodeTypeDefinition;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();
  private parameterRegistry: RuntimeParameterRegistry =
    RuntimeParameterRegistry.getInstance();

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  public registerImplementation(
    Implementation: NodeImplementationConstructor
  ): void {
    if (!Implementation?.nodeType?.type) {
      throw new Error("NodeType is not defined");
    }
    this.implementations.set(Implementation.nodeType.type, Implementation);
  }

  public createExecutableNode(node: Node): BaseExecutableNode | undefined {
    const Implementation = this.implementations.get(node.type);
    if (!Implementation) {
      return undefined;
    }
    return new Implementation(node);
  }

  public getRuntimeNodeTypes(): NodeType[] {
    return Array.from(this.implementations.values()).map((implementation) => {
      const inputs = implementation.nodeType.inputs.map((input) => {
        const Type = this.parameterRegistry.get(input.type);
        if (!Type) {
          throw new Error(`Unknown parameter type: ${input.type}`);
        }
        const value = input.value ? new Type(input.value) : undefined;
        return {
          ...input,
          type: Type,
          value,
        };
      });
      const outputs = implementation.nodeType.outputs.map((output) => {
        const Type = this.parameterRegistry.get(output.type);
        if (!Type) {
          throw new Error(`Unknown parameter type: ${output.type}`);
        }
        const value = output.value ? new Type(output.value) : undefined;
        return {
          ...output,
          type: Type,
          value,
        };
      });
      return {
        ...implementation.nodeType,
        inputs,
        outputs,
      };
    });
  }
}

export interface WorkflowExecutionOptions {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  abortSignal?: AbortSignal;
}
