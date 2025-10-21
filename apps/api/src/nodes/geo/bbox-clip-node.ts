import { NodeExecution, NodeType } from "@dafthunk/types";
import { bboxClip } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BboxClipNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bbox-clip",
    name: "BBox Clip",
    type: "bbox-clip",
    description:
      "Takes a Feature and a bbox and clips the feature to the bbox using lineclip. Polygon features are clipped to polygon intersection with bbox, LineString features are clipped to segments that intersect the bbox, and Point features are clipped if they fall within the bbox.",
    tags: ["Geo", "GeoJSON", "BBox", "Clip"],
    icon: "scissors",
    documentation: "This node clips a geometry to a bounding box area.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "Feature or Geometry to clip",
        required: true,
      },
      {
        name: "bbox",
        type: "json",
        description: "Bounding box extent in [west, south, east, north] order",
        required: true,
      },
    ],
    outputs: [
      {
        name: "clipped",
        type: "geojson",
        description: "Clipped Feature or Geometry",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, bbox } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }

      if (!bbox) {
        return this.createErrorResult("Missing bbox input");
      }

      if (!Array.isArray(bbox)) {
        return this.createErrorResult("Bbox must be an array");
      }

      if (bbox.length !== 4) {
        return this.createErrorResult(
          "Bbox must have exactly 4 elements [west, south, east, north]"
        );
      }

      for (let i = 0; i < bbox.length; i++) {
        if (typeof bbox[i] !== "number") {
          return this.createErrorResult(
            `Bbox element at index ${i} must be a number`
          );
        }
      }

      // Delegate to Turf.js bboxClip function
      const clipped = bboxClip(
        geojson as any,
        bbox as [number, number, number, number]
      );

      return this.createSuccessResult({
        clipped,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error clipping geometry to bbox: ${error.message}`
      );
    }
  }
}
