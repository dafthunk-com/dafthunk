import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanTouches } from "@turf/turf";

export class BooleanTouchesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-touches",
    name: "Boolean Touches",
    type: "boolean-touches",
    description:
      "Returns true if none of the points common to both geometries intersect the interiors of both geometries.",
    tags: ["Geo", "GeoJSON", "Boolean", "Touches"],
    icon: "touchpad",
    documentation:
      "This node checks if two geometries touch each other at their boundaries.",
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
        name: "touches",
        type: "boolean",
        description: "True if the geometries touch, false otherwise",
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

      // Delegate everything to Turf.js booleanTouches function
      const touches = booleanTouches(feature1 as any, feature2 as any);

      return this.createSuccessResult({
        touches,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking if geometries touch: ${error.message}`
      );
    }
  }
}
