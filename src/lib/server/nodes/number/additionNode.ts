import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberParameter } from "../types";
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
      { name: "a", type: NumberParameter, required: true },
      { name: "b", type: NumberParameter, required: true },
    ],
    outputs: [{ name: "result", type: NumberParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: new NumberParameter(a + b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
