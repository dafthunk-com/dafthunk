import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { cleanCoords } from "@turf/turf";

export class CleanCoordsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "clean-coords",
    name: "Clean Coordinates",
    type: "clean-coords",
    description: "Removes redundant coordinates from any GeoJSON Geometry.",
    tags: ["Geo", "GeoJSON", "Transform", "CleanCoords"],
    icon: "scissors",
    documentation:
      "This node removes redundant coordinates from GeoJSON geometries to optimize data size and processing.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "Feature or Geometry to clean coordinates from",
        required: true,
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
        name: "cleaned",
        type: "geojson",
        description: "The cleaned input Feature/Geometry",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, mutate } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }

      // Prepare options for cleanCoords
      const options: { mutate?: boolean } = {};

      if (mutate !== undefined && mutate !== null) {
        if (typeof mutate !== "boolean") {
          return this.createErrorResult("Mutate must be a boolean");
        }
        options.mutate = mutate;
      }

      // Delegate to Turf.js cleanCoords function
      const cleaned = cleanCoords(geojson as any, options);

      return this.createSuccessResult({
        cleaned,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error cleaning coordinates: ${error.message}`
      );
    }
  }
}
