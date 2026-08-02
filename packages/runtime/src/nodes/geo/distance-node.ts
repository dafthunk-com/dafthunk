import type { Units } from "@dafthunk/geo";
import { distance } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { isUnits, UNITS_LIST } from "./geo-input";

export class DistanceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "distance",
    name: "Distance",
    type: "distance",
    description: "Calculates the distance between two points",
    tags: ["Geo", "GeoJSON", "Measurement", "Distance"],
    icon: "ruler",
    inlinable: true,
    asTool: false,
    inputs: [
      {
        name: "from",
        type: "geojson",
        description: "Starting point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "to",
        type: "geojson",
        description: "Ending point (Point feature or coordinates)",
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
        name: "distance",
        type: "number",
        description: "Distance in specified units",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { from, to, units } = context.inputs;

      if (!from) {
        return this.createErrorResult("Missing from point input");
      }

      if (!to) {
        return this.createErrorResult("Missing to point input");
      }

      // Prepare options for distance calculation
      const options: { units?: Units } = {};

      if (units !== undefined && units !== null) {
        if (!isUnits(units)) {
          return this.createErrorResult(`Units must be one of: ${UNITS_LIST}`);
        }
        options.units = units;
      }

      // Calculate the distance using Turf.js
      const calculatedDistance = distance(from, to, options);

      return this.createSuccessResult({
        distance: calculatedDistance,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error calculating distance: ${error.message}`
      );
    }
  }
}
