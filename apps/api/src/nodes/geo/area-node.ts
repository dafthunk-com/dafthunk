import { NodeExecution, NodeType } from "@dafthunk/types";
import type { AllGeoJSON } from "@turf/turf";
import { area } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class AreaNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "area",
    name: "Area",
    type: "area",
    description:
      "Calculates the area of polygons or feature collections in square meters.",
    tags: ["Geo", "GeoJSON", "Measurement", "Area"],
    icon: "square",
    documentation:
      "This node calculates the area of polygons or feature collections in square meters.",
    inlinable: true,
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

  private isValidGeoJSON(geojson: any): geojson is AllGeoJSON {
    if (!geojson || typeof geojson !== "object") {
      return false;
    }

    const validTypes = [
      "Feature",
      "FeatureCollection",
      "Polygon",
      "MultiPolygon",
    ];
    return validTypes.includes(geojson.type);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (!this.isValidGeoJSON(geojson)) {
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
      const error = err as Error;
      return this.createErrorResult(`Error calculating area: ${error.message}`);
    }
  }
}
