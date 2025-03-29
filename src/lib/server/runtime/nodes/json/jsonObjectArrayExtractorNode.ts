import { JSONPath } from "jsonpath-plus";
import { ExecutableNode } from "../nodeTypes";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import {
  JsonNodeParameter,
  BooleanNodeParameter,
  StringNodeParameter,
} from "../nodeParameterTypes";

export class JsonObjectArrayExtractorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonJsonExtractor",
    name: "JSON Object/Array Extractor",
    description:
      "Extract a JSON object or array from a JSON object using JSONPath",
    category: "JSON",
    id: "jsonJsonExtractor",
    icon: "braces",
    inputs: [
      {
        name: "json",
        type: JsonNodeParameter,
        description: "The JSON object to extract from",
        required: true,
      },
      {
        name: "path",
        type: StringNodeParameter,
        description:
          'The JSONPath expression (e.g., "$.user.profile" or "$.store.books[*]")',
        required: true,
      },
      {
        name: "defaultValue",
        type: JsonNodeParameter,
        description:
          "Default value if no JSON object/array is found at the path",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: JsonNodeParameter,
        description: "The extracted JSON value (object or array)",
      },
      {
        name: "found",
        type: BooleanNodeParameter,
        description:
          "Whether a JSON object or array was found at the specified path",
        hidden: true,
      },
    ],
  };

  private isJsonValue(value: any): boolean {
    return value !== null && typeof value === "object";
  }

  public async execute(context: NodeContext): Promise<ExecutionResult> {
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
        const jsonValue = results.find((value) => this.isJsonValue(value));
        const found = this.isJsonValue(jsonValue);

        return this.createSuccessResult({
          value: new JsonNodeParameter(found ? jsonValue : defaultValue),
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
      return this.createErrorResult(`Error extracting JSON: ${error.message}`);
    }
  }
}
