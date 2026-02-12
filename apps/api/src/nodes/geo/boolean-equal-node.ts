import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanEqual } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class BooleanEqualNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-equal",
    name: "Boolean Equal",
    type: "boolean-equal",
    description:
      "Determines whether two geometries of the same type have identical X,Y coordinate values.",
    tags: ["Geo", "GeoJSON", "Boolean", "Equal"],
    icon: "equal",
    documentation:
      "This node tests whether two geometries have identical coordinate values.",
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
        name: "isEqual",
        type: "boolean",
        description: "True if the geometries are equal, false otherwise",
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

      // Delegate everything to Turf.js booleanEqual function
      const isEqual = booleanEqual(feature1 as any, feature2 as any);

      return this.createSuccessResult({
        isEqual,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking equality: ${error.message}`
      );
    }
  }
}
