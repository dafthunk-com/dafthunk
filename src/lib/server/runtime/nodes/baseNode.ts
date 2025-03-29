import { Node, NodeContext, ExecutionResult } from "../types";
import { NodeType } from "./nodeTypes";
import { NodeParameter } from "./nodeParameterTypes";

/**
 * Base class for all executable nodes
 */
export abstract class BaseExecutableNode {
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
