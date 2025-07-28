import { NodeExecution, NodeType } from "@dafthunk/types";
import { angle } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class AngleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "angle",
    name: "Angle",
    type: "angle",
    description:
      "Calculates the angle between three points, with the middle point as the vertex.",
    tags: ["Geo"],
    icon: "triangle",
    inlinable: true,
    inputs: [
      {
        name: "start",
        type: "geojson",
        description: "Starting point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "vertex",
        type: "geojson",
        description: "Vertex point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "end",
        type: "geojson",
        description: "Ending point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "explementary",
        type: "boolean",
        description:
          "Whether to calculate the explementary angle (default: false)",
        required: false,
      },
      {
        name: "mercator",
        type: "boolean",
        description:
          "Whether to use Mercator projection calculations (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "angle",
        type: "number",
        description:
          "Angle in degrees (0-180 for normal, 180-360 for explementary)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { start, vertex, end, explementary, mercator } = context.inputs;

      if (!start) {
        return this.createErrorResult("Missing start point input");
      }

      if (!vertex) {
        return this.createErrorResult("Missing vertex point input");
      }

      if (!end) {
        return this.createErrorResult("Missing end point input");
      }

      // Prepare options for angle calculation
      const options: { explementary?: boolean; mercator?: boolean } = {};

      if (explementary !== undefined && explementary !== null) {
        if (typeof explementary !== "boolean") {
          return this.createErrorResult(
            "Explementary parameter must be a boolean"
          );
        }
        options.explementary = explementary;
      }

      if (mercator !== undefined && mercator !== null) {
        if (typeof mercator !== "boolean") {
          return this.createErrorResult("Mercator parameter must be a boolean");
        }
        options.mercator = mercator;
      }

      // Calculate the angle using Turf.js
      const calculatedAngle = angle(start, vertex, end, options);

      return this.createSuccessResult({
        angle: calculatedAngle,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating angle: ${error.message}`
      );
    }
  }
}
