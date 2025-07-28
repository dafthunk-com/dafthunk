import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineSlice } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineSliceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-slice",
    name: "Line Slice",
    type: "line-slice",
    description:
      "Takes a line, a start Point, and a stop point and returns a subsection of the line in-between those points.",
    tags: ["Geo"],
    icon: "scissors",
    inputs: [
      {
        name: "startPt",
        type: "geojson",
        description: "Starting point",
        required: true,
      },
      {
        name: "stopPt",
        type: "geojson",
        description: "Stopping point",
        required: true,
      },
      {
        name: "line",
        type: "geojson",
        description: "Line to slice",
        required: true,
      },
    ],
    outputs: [
      {
        name: "sliced",
        type: "geojson",
        description: "Sliced line feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { startPt, stopPt, line } = context.inputs;

      if (!startPt) {
        return this.createErrorResult("Missing startPt input");
      }

      if (!stopPt) {
        return this.createErrorResult("Missing stopPt input");
      }

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      // Delegate everything to Turf.js lineSlice function
      const slicedLine = lineSlice(startPt as any, stopPt as any, line as any);

      return this.createSuccessResult({
        sliced: slicedLine,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error slicing line: ${error.message}`);
    }
  }
}
