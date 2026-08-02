import type { Units } from "@dafthunk/geo";
import { nearestPointOnLine } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { isUnits } from "./geo-input";

export class NearestPointOnLineNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "nearest-point-on-line",
    name: "Nearest Point On Line",
    type: "nearest-point-on-line",
    description: "Returns the nearest point on a line to a given point",
    tags: ["Geo", "GeoJSON", "Measurement", "NearestPointOnLine"],
    icon: "map-pin",
    documentation:
      "This node finds the nearest point on a line to a given point.",
    inlinable: true,
    asTool: false,
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
        // This operation only supports a subset of the unit list.
        const supported: Units[] = [
          "degrees",
          "radians",
          "miles",
          "kilometers",
        ];
        if (!isUnits(units) || !supported.includes(units)) {
          return this.createErrorResult(
            "Units must be one of: degrees, radians, miles, kilometers"
          );
        }
        options.units = units;
      }

      // Delegate everything to Turf.js nearestPointOnLine function
      const nearestPoint = nearestPointOnLine(lines, pt, options);

      return this.createSuccessResult({
        nearest: nearestPoint,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error finding nearest point on line: ${error.message}`
      );
    }
  }
}
