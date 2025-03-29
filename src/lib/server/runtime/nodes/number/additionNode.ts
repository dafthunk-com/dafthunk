import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../types";
import { NumberNodeParameter } from "../types";
/**
 * Addition node implementation
 */
export class AdditionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "addition",
    name: "Addition",
    type: "addition",
    description: "Adds two numbers together",
    category: "Number",
    icon: "plus",
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
        result: new NumberNodeParameter(a + b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
