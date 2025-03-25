import { JSONPath } from "jsonpath-plus";
import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

export class JsonBooleanExtractorNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonBooleanExtractor",
    name: "JSON Boolean Extractor",
    description: "Extract a boolean value from a JSON object using JSONPath",
    category: "Utility",
    id: "jsonBooleanExtractor",
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

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const json = context.inputs["json"];
      const path = context.inputs["path"];
      const defaultValue =
        typeof context.inputs["defaultValue"] === "boolean"
          ? context.inputs["defaultValue"]
          : false;

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
          (value) => typeof value === "boolean"
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
