import { JSONPath } from "jsonpath-plus";
import { BaseExecutableNode } from "../baseNode";
import {
  Node,
  NodeContext,
  ExecutionResult,
  NodeType,
} from "../../workflowTypes";

export class JsonStringExtractorNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonStringExtractor",
    name: "JSON String Extractor",
    description: "Extract a string value from a JSON object using JSONPath",
    category: "Utility",
    id: "jsonStringExtractor",
    icon: "text",
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to extract the string from",
      },
      {
        name: "path",
        type: "string",
        description:
          'The JSONPath expression (e.g., "$.user.profile.name" or "$.store.books[0].title")',
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Default value if no string value is found at the path",
      },
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description: "The extracted string value",
      },
      {
        name: "found",
        type: "boolean",
        description: "Whether a string value was found at the specified path",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const json = context.inputs["json"];
      const path = context.inputs["path"];
      const defaultValue = context.inputs["defaultValue"] || "";

      // Handle empty or invalid JSON input
      if (!json) {
        return this.createSuccessResult({
          value: defaultValue,
          found: false,
        });
      }

      if (typeof json !== "object") {
        return this.createErrorResult("Invalid JSON input: must be an object");
      }

      if (!path || typeof path !== "string") {
        return this.createErrorResult("Invalid or missing JSONPath expression");
      }

      try {
        const results = JSONPath({ path, json });

        // If no results found, return default value
        if (!results || results.length === 0) {
          return this.createSuccessResult({
            value: defaultValue,
            found: false,
          });
        }

        // Get the first result that is a string
        const stringValue = results.find((value) => typeof value === "string");
        const found = typeof stringValue === "string";

        return this.createSuccessResult({
          value: found ? stringValue : defaultValue,
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
        `Error extracting string: ${error.message}`
      );
    }
  }
}
