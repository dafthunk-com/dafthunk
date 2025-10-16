import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class JsonMergeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-merge",
    name: "JSON Merge",
    type: "json-merge",
    description: "Merge multiple JSON objects",
    tags: ["JSON"],
    icon: "merge",
    documentation: "This node merges multiple JSON objects.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "objects",
        type: "json",
        description: "Array of JSON objects to merge",
        required: true,
      },
      {
        name: "deep",
        type: "boolean",
        description: "Whether to perform deep merge (default: true)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description: "The merged JSON object",
      },
      {
        name: "count",
        type: "number",
        description: "Number of objects merged",
        hidden: true,
      },
      {
        name: "success",
        type: "boolean",
        description: "Whether the merge was successful",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { objects, deep = true } = context.inputs;

      // Handle null or undefined inputs
      if (objects === null || objects === undefined) {
        return this.createSuccessResult({
          result: {},
          count: 0,
          success: false,
        });
      }

      // Check if input is an array
      if (!Array.isArray(objects)) {
        return this.createSuccessResult({
          result: {},
          count: 0,
          success: false,
        });
      }

      // Filter out null/undefined and non-object values
      const validObjects = objects.filter(
        (obj) =>
          obj !== null &&
          obj !== undefined &&
          typeof obj === "object" &&
          !Array.isArray(obj)
      );

      if (validObjects.length === 0) {
        return this.createSuccessResult({
          result: {},
          count: 0,
          success: true,
        });
      }

      // Perform the merge
      const result = deep
        ? this.deepMerge(validObjects)
        : this.shallowMerge(validObjects);

      return this.createSuccessResult({
        result,
        count: validObjects.length,
        success: true,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error merging JSON objects: ${error.message}`
      );
    }
  }

  private shallowMerge(objects: any[]): any {
    const result: any = {};

    for (const obj of objects) {
      if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        Object.assign(result, obj);
      }
    }

    return result;
  }

  private deepMerge(objects: any[]): any {
    const result: any = {};

    for (const obj of objects) {
      if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        this.mergeObject(result, obj);
      }
    }

    return result;
  }

  private mergeObject(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (sourceValue === undefined) {
          // Skip undefined values; allow null to overwrite
          continue;
        }

        if (Array.isArray(sourceValue)) {
          // For arrays, replace the target array
          target[key] = JSON.parse(JSON.stringify(sourceValue));
        } else if (
          typeof sourceValue === "object" &&
          sourceValue !== null &&
          typeof targetValue === "object" &&
          targetValue !== null &&
          !Array.isArray(targetValue) &&
          !Array.isArray(sourceValue)
        ) {
          // For objects, recursively merge
          if (!target[key]) {
            target[key] = {};
          }
          this.mergeObject(target[key], sourceValue);
        } else {
          // For primitives, replace the target value
          target[key] = sourceValue;
        }
      }
    }
  }
}
