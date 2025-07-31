import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanOverlap } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BooleanOverlapNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "booleanOverlap",
    name: "Boolean Overlap",
    type: "booleanOverlap",
    description:
      "Compares two geometries of the same dimension and returns true if their intersection set results in a geometry different from both but of the same dimension. Applies to Polygon/Polygon, LineString/LineString, Multipoint/Multipoint, MultiLineString/MultiLineString and MultiPolygon/MultiPolygon.",
    tags: ["Geo"],
    icon: "squares-intersect",
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
        name: "result",
        type: "boolean",
        description: "True if geometries overlap, false otherwise",
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

      // Delegate directly to Turf.js booleanOverlap function
      const result = booleanOverlap(feature1, feature2);

      return this.createSuccessResult({
        result,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error testing overlap relationship: ${error.message}`
      );
    }
  }
}
