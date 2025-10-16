import { NodeExecution, NodeType } from "@dafthunk/types";
import { greatCircle } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class GreatCircleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "greatCircle",
    name: "Great Circle",
    type: "greatCircle",
    description:
      "Calculate great circles routes as LineString or MultiLineString between two points.",
    tags: ["Geo"],
    icon: "globe",
    documentation:
      "This node calculates a great circle route between two points on Earth's surface, following the shortest path along the globe.",
    inlinable: true,
    inputs: [
      {
        name: "start",
        type: "geojson",
        description: "Source point feature",
        required: true,
      },
      {
        name: "end",
        type: "geojson",
        description: "Destination point feature",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Line feature properties",
        required: false,
      },
      {
        name: "npoints",
        type: "number",
        description: "Number of points (default: 100)",
        required: false,
      },
      {
        name: "offset",
        type: "number",
        description:
          "Offset controls the likelihood that lines will be split which cross the dateline (default: 10)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "line",
        type: "geojson",
        description:
          "Great circle line feature (LineString or MultiLineString)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { start, end, properties, npoints, offset } = context.inputs;

      if (!start) {
        return this.createErrorResult("Missing start point input");
      }

      if (!end) {
        return this.createErrorResult("Missing end point input");
      }

      // Prepare options for greatCircle calculation
      const options: {
        properties?: Record<string, any>;
        npoints?: number;
        offset?: number;
      } = {};

      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object" || Array.isArray(properties)) {
          return this.createErrorResult("Properties must be an object");
        }
        options.properties = properties;
      }

      if (npoints !== undefined && npoints !== null) {
        if (typeof npoints !== "number" || !isFinite(npoints) || npoints <= 0) {
          return this.createErrorResult("Npoints must be a positive number");
        }
        options.npoints = npoints;
      }

      if (offset !== undefined && offset !== null) {
        if (typeof offset !== "number" || !isFinite(offset)) {
          return this.createErrorResult("Offset must be a valid number");
        }
        options.offset = offset;
      }

      // Delegate to Turf.js greatCircle function
      const greatCircleLine = greatCircle(
        start as any,
        end as any,
        options as any
      );

      return this.createSuccessResult({
        line: greatCircleLine,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating great circle: ${error.message}`
      );
    }
  }
}
