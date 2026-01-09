import { NodeExecution, NodeType } from "@dafthunk/types";
import { polygonSmooth } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class PolygonSmoothNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "polygon-smooth",
    name: "Polygon Smooth",
    type: "polygon-smooth",
    description:
      "Smooths a Polygon or MultiPolygon. Based on Chaikin's algorithm. Warning: may create degenerate polygons.",
    tags: ["Geo", "GeoJSON", "Transform", "PolygonSmooth"],
    icon: "circle",
    documentation:
      "This node smooths polygon geometries using Chaikin's algorithm to create more rounded shapes.",
    inlinable: true,
    inputs: [
      {
        name: "polygon",
        type: "geojson",
        description:
          "Input polygon or multipolygon (Feature or Polygon/MultiPolygon geometry)",
        required: true,
      },
      {
        name: "iterations",
        type: "number",
        description: "Number of iterations (default: 1)",
        required: false,
      },
      {
        name: "highQuality",
        type: "boolean",
        description:
          "Whether or not to include extra points in the resulting polygon (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "smoothed",
        type: "geojson",
        description: "Smoothed polygon or multipolygon",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { polygon, iterations, highQuality } = context.inputs;

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Prepare options for polygonSmooth
      const options: { iterations?: number; highQuality?: boolean } = {};

      if (iterations !== undefined && iterations !== null) {
        if (typeof iterations !== "number") {
          return this.createErrorResult("Iterations must be a number");
        }
        if (iterations < 0) {
          return this.createErrorResult(
            "Iterations must be a non-negative number"
          );
        }
        options.iterations = iterations;
      }

      if (highQuality !== undefined && highQuality !== null) {
        if (typeof highQuality !== "boolean") {
          return this.createErrorResult("HighQuality must be a boolean");
        }
        options.highQuality = highQuality;
      }

      // Delegate to Turf.js polygonSmooth function
      const smoothedPolygon = polygonSmooth(polygon as any, options as any);

      return this.createSuccessResult({
        smoothed: smoothedPolygon,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error smoothing polygon: ${error.message}`
      );
    }
  }
}
