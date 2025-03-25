import { JSONPath } from "jsonpath-plus";
import { BaseExecutableNode } from "../baseNode";
import {
  Node,
  NodeContext,
  ExecutionResult,
  NodeType,
} from "../../workflowTypes";

export class JsonNumberExtractorNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonNumberExtractor",
    name: "JSON Number Extractor",
    description: "Extract a numeric value from a JSON object using JSONPath",
    category: "Utility",
    id: "jsonNumberExtractor",
    icon: "hash",
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to extract the number from",
      },
      {
        name: "path",
        type: "string",
        description:
          'The JSONPath expression (e.g., "$.user.profile.age" or "$.product.price")',
      },
      {
        name: "defaultValue",
        type: "number",
        description: "Default value if no numeric value is found at the path",
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
      },
    ],
  };

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const json = context.inputs["json"];
      const path = context.inputs["path"];
      const defaultValue =
        typeof context.inputs["defaultValue"] === "number"
          ? context.inputs["defaultValue"]
          : 0;

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
          (value) => typeof value === "number" && !isNaN(value)
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
