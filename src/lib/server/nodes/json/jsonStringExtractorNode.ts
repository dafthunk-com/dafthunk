import { JSONPath } from "jsonpath-plus";
import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { StringValue, BooleanValue, JsonValue } from "../types";

export class JsonStringExtractorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonStringExtractor",
    name: "JSON String Extractor",
    description: "Extract a string value from a JSON object using JSONPath",
    category: "JSON",
    id: "jsonStringExtractor",
    icon: "text",
    inputs: [
      {
        name: "json",
        type: JsonValue,
        description: "The JSON object to extract the string from",
        required: true,
      },
      {
        name: "path",
        type: StringValue,
        description:
          'The JSONPath expression (e.g., "$.user.profile.name" or "$.store.books[0].title")',
        required: true,
      },
      {
        name: "defaultValue",
        type: StringValue,
        description: "Default value if no string value is found at the path",
        hidden: true,
        value: new StringValue(""),
      },
    ],
    outputs: [
      {
        name: "value",
        type: StringValue,
        description: "The extracted string value",
      },
      {
        name: "found",
        type: BooleanValue,
        description: "Whether a string value was found at the specified path",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { json, path, defaultValue = "" } = context.inputs;

      if (json === null) {
        return this.createSuccessResult({
          value: new StringValue(defaultValue),
          found: new BooleanValue(false),
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
        const stringValue = results.find((value) => typeof value === "string");
        const found = typeof stringValue === "string";

        return this.createSuccessResult({
          value: new StringValue(found ? stringValue : defaultValue),
          found: new BooleanValue(found),
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
