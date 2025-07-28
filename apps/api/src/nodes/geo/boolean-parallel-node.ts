import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanParallel } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BooleanParallelNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-parallel",
    name: "Boolean Parallel",
    type: "boolean-parallel",
    description:
      "Returns True if each segment of line1 is parallel to the correspondent segment of line2.",
    tags: ["Geo"],
    icon: "parallel",
    inputs: [
      {
        name: "line1",
        type: "geojson",
        description: "First GeoJSON LineString Feature or Geometry",
        required: true,
      },
      {
        name: "line2",
        type: "geojson",
        description: "Second GeoJSON LineString Feature or Geometry",
        required: true,
      },
    ],
    outputs: [
      {
        name: "isParallel",
        type: "boolean",
        description: "True if the lines are parallel, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line1, line2 } = context.inputs;

      if (!line1) {
        return this.createErrorResult("Missing line1 input");
      }

      if (!line2) {
        return this.createErrorResult("Missing line2 input");
      }

      // Delegate everything to Turf.js booleanParallel function
      const isParallel = booleanParallel(line1 as any, line2 as any);

      return this.createSuccessResult({
        isParallel,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking parallel lines: ${error.message}`
      );
    }
  }
}
