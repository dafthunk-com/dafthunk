import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class StringConcatNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "string-concat",
    name: "String Concat",
    type: "string-concat",
    description: "Concatenate multiple strings together",
    tags: ["Text", "Concat"],
    icon: "link",
    documentation:
      "This node concatenates multiple strings together into a single string, joining them in the order they are provided.",
    inlinable: true,
    dynamicInputs: {
      prefix: "input",
      type: "string",
      defaultCount: 2,
      minCount: 1,
    },
    inputs: [
      {
        name: "input_1",
        type: "string",
        description: "String to concatenate",
      },
      {
        name: "input_2",
        type: "string",
        description: "String to concatenate",
      },
    ],
    outputs: [
      {
        name: "result",
        type: "string",
        description: "The concatenated string",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const strings = this.collectDynamicInputs(context.inputs, "input");

      if (strings.length === 0) {
        return this.createErrorResult("No string inputs provided");
      }

      for (let i = 0; i < strings.length; i++) {
        if (typeof strings[i] !== "string") {
          return this.createErrorResult(
            `Invalid input at position ${i}: expected string, got ${typeof strings[i]}`
          );
        }
      }

      const result = (strings as string[]).join("");

      return this.createSuccessResult({ result });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error concatenating strings: ${error.message}`
      );
    }
  }
}
