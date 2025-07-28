import { NodeExecution, NodeType } from "@dafthunk/types";
import { JSONPath } from "jsonpath-plus";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonStringExtractorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-string-extractor",
    name: "JSON String Extractor",
    type: "json-string-extractor",
    description: "Extract a string value from a JSON object using JSONPath",
    tags: ["JSON"],
    icon: "text",
    inlinable: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to extract the string from",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description:
          'The JSONPath expression (e.g., "$.user.profile.name" or "$.store.books[0].title")',
        required: true,
      },
      {
        name: "defaultValue",
        type: "string",
        description: "Default value if no string value is found at the path",
        hidden: true,
        value: "",
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
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path, defaultValue = "" } = context.inputs;

      if (json === null) {
        return this.createSuccessResult({
          value: defaultValue,
          found: false,
        });
      }

      if (typeof json !== "object") {
        return this.createErrorResult("Invalid JSON input");
      }

      if (!path || typeof path !== "string") {
        return this.createErrorResult("Invalid or missing JSONPath expression");
      }

      try {
        const results = JSONPath({ path, json });

        // Get the first result that is a string
        const stringValue = results.find(
          (value: any) => typeof value === "string"
        );
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
