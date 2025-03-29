import { JSONPath } from "jsonpath-plus";
import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { BooleanParameter, JsonParameter, StringParameter } from "../types";

export class JsonBooleanExtractorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonBooleanExtractor",
    name: "JSON Boolean Extractor",
    description: "Extract a boolean value from a JSON object using JSONPath",
    category: "JSON",
    id: "jsonBooleanExtractor",
    icon: "toggle",
    inputs: [
      {
        name: "json",
        type: JsonParameter,
        description: "The JSON object to extract the boolean from",
      },
      {
        name: "path",
        type: StringParameter,
        description:
          'The JSONPath expression (e.g., "$.user.profile.isActive" or "$.settings.enabled")',
      },
      {
        name: "defaultValue",
        type: BooleanParameter,
        description: "Default value if no boolean value is found at the path",
        value: new BooleanParameter(false),
      },
    ],
    outputs: [
      {
        name: "value",
        type: BooleanParameter,
        description: "The extracted boolean value",
      },
      {
        name: "found",
        type: BooleanParameter,
        description: "Whether a boolean value was found at the specified path",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<ExecutionResult> {
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
          (value) => typeof value === "boolean"
        );
        const found = typeof booleanValue === "boolean";

        return this.createSuccessResult({
          value: new BooleanParameter(found ? booleanValue : defaultValue),
          found: new BooleanParameter(found),
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
