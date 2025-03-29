import { ExecutableNode } from "../nodeTypes";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import { NumberNodeParameter } from "../nodeTypes";

/**
 * Multiplication node implementation
 */
export class MultiplicationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multiplication",
    name: "Multiplication",
    type: "multiplication",
    description: "Multiplies two numbers",
    category: "Number",
    icon: "x",
    inputs: [
      { name: "a", type: NumberNodeParameter, required: true },
      { name: "b", type: NumberNodeParameter, required: true },
    ],
    outputs: [{ name: "result", type: NumberNodeParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: new NumberNodeParameter(a * b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
