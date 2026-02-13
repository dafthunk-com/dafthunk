import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { rhumbDistance } from "@turf/turf";

export class RhumbDistanceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rhumbDistance",
    name: "Rhumb Distance",
    type: "rhumbDistance",
    description:
      "Calculates the rhumb line distance (constant bearing distance) between two points.",
    tags: ["Geo", "GeoJSON", "Measurement", "RhumbDistance"],
    icon: "ruler",
    documentation:
      "This node calculates the rhumb line distance (constant bearing) between two points on Earth's surface.",
    inlinable: true,
    inputs: [
      {
        name: "from",
        type: "geojson",
        description: "Starting point (Feature or Point geometry)",
        required: true,
      },
      {
        name: "to",
        type: "geojson",
        description: "Ending point (Feature or Point geometry)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units for distance calculation (kilometers, miles, meters, degrees, radians)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "distance",
        type: "number",
        description: "Rhumb line distance in specified units",
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

      // Calculate the rhumb distance using Turf.js
      const distance = rhumbDistance(from, to, units ? { units } : {});

      return this.createSuccessResult({
        distance: distance,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating rhumb distance: ${error.message}`
      );
    }
  }
}
