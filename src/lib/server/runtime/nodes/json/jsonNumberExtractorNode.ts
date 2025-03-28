import { JSONPath } from "jsonpath-plus";
import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../runtimeTypes";
import { NodeType } from "../nodeTypes";
import {
  NumberNodeParameter,
  BooleanNodeParameter,
  JsonNodeParameter,
  StringNodeParameter,
} from "../nodeParameterTypes";

export class JsonNumberExtractorNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "jsonNumberExtractor",
    name: "JSON Number Extractor",
    description: "Extract a numeric value from a JSON object using JSONPath",
    category: "JSON",
    id: "jsonNumberExtractor",
    icon: "hash",
    inputs: [
      {
        name: "json",
        type: JsonNodeParameter,
        description: "The JSON object to extract the number from",
        required: true,
      },
      {
        name: "path",
        type: StringNodeParameter,
        description:
          'The JSONPath expression (e.g., "$.user.profile.age" or "$.product.price")',
        required: true,
      },
      {
        name: "defaultValue",
        type: NumberNodeParameter,
        description: "Default value if no numeric value is found at the path",
        hidden: true,
        value: new NumberNodeParameter(0),
      },
    ],
    outputs: [
      {
        name: "value",
        type: NumberNodeParameter,
        description: "The extracted numeric value",
      },
      {
        name: "found",
        type: BooleanNodeParameter,
        description: "Whether a numeric value was found at the specified path",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { json, path, defaultValue = 0 } = context.inputs;

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
          value: new NumberNodeParameter(found ? numberValue : defaultValue),
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
        `Error extracting number: ${error.message}`
      );
    }
  }
}
