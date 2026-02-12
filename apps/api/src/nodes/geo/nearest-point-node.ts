import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { nearestPoint } from "@turf/turf";

export class NearestPointNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "nearestPoint",
    name: "Nearest Point",
    type: "nearestPoint",
    description:
      "Finds the nearest point from a collection of points to a target point.",
    tags: ["Geo", "GeoJSON", "Measurement", "NearestPoint"],
    icon: "target",
    documentation:
      "This node finds the nearest point in a collection to a target point.",
    inlinable: true,
    inputs: [
      {
        name: "targetPoint",
        type: "geojson",
        description: "Target point to find the nearest point to",
        required: true,
      },
      {
        name: "points",
        type: "geojson",
        description:
          "Collection of points to search (FeatureCollection of Point features)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "nearestPoint",
        type: "geojson",
        description: "The nearest point feature from the collection",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { targetPoint, points } = context.inputs;

      if (!targetPoint) {
        return this.createErrorResult("Missing targetPoint input");
      }

      if (!points) {
        return this.createErrorResult("Missing points input");
      }

      // Delegate everything to Turf.js nearestPoint function
      const nearest = nearestPoint(targetPoint, points);

      return this.createSuccessResult({
        nearestPoint: nearest,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error finding nearest point: ${error.message}`
      );
    }
  }
}
