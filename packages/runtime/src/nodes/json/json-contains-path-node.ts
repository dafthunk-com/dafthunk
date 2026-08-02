import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { hasPath } from "./json-access";

export class JsonContainsPathNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-contains-path",
    name: "JSON Contains Path",
    type: "json-contains-path",
    description: "Check if JSON contains a specific path",
    tags: ["Data", "JSON", "Query", "ContainsPath"],
    icon: "map-pin",
    documentation:
      "This node checks if a JSON object contains a specific path.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON value to check",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description: "The JSON path to check for (e.g., '$.items[0].name')",
        required: true,
      },
    ],
    outputs: [
      {
        name: "containsPath",
        type: "boolean",
        description: "Whether the JSON contains the specified path",
      },
      {
        name: "isValid",
        type: "boolean",
        description: "Whether the input was valid JSON",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, path } = context.inputs;

      // Handle null or undefined inputs
      if (json === null || json === undefined) {
        return this.createSuccessResult({
          containsPath: false,
          isValid: false,
        });
      }

      if (!path || typeof path !== "string") {
        return this.createSuccessResult({
          containsPath: false,
          isValid: true,
        });
      }

      // Check if the path exists in the JSON
      const containsPath = hasPath(json, path);

      return this.createSuccessResult({
        containsPath,
        isValid: true,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error checking JSON contains path: ${error.message}`
      );
    }
  }
}
