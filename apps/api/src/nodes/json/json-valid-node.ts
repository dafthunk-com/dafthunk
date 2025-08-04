import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonValidNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-valid",
    name: "JSON Valid",
    type: "json-valid",
    description: "Validate if a value is valid JSON",
    tags: ["JSON"],
    icon: "check-circle",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "string",
        description: "The string value to validate as JSON",
        required: true,
      },
    ],
    outputs: [
      {
        name: "isValid",
        type: "boolean",
        description: "Whether the value is valid JSON",
      },
      {
        name: "parsedValue",
        type: "json",
        description: "The parsed JSON value if valid, null otherwise",
        hidden: true,
      },
      {
        name: "error",
        type: "string",
        description: "Error message if JSON is invalid",
        hidden: true,
      },
    ],
  };

  private isValidJson(value: string): {
    isValid: boolean;
    parsedValue: any;
    error: string | null;
  } {
    if (typeof value !== "string") {
      return {
        isValid: false,
        parsedValue: null,
        error: "Input must be a string",
      };
    }

    if (value.trim() === "") {
      return {
        isValid: false,
        parsedValue: null,
        error: "Empty string is not valid JSON",
      };
    }

    try {
      const parsed = JSON.parse(value);
      return {
        isValid: true,
        parsedValue: parsed,
        error: null,
      };
    } catch (err) {
      const error = err as Error;
      return {
        isValid: false,
        parsedValue: null,
        error: error.message,
      };
    }
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      if (value === null || value === undefined) {
        return this.createSuccessResult({
          isValid: false,
          parsedValue: null,
          error: "Input value is required",
        });
      }

      const result = this.isValidJson(value);

      return this.createSuccessResult({
        isValid: result.isValid,
        parsedValue: result.parsedValue,
        error: result.error,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error validating JSON: ${error.message}`);
    }
  }
}
