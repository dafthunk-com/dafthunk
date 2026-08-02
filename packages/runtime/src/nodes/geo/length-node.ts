import { length } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class LengthNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "length",
    name: "Length",
    type: "length",
    description:
      "Calculates the length of LineString or MultiLineString features",
    tags: ["Geo", "GeoJSON", "Measurement", "Length"],
    icon: "ruler",
    documentation:
      "This node calculates the length of LineString or MultiLineString geometries in specified units.",
    inlinable: true,
    asTool: false,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON feature(s) to calculate length for",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the length measurement",
        required: false,
      },
    ],
    outputs: [
      {
        name: "length",
        type: "number",
        description: "Length in specified units",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, units } = context.inputs;
      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }
      const options = units ? { units } : {};
      const calculatedLength = length(geojson, options);
      return this.createSuccessResult({
        length: calculatedLength,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error calculating length: ${error.message}`
      );
    }
  }
}
