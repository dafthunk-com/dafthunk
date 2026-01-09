import { NodeExecution, NodeType } from "@dafthunk/types";
import { Units } from "@turf/helpers";
import { nearestPointOnLine } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class NearestPointOnLineNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "nearest-point-on-line",
    name: "Nearest Point On Line",
    type: "nearest-point-on-line",
    description: "Returns the nearest point on a line to a given point.",
    tags: ["Geo", "GeoJSON", "Measurement", "NearestPointOnLine"],
    icon: "map-pin",
    documentation:
      "This node finds the nearest point on a line to a given point.",
    inlinable: true,
    inputs: [
      {
        name: "lines",
        type: "geojson",
        description: "Lines to snap to",
        required: true,
      },
      {
        name: "pt",
        type: "geojson",
        description: "Point to snap from",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units for distance (degrees, radians, miles, or kilometers)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "nearest",
        type: "geojson",
        description: "Closest point on the line to the input point",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { lines, pt, units } = context.inputs;

      if (!lines) {
        return this.createErrorResult("Missing lines input");
      }

      if (!pt) {
        return this.createErrorResult("Missing pt input");
      }

      // Prepare options for nearestPointOnLine function
      const options: { units?: Units } = {};

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }

        const validUnits: Units[] = [
          "degrees",
          "radians",
          "miles",
          "kilometers",
        ];
        if (!validUnits.includes(units as Units)) {
          return this.createErrorResult(
            "Units must be one of: degrees, radians, miles, kilometers"
          );
        }

        options.units = units as Units;
      }

      // Delegate everything to Turf.js nearestPointOnLine function
      const nearestPoint = nearestPointOnLine(lines as any, pt as any, options);

      return this.createSuccessResult({
        nearest: nearestPoint,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error finding nearest point on line: ${error.message}`
      );
    }
  }
}
