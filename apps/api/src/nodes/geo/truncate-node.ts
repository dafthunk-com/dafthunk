import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { truncate } from "@turf/turf";

export class TruncateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "truncate",
    name: "Truncate",
    type: "truncate",
    description:
      "Truncates the precision of a coordinate to a specified number of decimal places.",
    tags: ["Geo", "GeoJSON", "Transform", "Truncate"],
    icon: "scissors",
    documentation:
      "This node truncates coordinate precision in GeoJSON geometries to a specified number of decimal places.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON to truncate coordinates from",
        required: true,
      },
      {
        name: "precision",
        type: "number",
        description: "Number of decimal places to truncate to (default: 6)",
        required: false,
      },
      {
        name: "coordinates",
        type: "number",
        description: "Number of coordinates to truncate (default: 2)",
        required: false,
      },
      {
        name: "mutate",
        type: "boolean",
        description: "Allows GeoJSON input to be mutated (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "truncated",
        type: "geojson",
        description: "GeoJSON with truncated coordinates",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, precision, coordinates, mutate } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }

      // Prepare options for truncate
      const options: {
        precision?: number;
        coordinates?: number;
        mutate?: boolean;
      } = {};

      if (precision !== undefined && precision !== null) {
        if (typeof precision !== "number") {
          return this.createErrorResult("Precision must be a number");
        }
        if (precision < 0) {
          return this.createErrorResult(
            "Precision must be a non-negative number"
          );
        }
        options.precision = precision;
      }

      if (coordinates !== undefined && coordinates !== null) {
        if (typeof coordinates !== "number") {
          return this.createErrorResult("Coordinates must be a number");
        }
        if (coordinates < 2) {
          return this.createErrorResult("Coordinates must be at least 2");
        }
        options.coordinates = coordinates;
      }

      if (mutate !== undefined && mutate !== null) {
        if (typeof mutate !== "boolean") {
          return this.createErrorResult("Mutate must be a boolean");
        }
        options.mutate = mutate;
      }

      // Delegate to Turf.js truncate function
      const truncated = truncate(geojson as any, options);

      return this.createSuccessResult({
        truncated,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error truncating coordinates: ${error.message}`
      );
    }
  }
}
