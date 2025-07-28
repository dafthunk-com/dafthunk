import { NodeExecution, NodeType } from "@dafthunk/types";
import { along } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class AlongNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "along",
    name: "Along",
    type: "along",
    description:
      "Takes a LineString and returns a Point at a specified distance along the line.",
    tags: ["Geo"],
    icon: "map-pin",
    inlinable: true,
    inputs: [
      {
        name: "line",
        type: "geojson",
        description: "The LineString to measure along",
        required: true,
      },
      {
        name: "distance",
        type: "number",
        description: "Distance along the line",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the distance measurement (default: kilometers)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "point",
        type: "geojson",
        description: "Point at the specified distance along the line",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line, distance, units } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      if (distance === undefined || distance === null) {
        return this.createErrorResult("Missing distance input");
      }

      if (typeof distance !== "number" || !isFinite(distance)) {
        return this.createErrorResult("Distance must be a valid number");
      }

      // Prepare options for along calculation
      const options: { units?: string } = {};

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }
        options.units = units;
      }

      // Delegate to Turf.js along function
      const pointAlong = along(line as any, distance, options as any);

      return this.createSuccessResult({
        point: pointAlong,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating point along line: ${error.message}`
      );
    }
  }
}
