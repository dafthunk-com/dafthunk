import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { length } from "@turf/turf";

export class LengthNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "length",
    name: "Length",
    type: "length",
    description:
      "Calculates the length of LineString or MultiLineString features.",
    tags: ["Geo", "GeoJSON", "Measurement", "Length"],
    icon: "ruler",
    documentation:
      "This node calculates the length of LineString or MultiLineString geometries in specified units.",
    inlinable: true,
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
      const calculatedLength = length(geojson as any, options as any);
      return this.createSuccessResult({
        length: calculatedLength,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating length: ${error.message}`
      );
    }
  }
}
