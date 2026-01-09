import { NodeExecution, NodeType } from "@dafthunk/types";
import { JSONPath } from "jsonpath-plus";
import { ExecutableNode, NodeContext } from "../types";

export class JsonExtractNumberNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-extract-number",
    name: "JSON Extract Number",
    type: "json-extract-number",
    description: "Extract a numeric value from a JSON object using JSONPath",
    tags: ["Data", "JSON", "Extract", "Number"],
    icon: "hash",
    documentation:
      "This node extracts a numeric value from a JSON object using JSONPath.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to extract the number from",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description:
          'The JSONPath expression (e.g., "$.user.profile.age" or "$.product.price")',
        required: true,
      },
      {
        name: "defaultValue",
        type: "number",
        description: "Default value if no numeric value is found at the path",
        hidden: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "number",
        description: "The extracted numeric value",
      },
      {
        name: "found",
        type: "boolean",
        description: "Whether a numeric value was found at the specified path",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path, defaultValue = 0 } = context.inputs;

      if (!json || typeof json !== "object") {
        return this.createErrorResult("Invalid or missing JSON input");
      }

      if (!path || typeof path !== "string") {
        return this.createErrorResult("Invalid or missing JSONPath expression");
      }

      try {
        const results = JSONPath({ path, json });

        // Get the first result that is a number (including integers and floats)
        const numberValue = results.find(
          (value: any) => typeof value === "number" && !isNaN(value)
        );
        const found = typeof numberValue === "number" && !isNaN(numberValue);

        return this.createSuccessResult({
          value: found ? numberValue : defaultValue,
          found: found,
        });
      } catch (err) {
        const error = err as Error;
        return this.createErrorResult(
          `Invalid JSONPath expression: ${error.message}`
        );
      }
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting number: ${error.message}`
      );
    }
  }
}
