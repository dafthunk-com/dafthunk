import type { FeatureCollection, Polygon, Units } from "@dafthunk/geo";
import { shortestPath } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { isUnits } from "./geo-input";

export class ShortestPathNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "shortest-path",
    name: "Shortest Path",
    type: "shortest-path",
    description:
      "Returns the shortest path from start to end without colliding with any Feature in obstacles FeatureCollection<Polygon>",
    tags: ["Geo", "GeoJSON", "Measurement", "ShortestPath"],
    icon: "route",
    documentation:
      "This node calculates the shortest path between two points while avoiding specified obstacle polygons.",
    inlinable: true,
    asTool: false,
    inputs: [
      {
        name: "start",
        type: "geojson",
        description: "Start point",
        required: true,
      },
      {
        name: "end",
        type: "geojson",
        description: "End point",
        required: true,
      },
      {
        name: "obstacles",
        type: "geojson",
        description: "Areas which path cannot travel through",
        required: false,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units for resolution and minimum distance (degrees, radians, miles, kilometers, etc.)",
        required: false,
      },
      {
        name: "resolution",
        type: "number",
        description:
          "Distance between matrix points on which the path will be calculated",
        required: false,
      },
    ],
    outputs: [
      {
        name: "path",
        type: "geojson",
        description: "Shortest path between start and end",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { start, end, obstacles, units, resolution } = context.inputs;

      if (!start) {
        return this.createErrorResult("Missing start input");
      }

      if (!end) {
        return this.createErrorResult("Missing end input");
      }

      // Prepare options for shortestPath function
      const options: {
        obstacles?: FeatureCollection<Polygon>;
        units?: Units;
        resolution?: number;
      } = {};

      if (obstacles !== undefined && obstacles !== null) {
        options.obstacles = obstacles;
      }

      if (units !== undefined && units !== null) {
        // shortestPath walks a grid, so only the units it can step in are valid.
        const supported: Units[] = [
          "degrees",
          "radians",
          "miles",
          "kilometers",
        ];
        if (!isUnits(units) || !supported.includes(units)) {
          return this.createErrorResult(
            `Units must be one of: ${supported.join(", ")}`
          );
        }
        options.units = units;
      }

      if (resolution !== undefined && resolution !== null) {
        if (typeof resolution !== "number") {
          return this.createErrorResult("Resolution must be a number");
        }

        if (resolution <= 0) {
          return this.createErrorResult("Resolution must be a positive number");
        }

        options.resolution = resolution;
      }

      // Delegate everything to Turf.js shortestPath function
      const path = shortestPath(start, end, options);

      return this.createSuccessResult({
        path: path,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error calculating shortest path: ${error.message}`
      );
    }
  }
}
