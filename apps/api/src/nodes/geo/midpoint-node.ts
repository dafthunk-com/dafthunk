import { NodeExecution, NodeType } from "@dafthunk/types";
import { midpoint } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class MidpointNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "midpoint",
    name: "Midpoint",
    type: "midpoint",
    description: "Calculates the midpoint between two points.",
    tags: ["Geo", "GeoJSON", "Measurement", "Midpoint"],
    icon: "crosshair",
    documentation: "This node calculates the midpoint between two points.",
    inlinable: true,
    inputs: [
      {
        name: "point1",
        type: "geojson",
        description: "First point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "point2",
        type: "geojson",
        description: "Second point (Point feature or coordinates)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "midpoint",
        type: "geojson",
        description: "Midpoint as a Point feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { point1, point2 } = context.inputs;

      if (!point1) {
        return this.createErrorResult("Missing point1 input");
      }

      if (!point2) {
        return this.createErrorResult("Missing point2 input");
      }

      // Delegate everything to Turf.js
      const midpointResult = midpoint(point1, point2);

      return this.createSuccessResult({
        midpoint: midpointResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating midpoint: ${error.message}`
      );
    }
  }
}
