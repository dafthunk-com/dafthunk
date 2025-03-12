import {
  Node,
  ExecutionResult,
  ParameterValue,
} from "../workflowModel";
import { ExecutableNode, NodeContext } from "@lib/workflowRuntime";

/**
 * Base class for all executable nodes
 */
export abstract class BaseExecutableNode implements ExecutableNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  position: { x: number; y: number };
  inputValues: ParameterValue[];
  outputValues: ParameterValue[];
  error?: string;

  constructor(node: Node) {
    this.id = node.id;
    this.name = node.name;
    this.type = node.type;
    this.description = node.description;
    this.position = node.position;
    this.inputValues = node.inputValues;
    this.outputValues = node.outputValues;
    this.error = node.error;
  }

  abstract execute(context: NodeContext): Promise<ExecutionResult>;

  protected createSuccessResult(outputs: Record<string, any>): ExecutionResult {
    return {
      nodeId: this.id,
      success: true,
      outputs,
    };
  }

  protected createErrorResult(error: string): ExecutionResult {
    return {
      nodeId: this.id,
      success: false,
      error,
    };
  }
}
