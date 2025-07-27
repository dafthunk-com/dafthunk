import { NodeExecution, NodeType } from "@dafthunk/types";
import { polygonize } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class PolygonizeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "polygonize",
    name: "Polygonize",
    type: "polygonize",
    description: "Takes a set of line features and returns a set of polygon features constructed from the lines.",
    tags: ["Geo"],
    icon: "square",
    inputs: [
      {
        name: "lines",
        type: "geojson",
        description: "LineString or MultiLineString features to polygonize",
        required: true,
      },
    ],
    outputs: [
      {
        name: "polygons",
        type: "geojson",
        description: "FeatureCollection of Polygon features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { lines } = context.inputs;

      if (!lines) {
        return this.createErrorResult("Missing lines input");
      }

      // Delegate everything to Turf.js polygonize function
      const polygonFeatures = polygonize(lines as any);

      return this.createSuccessResult({
        polygons: polygonFeatures,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error polygonizing lines: ${error.message}`);
    }
  }
} 