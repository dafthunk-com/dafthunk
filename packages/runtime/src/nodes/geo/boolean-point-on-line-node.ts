import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanPointOnLine } from "@turf/turf";

export class BooleanPointOnLineNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-point-on-line",
    name: "Boolean Point On Line",
    type: "boolean-point-on-line",
    description:
      "Returns true if a point is on a line. Accepts optional parameters to ignore start/end vertices and set epsilon tolerance.",
    tags: ["Geo", "GeoJSON", "Boolean", "PointOnLine"],
    icon: "mouse-pointer",
    documentation:
      "This node tests whether a point lies exactly on a LineString geometry.",
    inlinable: true,
    inputs: [
      {
        name: "pt",
        type: "geojson",
        description: "GeoJSON Point to check",
        required: true,
      },
      {
        name: "line",
        type: "geojson",
        description: "GeoJSON LineString to check against",
        required: true,
      },
      {
        name: "ignoreEndVertices",
        type: "boolean",
        description:
          "Whether to ignore the start and end vertices (default: false)",
        required: false,
      },
      {
        name: "epsilon",
        type: "number",
        description:
          "Fractional number to compare with cross product result for floating point precision (default: 0)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "isOnLine",
        type: "boolean",
        description: "True if the point is on the line, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { pt, line, ignoreEndVertices, epsilon } = context.inputs;

      if (!pt) {
        return this.createErrorResult("Missing pt input");
      }

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      // Build options object for Turf.js
      const options: any = {};

      if (ignoreEndVertices !== undefined) {
        options.ignoreEndVertices = ignoreEndVertices;
      }

      if (epsilon !== undefined) {
        options.epsilon = epsilon;
      }

      // Delegate everything to Turf.js booleanPointOnLine function
      const isOnLine = booleanPointOnLine(pt as any, line as any, options);

      return this.createSuccessResult({
        isOnLine,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking if point is on line: ${error.message}`
      );
    }
  }
}
