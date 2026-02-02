import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanIntersects } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class BooleanIntersectsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-intersects",
    name: "Boolean Intersects",
    type: "boolean-intersects",
    description:
      "Returns true if the intersection results in a geometry whose dimension is equal to the maximum dimension of the two source geometries.",
    tags: ["Geo", "GeoJSON", "Boolean", "Intersects"],
    icon: "squares-intersect",
    documentation:
      "This node tests whether two geometries intersect (share any common points, lines, or areas).",
    inlinable: true,
    inputs: [
      {
        name: "feature1",
        type: "geojson",
        description: "First GeoJSON Feature or Geometry",
        required: true,
      },
      {
        name: "feature2",
        type: "geojson",
        description: "Second GeoJSON Feature or Geometry",
        required: true,
      },
    ],
    outputs: [
      {
        name: "intersects",
        type: "boolean",
        description: "True if the geometries intersect, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { feature1, feature2 } = context.inputs;

      if (!feature1) {
        return this.createErrorResult("Missing feature1 input");
      }

      if (!feature2) {
        return this.createErrorResult("Missing feature2 input");
      }

      // Delegate everything to Turf.js booleanIntersects function
      const intersects = booleanIntersects(feature1 as any, feature2 as any);

      return this.createSuccessResult({
        intersects,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking intersection: ${error.message}`
      );
    }
  }
}
