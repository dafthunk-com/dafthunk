import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonObjectValuesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-object-values",
    name: "JSON Object Values",
    type: "json-object-values",
    description: "Extract all values from a JSON object",
    tags: ["JSON"],
    icon: "list",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "object",
        type: "json",
        description: "The JSON object to extract values from",
        required: true,
      },
    ],
    outputs: [
      {
        name: "values",
        type: "json",
        description: "Array of values from the JSON object",
      },
      {
        name: "count",
        type: "number",
        description: "Number of values in the object",
        hidden: true,
      },
      {
        name: "isObject",
        type: "boolean",
        description: "Whether the input was a valid object",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { object } = context.inputs;

      // Handle null or undefined input
      if (object === null || object === undefined) {
        return this.createSuccessResult({
          values: [],
          count: 0,
          isObject: false,
        });
      }

      // Check if input is an object (but not an array)
      if (typeof object !== "object" || Array.isArray(object)) {
        return this.createSuccessResult({
          values: [],
          count: 0,
          isObject: false,
        });
      }

      // Extract all values from the object
      const values = Object.values(object);

      return this.createSuccessResult({
        values,
        count: values.length,
        isObject: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting object values: ${error.message}`
      );
    }
  }
}
