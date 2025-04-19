// Types for workflows
import { Node, NodeType, ExecutionResult } from "../api/types";

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
      value?: {
        data: Uint8Array;
        mimeType: string;
      };
    };

export type ParameterValue = ParameterType["value"];

export type Parameter = {
  name: string;
  description?: string;
  hidden?: boolean;
  required?: boolean;
} & ParameterType;

export interface NodeContext {
  nodeId: string;
  workflowId: string;
  inputs: Record<string, any>;
  onProgress?: (progress: number) => void;
  env: {
    AI: Ai;
  };
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
    outputs: Record<string, ParameterValue>
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
