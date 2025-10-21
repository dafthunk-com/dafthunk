import { NodeExecution, NodeType } from "@dafthunk/types";
import { flip } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class FlipNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "flip",
    name: "Flip Coordinates",
    type: "flip",
    description:
      "Flips the coordinate order of GeoJSON features (longitude/latitude ↔ latitude/longitude).",
    tags: ["Geo", "GeoJSON", "Transform", "Flip"],
    icon: "flip-horizontal",
    documentation:
      "This node flips the coordinate order in GeoJSON from [longitude, latitude] to [latitude, longitude] or vice versa.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to flip coordinates",
        required: true,
      },
    ],
    outputs: [
      {
        name: "flipped",
        type: "geojson",
        description: "GeoJSON with flipped coordinate order",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Delegate everything to Turf.js flip function
      const flippedGeometry = flip(geojson);

      return this.createSuccessResult({
        flipped: flippedGeometry,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error flipping coordinates: ${error.message}`
      );
    }
  }
}
