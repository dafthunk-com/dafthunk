import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../runtimeTypes";
import { NodeType } from "../nodeTypes";
import { NumberNodeParameter } from "../nodeParameterTypes";

/**
 * Division node implementation
 */
export class DivisionNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "division",
    name: "Division",
    type: "division",
    description: "Divides one number by another",
    category: "Number",
    icon: "divide",
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

      if (b === 0) {
        return this.createErrorResult("Division by zero is not allowed");
      }

      return this.createSuccessResult({
        result: new NumberNodeParameter(a / b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
