import { NodeExecution, NodeType } from "@dafthunk/types";
import { JSONPath } from "jsonpath-plus";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonObjectArrayExtractorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-object-array-extractor",
    name: "JSON Object/Array Extractor",
    type: "json-object-array-extractor",
    description:
      "Extract a JSON object or array from a JSON object using JSONPath",
    tags: ["JSON"],
    icon: "braces",
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to extract from",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description:
          'The JSONPath expression (e.g., "$.user.profile" or "$.store.books[*]")',
        required: true,
      },
      {
        name: "defaultValue",
        type: "json",
        description:
          "Default value if no JSON object/array is found at the path",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "json",
        description: "The extracted JSON value (object or array)",
      },
      {
        name: "found",
        type: "boolean",
        description:
          "Whether a JSON object or array was found at the specified path",
        hidden: true,
      },
    ],
  };

  private isJsonValue(value: any): boolean {
    return value !== null && typeof value === "object";
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path, defaultValue = {} } = context.inputs;

      if (!json || typeof json !== "object") {
        return this.createErrorResult("Invalid or missing JSON input");
      }

      if (!path || typeof path !== "string") {
        return this.createErrorResult("Invalid or missing JSONPath expression");
      }

      try {
        const results = JSONPath({ path, json });

        // Get the first result that is a JSON object or array
        const jsonValue = results.find((value: any) => this.isJsonValue(value));
        const found = this.isJsonValue(jsonValue);

        return this.createSuccessResult({
          value: found ? jsonValue : defaultValue,
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
      return this.createErrorResult(`Error extracting JSON: ${error.message}`);
    }
  }
}
