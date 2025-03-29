import { JSONPath } from "jsonpath-plus";
import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../types";
import {
  StringNodeParameter,
  BooleanNodeParameter,
  JsonNodeParameter,
} from "../types";

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
        type: JsonNodeParameter,
        description: "The JSON object to extract the string from",
        required: true,
      },
      {
        name: "path",
        type: StringNodeParameter,
        description:
          'The JSONPath expression (e.g., "$.user.profile.name" or "$.store.books[0].title")',
        required: true,
      },
      {
        name: "defaultValue",
        type: StringNodeParameter,
        description: "Default value if no string value is found at the path",
        hidden: true,
        value: new StringNodeParameter(""),
      },
    ],
    outputs: [
      {
        name: "value",
        type: StringNodeParameter,
        description: "The extracted string value",
      },
      {
        name: "found",
        type: BooleanNodeParameter,
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
          value: new StringNodeParameter(defaultValue),
          found: new BooleanNodeParameter(false),
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
          value: new StringNodeParameter(found ? stringValue : defaultValue),
          found: new BooleanNodeParameter(found),
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
