import { NodeExecution, NodeType } from "@dafthunk/types";
import { pointOnFeature } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class PointOnFeatureNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "point-on-feature",
    name: "Point On Feature",
    type: "point-on-feature",
    description:
      "Takes a Feature or FeatureCollection and returns a Point guaranteed to be on the surface of the feature.",
    tags: ["Geo", "GeoJSON", "Geometry", "PointOnFeature"],
    icon: "map-pin",
    documentation:
      "This node finds a random point that lies within a given polygon or on a line.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "Any Feature or FeatureCollection",
        required: true,
      },
    ],
    outputs: [
      {
        name: "point",
        type: "geojson",
        description: "A point on the surface of the input feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Delegate to Turf.js pointOnFeature function
      const pointOnSurface = pointOnFeature(geojson as any);

      return this.createSuccessResult({
        point: pointOnSurface,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating point on feature: ${error.message}`
      );
    }
  }
}
