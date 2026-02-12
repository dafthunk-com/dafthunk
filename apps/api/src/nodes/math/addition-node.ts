import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
/**
 * Addition node implementation
 */
export class AdditionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "addition",
    name: "Addition",
    type: "addition",
    description: "Adds two numbers together",
    tags: ["Math", "Addition"],
    icon: "plus",
    documentation: "This node adds two numbers together to produce their sum.",
    specification: "result = a + b",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "a",
        type: "number",
        description: "The first number to add",
        required: true,
      },
      {
        name: "b",
        type: "number",
        description: "The second number to add",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The sum of the two input numbers",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (context.inputs.a === undefined || context.inputs.a === null) {
        return this.createErrorResult("Input 'a' is required");
      }
      if (context.inputs.b === undefined || context.inputs.b === null) {
        return this.createErrorResult("Input 'b' is required");
      }

      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: a + b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
