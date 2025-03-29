// Types for workflows
import { Node, NodeContext, ExecutionResult } from "../types";
import { NodeParameter, NodeParameterConstructor } from "./nodeParameterTypes";

export interface Parameter {
  name: string;
  type: NodeParameterConstructor;
  description?: string;
  value?: NodeParameter;
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
/**
 * Base class for all executable nodes
 */

export abstract class ExecutableNode {
  public readonly node: Node;
  public static readonly nodeType: NodeType;

  constructor(node: Node) {
    this.node = node;
  }

  public abstract execute(context: NodeContext): Promise<ExecutionResult>;

  protected createSuccessResult(
    outputs: Record<string, NodeParameter>
  ): ExecutionResult {
    return {
      nodeId: this.node.id,
      success: true,
      outputs,
    };
  }

  protected createErrorResult(error: string): ExecutionResult {
    return {
      nodeId: this.node.id,
      success: false,
      error,
    };
  }
}
