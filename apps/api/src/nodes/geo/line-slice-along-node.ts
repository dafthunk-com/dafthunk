import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineSliceAlong } from "@turf/turf";
import { Units } from "@turf/helpers";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineSliceAlongNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-slice-along",
    name: "Line Slice Along",
    type: "line-slice-along",
    description: "Takes a line, a specified distance along the line to a start Point, and a specified distance along the line to a stop point and returns a subsection of the line in-between those points.",
    tags: ["Geo"],
    icon: "ruler",
    inputs: [
      {
        name: "line",
        type: "geojson",
        description: "Input line",
        required: true,
      },
      {
        name: "startDist",
        type: "number",
        description: "Distance along the line to starting point",
        required: true,
      },
      {
        name: "stopDist",
        type: "number",
        description: "Distance along the line to ending point",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for distance (degrees, radians, miles, or kilometers)",
        required: false,
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
      const { line, startDist, stopDist, units } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      if (startDist === undefined || startDist === null) {
        return this.createErrorResult("Missing startDist input");
      }

      if (typeof startDist !== "number") {
        return this.createErrorResult("startDist must be a number");
      }

      if (stopDist === undefined || stopDist === null) {
        return this.createErrorResult("Missing stopDist input");
      }

      if (typeof stopDist !== "number") {
        return this.createErrorResult("stopDist must be a number");
      }

      // Prepare options for lineSliceAlong
      const options: { units?: Units } = {};
      
      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }

        const validUnits: Units[] = ["degrees", "radians", "miles", "kilometers"];
        if (!validUnits.includes(units as Units)) {
          return this.createErrorResult("Units must be one of: degrees, radians, miles, kilometers");
        }

        options.units = units as Units;
      }

      // Delegate everything to Turf.js lineSliceAlong function
      const slicedLine = lineSliceAlong(line as any, startDist, stopDist, options);

      return this.createSuccessResult({
        sliced: slicedLine,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error slicing line along: ${error.message}`);
    }
  }
} 