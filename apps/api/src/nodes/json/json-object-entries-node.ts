import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonObjectEntriesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-object-entries",
    name: "JSON Object Entries",
    type: "json-object-entries",
    description: "Extract key-value pairs from a JSON object",
    tags: ["JSON"],
    icon: "list",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "object",
        type: "json",
        description: "The JSON object to extract key-value pairs from",
        required: true,
      },
    ],
    outputs: [
      {
        name: "entries",
        type: "json",
        description: "Array of [key, value] pairs from the JSON object",
      },
      {
        name: "count",
        type: "number",
        description: "Number of entries in the object",
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
          entries: [],
          count: 0,
          isObject: false,
        });
      }

      // Check if input is an object (but not an array)
      if (typeof object !== "object" || Array.isArray(object)) {
        return this.createSuccessResult({
          entries: [],
          count: 0,
          isObject: false,
        });
      }

      // Extract all key-value pairs from the object
      const entries = Object.entries(object);

      return this.createSuccessResult({
        entries,
        count: entries.length,
        isObject: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting object entries: ${error.message}`
      );
    }
  }
}
