import { NodeExecution, NodeType } from "@dafthunk/types";
import { pointToPolygonDistance } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class PointToPolygonDistanceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "point-to-polygon-distance",
    name: "Point To Polygon Distance",
    type: "point-to-polygon-distance",
    description: "Calculates the distance from a point to the edges of a polygon or multi-polygon. Returns negative values for points inside the polygon.",
    tags: ["Geo", "Turf", "Distance", "Point", "Polygon", "Measurement"],
    icon: "ruler",
    inputs: [
      {
        name: "point",
        type: "geojson",
        description: "Input point (Feature or Point geometry)",
        required: true,
      },
      {
        name: "polygon",
        type: "geojson",
        description: "Input polygon or multipolygon (Feature or Polygon/MultiPolygon geometry)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units of the result e.g. 'kilometers', 'miles', 'meters' (default: meters)",
        required: false,
      },
      {
        name: "method",
        type: "string",
        description: "Method of the result: 'geodesic' or 'planar' (default: geodesic)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "distance",
        type: "number",
        description: "Distance in specified units (negative values for points inside the polygon)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { point, polygon, units, method } = context.inputs;

      if (!point) {
        return this.createErrorResult("Missing point input");
      }

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Prepare options for pointToPolygonDistance calculation
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
          return this.createErrorResult("Method must be 'geodesic' or 'planar'");
        }
        options.method = method;
      }

      // Delegate to Turf.js pointToPolygonDistance function
      const distance = pointToPolygonDistance(point as any, polygon as any, options as any);

      return this.createSuccessResult({
        distance,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error calculating point to polygon distance: ${error.message}`);
    }
  }
} 