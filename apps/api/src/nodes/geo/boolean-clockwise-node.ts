import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanClockwise } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BooleanClockwiseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-clockwise",
    name: "Boolean Clockwise",
    type: "boolean-clockwise",
    description:
      "Takes a ring and returns true or false whether or not the ring is clockwise or counter-clockwise.",
    tags: ["Geo"],
    icon: "rotate-cw",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "line",
        type: "geojson",
        description:
          "LineString Feature, LineString geometry, or coordinate array to be evaluated",
        required: true,
      },
    ],
    outputs: [
      {
        name: "isClockwise",
        type: "boolean",
        description:
          "True if the ring is clockwise, false if counter-clockwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      // Delegate everything to Turf.js booleanClockwise function
      const isClockwise = booleanClockwise(line as any);

      return this.createSuccessResult({
        isClockwise,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking clockwise direction: ${error.message}`
      );
    }
  }
}
