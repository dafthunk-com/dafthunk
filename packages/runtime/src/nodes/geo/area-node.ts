import { area } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { isGeoJSONOf } from "./geo-input";

export class AreaNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "area",
    name: "Area",
    type: "area",
    description:
      "Calculates the area of polygons or feature collections in square meters",
    tags: ["Geo", "GeoJSON", "Measurement", "Area"],
    icon: "square",
    inlinable: true,
    asTool: false,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON feature(s) to calculate area for",
        required: true,
      },
    ],
    outputs: [
      {
        name: "area",
        type: "number",
        description: "Area in square meters",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (
        !isGeoJSONOf(
          geojson,
          "Polygon",
          "MultiPolygon",
          "FeatureCollection",
          "GeometryCollection"
        )
      ) {
        return this.createErrorResult(
          "Invalid GeoJSON provided - must be a Polygon, MultiPolygon, Feature, or FeatureCollection"
        );
      }

      // Calculate the area using Turf.js
      const calculatedArea = area(geojson);

      return this.createSuccessResult({
        area: calculatedArea,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(`Error calculating area: ${error.message}`);
    }
  }
}
