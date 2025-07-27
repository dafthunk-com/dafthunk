import { NodeExecution, NodeType } from "@dafthunk/types";
import { shortestPath } from "@turf/turf";
import { Units } from "@turf/helpers";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class ShortestPathNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "shortest-path",
    name: "Shortest Path",
    type: "shortest-path",
    description: "Returns the shortest path from start to end without colliding with any Feature in obstacles FeatureCollection<Polygon>",
    tags: ["Geo"],
    icon: "route",
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
        description: "Units for resolution and minimum distance (degrees, radians, miles, kilometers, etc.)",
        required: false,
      },
      {
        name: "resolution",
        type: "number",
        description: "Distance between matrix points on which the path will be calculated",
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
      const options: { obstacles?: any; units?: Units; resolution?: number } = {};

      if (obstacles !== undefined && obstacles !== null) {
        options.obstacles = obstacles;
      }

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }

        const validUnits: Units[] = ["degrees", "radians", "miles", "kilometers"];
        if (!validUnits.includes(units as Units)) {
          return this.createErrorResult("Units must be one of: degrees, radians, miles, kilometers");
        }

        options.units = units as Units;
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
      const path = shortestPath(start as any, end as any, options);

      return this.createSuccessResult({
        path: path,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error calculating shortest path: ${error.message}`);
    }
  }
} 