import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonObjectKeysNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-object-keys",
    name: "JSON Object Keys",
    type: "json-object-keys",
    description: "Extract all keys from a JSON object",
    tags: ["JSON"],
    icon: "key",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "object",
        type: "json",
        description: "The JSON object to extract keys from",
        required: true,
      },
    ],
    outputs: [
      {
        name: "keys",
        type: "json",
        description: "Array of keys from the JSON object",
      },
      {
        name: "count",
        type: "number",
        description: "Number of keys in the object",
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
          keys: [],
          count: 0,
          isObject: false,
        });
      }

      // Check if input is an object (but not an array)
      if (typeof object !== "object" || Array.isArray(object)) {
        return this.createSuccessResult({
          keys: [],
          count: 0,
          isObject: false,
        });
      }

      // Extract all keys from the object
      const keys = Object.keys(object);

      return this.createSuccessResult({
        keys,
        count: keys.length,
        isObject: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting object keys: ${error.message}`
      );
    }
  }
}
