import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineOffset } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineOffsetNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-offset",
    name: "Line Offset",
    type: "line-offset",
    description:
      "Takes a line and returns a line at offset by the specified distance.",
    tags: ["Geo"],
    icon: "move",
    inlinable: true,
    inputs: [
      {
        name: "line",
        type: "geojson",
        description: "Input line (Feature or LineString geometry)",
        required: true,
      },
      {
        name: "distance",
        type: "number",
        description: "Distance to offset the line (can be of negative value)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units of the distance e.g. 'kilometers', 'miles', 'meters' (default: kilometers)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "offset",
        type: "geojson",
        description: "Line offset from the input line",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line, distance, units } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      if (distance === undefined || distance === null) {
        return this.createErrorResult("Missing distance input");
      }

      if (typeof distance !== "number") {
        return this.createErrorResult("Distance must be a number");
      }

      // Prepare options for lineOffset
      const options: { units?: string } = {};

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }
        options.units = units;
      }

      // Delegate to Turf.js lineOffset function
      const offsetLine = lineOffset(line as any, distance, options as any);

      return this.createSuccessResult({
        offset: offsetLine,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating line offset: ${error.message}`
      );
    }
  }
}
