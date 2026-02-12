import { NodeExecution, NodeType } from "@dafthunk/types";
import { round } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class RoundNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "round",
    name: "Round",
    type: "round",
    description:
      "Rounds the precision of a coordinate to a specified number of decimal places.",
    tags: ["Geo", "GeoJSON", "Transform", "Round"],
    icon: "hash",
    documentation:
      "This node rounds the coordinates of a GeoJSON geometry to a specified precision.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON to round coordinates from",
        required: true,
      },
      {
        name: "precision",
        type: "number",
        description: "Number of decimal places to round to (default: 6)",
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
        name: "rounded",
        type: "geojson",
        description: "GeoJSON with rounded coordinates",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, precision, mutate } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }

      // Validate precision parameter
      let precisionValue = 6; // default value
      if (precision !== undefined && precision !== null) {
        if (typeof precision !== "number") {
          return this.createErrorResult("Precision must be a number");
        }
        if (precision < 0) {
          return this.createErrorResult(
            "Precision must be a non-negative number"
          );
        }
        precisionValue = precision;
      }

      // Validate mutate parameter
      if (mutate !== undefined && mutate !== null) {
        if (typeof mutate !== "boolean") {
          return this.createErrorResult("Mutate must be a boolean");
        }
      }

      // Delegate to Turf.js round function
      const rounded = round(geojson as any, precisionValue);

      return this.createSuccessResult({
        rounded,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error rounding coordinates: ${error.message}`
      );
    }
  }
}
