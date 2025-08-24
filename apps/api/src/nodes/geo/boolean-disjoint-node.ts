import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanDisjoint } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BooleanDisjointNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "booleanDisjoint",
    name: "Boolean Disjoint",
    type: "booleanDisjoint",
    description:
      "Returns true if the intersection of the two geometries is an empty set.",
    tags: ["Geo"],
    icon: "slash",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "feature1",
        type: "geojson",
        description: "GeoJSON Feature or Geometry",
        required: true,
      },
      {
        name: "feature2",
        type: "geojson",
        description: "GeoJSON Feature or Geometry",
        required: true,
      },
    ],
    outputs: [
      {
        name: "disjoint",
        type: "boolean",
        description:
          "True if the intersection is an empty set, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { feature1, feature2 } = context.inputs;

      if (!feature1 || !feature2) {
        return this.createErrorResult(
          "Both feature1 and feature2 inputs are required"
        );
      }

      const result = booleanDisjoint(feature1, feature2);
      return this.createSuccessResult({
        disjoint: result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error testing disjoint relationship: ${error.message}`
      );
    }
  }
}
