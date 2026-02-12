import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanCrosses } from "@turf/turf";

export class BooleanCrossesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "booleanCrosses",
    name: "Boolean Crosses",
    type: "booleanCrosses",
    description:
      "Tests whether two geometries cross each other (intersect but do not contain each other).",
    tags: ["Geo", "GeoJSON", "Boolean", "Crosses"],
    icon: "x",
    documentation: "This node checks if two geometries cross each other.",
    inlinable: true,
    inputs: [
      {
        name: "feature1",
        type: "geojson",
        description: "First geometry (Feature or geometry)",
        required: true,
      },
      {
        name: "feature2",
        type: "geojson",
        description: "Second geometry (Feature or geometry)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "crosses",
        type: "boolean",
        description: "True if geometries cross each other, false otherwise",
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

      // Use Turf.js booleanCrosses function directly
      const crossesResult = booleanCrosses(feature1, feature2);

      return this.createSuccessResult({
        crosses: crossesResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error testing crosses relationship: ${error.message}`
      );
    }
  }
}
