import { JSONPath } from "jsonpath-plus";
import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";

export class JsonBooleanExtractorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "jsonBooleanExtractor",
    name: "JSON Boolean Extractor",
    type: "jsonBooleanExtractor",
    description: "Extract a boolean value from a JSON object using JSONPath",
    category: "JSON",
    icon: "toggle",
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to extract the boolean from",
      },
      {
        name: "path",
        type: "string",
        description:
          'The JSONPath expression (e.g., "$.user.profile.isActive" or "$.settings.enabled")',
      },
      {
        name: "defaultValue",
        type: "boolean",
        description: "Default value if no boolean value is found at the path",
        value: false,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "boolean",
        description: "The extracted boolean value",
      },
      {
        name: "found",
        type: "boolean",
        description: "Whether a boolean value was found at the specified path",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path, defaultValue = false } = context.inputs;

      if (!json || typeof json !== "object") {
        return this.createErrorResult("Invalid or missing JSON input");
      }

      if (!path || typeof path !== "string") {
        return this.createErrorResult("Invalid or missing JSONPath expression");
      }

      try {
        const results = JSONPath({ path, json });

        // Get the first result that is a boolean
        const booleanValue = results.find(
          (value: any) => typeof value === "boolean"
        );
        const found = typeof booleanValue === "boolean";

        return this.createSuccessResult({
          value: found ? booleanValue : defaultValue,
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
        `Error extracting boolean: ${error.message}`
      );
    }
  }
}
