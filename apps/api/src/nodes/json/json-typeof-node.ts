import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonTypeofNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-typeof",
    name: "JSON Typeof",
    type: "json-typeof",
    description:
      "Get the type of a JSON value (object, array, string, number, boolean, null)",
    tags: ["JSON"],
    icon: "type",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "json",
        description: "The JSON value to determine the type of",
        required: true,
      },
    ],
    outputs: [
      {
        name: "type",
        type: "string",
        description:
          "The type of the JSON value (object, array, string, number, boolean, null, undefined)",
      },
    ],
  };

  private getJsonType(value: any): string {
    if (value === null) {
      return "null";
    }

    if (Array.isArray(value)) {
      return "array";
    }

    if (typeof value === "function") {
      return "object";
    }

    if (typeof value === "object") {
      return "object";
    }

    if (typeof value === "string") {
      return "string";
    }

    if (typeof value === "number") {
      return "number";
    }

    if (typeof value === "boolean") {
      return "boolean";
    }

    // Fallback for undefined or other types
    return "undefined";
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      // Handle undefined input
      if (value === undefined) {
        return this.createSuccessResult({
          type: "undefined",
        });
      }

      const type = this.getJsonType(value);

      return this.createSuccessResult({
        type,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error determining JSON type: ${error.message}`
      );
    }
  }
}
