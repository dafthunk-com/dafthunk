import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanContains } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class BooleanContainsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "booleanContains",
    name: "Boolean Contains",
    type: "booleanContains",
    description:
      "Tests whether one geometry completely contains another geometry.",
    tags: ["Geo", "GeoJSON", "Boolean", "Contains"],
    icon: "box",
    documentation:
      "This node tests whether one geometry completely contains another geometry.",
    inlinable: true,
    inputs: [
      {
        name: "feature1",
        type: "geojson",
        description: "The containing geometry (Feature or geometry)",
        required: true,
      },
      {
        name: "feature2",
        type: "geojson",
        description: "The contained geometry (Feature or geometry)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "contains",
        type: "boolean",
        description:
          "True if feature1 completely contains feature2, false otherwise",
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

      // Use Turf.js booleanContains function directly
      const containsResult = booleanContains(feature1, feature2);

      return this.createSuccessResult({
        contains: containsResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error testing contains relationship: ${error.message}`
      );
    }
  }
}
