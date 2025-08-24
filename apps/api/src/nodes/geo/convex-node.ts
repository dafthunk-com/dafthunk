import { NodeExecution, NodeType } from "@dafthunk/types";
import { convex } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class ConvexNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "convex",
    name: "Convex Hull",
    type: "convex",
    description:
      "Creates a convex hull polygon that encompasses all input points.",
    tags: ["Geo"],
    icon: "hexagon",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description:
          "Points, MultiPoint, or FeatureCollection of points to create convex hull from",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the convex hull feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "convexHull",
        type: "geojson",
        description:
          "Convex hull as a Polygon feature, or null if insufficient points",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { geojson, properties } = context.inputs;
    if (!geojson) {
      return this.createErrorResult("Missing GeoJSON input");
    }
    if (
      properties !== undefined &&
      properties !== null &&
      typeof properties !== "object"
    ) {
      return this.createErrorResult("Properties must be an object");
    }
    try {
      // Delegate everything to turf.convex
      const convexHull = convex(geojson as any, properties ?? {});
      return this.createSuccessResult({ convexHull: convexHull ?? null });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating convex hull: ${error.message}`
      );
    }
  }
}
