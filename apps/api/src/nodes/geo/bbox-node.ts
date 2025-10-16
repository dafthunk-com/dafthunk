import { NodeExecution, NodeType } from "@dafthunk/types";
import { bbox } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BboxNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bbox",
    name: "Bounding Box",
    type: "bbox",
    description:
      "Calculates the bounding box of any GeoJSON feature in [minX, minY, maxX, maxY] format.",
    tags: ["Geo"],
    icon: "square-dashed",
    documentation:
      "This node calculates the bounding box (minimum and maximum coordinates) of a GeoJSON feature or feature collection.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON feature(s) to calculate bounding box for",
        required: true,
      },
      {
        name: "recompute",
        type: "boolean",
        description:
          "Whether to ignore an existing bbox property on geojson (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bbox",
        type: "json",
        description: "Bounding box as [minX, minY, maxX, maxY]",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, recompute } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Prepare options for bbox calculation
      const options: { recompute?: boolean } = {};

      if (recompute !== undefined && recompute !== null) {
        if (typeof recompute !== "boolean") {
          return this.createErrorResult(
            "Recompute parameter must be a boolean"
          );
        }
        options.recompute = recompute;
      }

      // Calculate the bounding box using Turf.js
      const boundingBox = bbox(geojson, options);

      return this.createSuccessResult({
        bbox: boundingBox,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating bounding box: ${error.message}`
      );
    }
  }
}
