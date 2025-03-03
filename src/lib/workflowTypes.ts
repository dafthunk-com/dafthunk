// Types for workflows

export interface Position {
  x: number;
  y: number;
}

export interface Parameter {
  name: string;
  type: string;
  description?: string;
  value?: any;
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
  outputs?: Record<string, any>;
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

export interface ExecutableNode extends Node {
  execute(context: NodeContext): Promise<ExecutionResult>;
}

export interface NodeImplementation {
  type: string;
  createExecutableNode(node: Node): ExecutableNode;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementation> = new Map();

  private constructor() {}

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  public registerImplementation(implementation: NodeImplementation): void {
    this.implementations.set(implementation.type, implementation);
  }

  public getImplementation(type: string): NodeImplementation | undefined {
    return this.implementations.get(type);
  }

  public createExecutableNode(node: Node): ExecutableNode | undefined {
    const implementation = this.getImplementation(node.type);
    if (!implementation) {
      return undefined;
    }
    return implementation.createExecutableNode(node);
  }
}

export interface WorkflowExecutionOptions {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
}
