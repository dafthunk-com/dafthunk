import { NodeExecution, NodeType } from "@dafthunk/types";
import { voronoi } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class VoronoiNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "voronoi",
    name: "Voronoi",
    type: "voronoi",
    description:
      "Takes a collection of points and a bounding box, and returns a collection of Voronoi polygons.",
    tags: ["Geo"],
    icon: "hexagon",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "points",
        type: "geojson",
        description: "Points around which to calculate the Voronoi polygons",
        required: true,
      },
      {
        name: "bbox",
        type: "json",
        description:
          "Clipping rectangle, in [minX, minY, maxX, maxY] order (default: [-180,-85,180,85])",
        required: false,
      },
    ],
    outputs: [
      {
        name: "voronoi",
        type: "geojson",
        description: "A set of polygons, one per input point",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { points, bbox } = context.inputs;

      if (!points) {
        return this.createErrorResult("Missing points input");
      }

      // Prepare options for voronoi calculation
      const options: { bbox?: [number, number, number, number] } = {};

      if (bbox !== undefined && bbox !== null) {
        if (!Array.isArray(bbox)) {
          return this.createErrorResult("Bbox must be an array");
        }

        if (bbox.length !== 4) {
          return this.createErrorResult(
            "Bbox must have exactly 4 elements [minX, minY, maxX, maxY]"
          );
        }

        // Validate that all elements are numbers
        for (let i = 0; i < bbox.length; i++) {
          if (typeof bbox[i] !== "number") {
            return this.createErrorResult(
              `Bbox element at index ${i} must be a number`
            );
          }
        }

        options.bbox = bbox as [number, number, number, number];
      }

      // Delegate everything to Turf.js voronoi function
      const voronoiPolygons = voronoi(points as any, options);

      return this.createSuccessResult({
        voronoi: voronoiPolygons,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating Voronoi polygons: ${error.message}`
      );
    }
  }
}
