import { NodeExecution, NodeType } from "@dafthunk/types";
import { pointToLineDistance } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class PointToLineDistanceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "point-to-line-distance",
    name: "Point To Line Distance",
    type: "point-to-line-distance",
    description:
      "Calculates the distance between a given point and the nearest point on a line. Sometimes referred to as the cross track distance.",
    tags: ["Geo", "GeoJSON", "Measurement", "PointToLineDistance"],
    icon: "ruler",
    documentation:
      "This node calculates the distance from a point to a line geometry.",
    inlinable: true,
    inputs: [
      {
        name: "point",
        type: "geojson",
        description: "Feature or Geometry (Point)",
        required: true,
      },
      {
        name: "line",
        type: "geojson",
        description: "GeoJSON Feature or Geometry (LineString)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the distance measurement (default: kilometers)",
        required: false,
      },
      {
        name: "method",
        type: "string",
        description:
          "Distance calculation method: 'geodesic' or 'planar' (default: geodesic)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "distance",
        type: "number",
        description: "Distance between point and line",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { point, line, units, method } = context.inputs;

      if (!point) {
        return this.createErrorResult("Missing point input");
      }

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      // Prepare options for pointToLineDistance calculation
      const options: { units?: string; method?: string } = {};

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }
        options.units = units;
      }

      if (method !== undefined && method !== null) {
        if (typeof method !== "string") {
          return this.createErrorResult("Method must be a string");
        }
        if (method !== "geodesic" && method !== "planar") {
          return this.createErrorResult(
            "Method must be 'geodesic' or 'planar'"
          );
        }
        options.method = method;
      }

      // Delegate to Turf.js pointToLineDistance function
      const distance = pointToLineDistance(
        point as any,
        line as any,
        options as any
      );

      return this.createSuccessResult({
        distance,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating point to line distance: ${error.message}`
      );
    }
  }
}
