import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { union } from "@turf/turf";

export class UnionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "union",
    name: "Union",
    type: "union",
    description:
      "Takes a collection of input polygons and returns a combined polygon. If the input polygons are not contiguous, this function returns a multi-polygon feature.",
    tags: ["Geo", "GeoJSON", "Transform", "Union"],
    icon: "circle-plus",
    documentation:
      "This node combines multiple polygon features into a single unified geometry using the union operation.",
    inlinable: true,
    inputs: [
      {
        name: "features",
        type: "geojson",
        description:
          "Input polygon features (FeatureCollection of Polygon or MultiPolygon)",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the result feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "union",
        type: "geojson",
        description: "Union result as a Polygon or MultiPolygon feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { features, properties } = context.inputs;

      if (!features) {
        return this.createErrorResult("Missing features input");
      }

      // Validate that features is a FeatureCollection
      if (
        features.type !== "FeatureCollection" ||
        !Array.isArray(features.features)
      ) {
        return this.createErrorResult("Features must be a FeatureCollection");
      }

      // Validate that all features are polygons
      for (const feature of features.features) {
        if (feature.type !== "Feature" || !feature.geometry) {
          return this.createErrorResult(
            "All features must be valid GeoJSON Features"
          );
        }
        if (!["Polygon", "MultiPolygon"].includes(feature.geometry.type)) {
          return this.createErrorResult(
            "All features must be Polygon or MultiPolygon geometries"
          );
        }
      }

      // Prepare properties for result
      const options =
        properties && typeof properties === "object" ? { properties } : {};

      // Calculate the union using Turf.js
      const unionResult = union(features as any, options);

      if (!unionResult) {
        return this.createErrorResult(
          "Unable to calculate union - no valid polygons to combine"
        );
      }

      return this.createSuccessResult({
        union: unionResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating union: ${error.message}`
      );
    }
  }
}
