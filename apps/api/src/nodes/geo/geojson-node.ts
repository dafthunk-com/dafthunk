import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanValid } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class GeoJsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geojson",
    name: "GeoJSON",
    type: "geojson",
    description: "Parse any valid GeoJSON object from JSON input.",
    tags: ["Geo"],
    icon: "map",
    inlinable: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The GeoJSON geometry object to parse",
        required: true,
      },
    ],
    outputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The parsed GeoJSON object",
      },
      {
        name: "geojsonType",
        type: "string",
        description: "The type of GeoJSON (Point, LineString, Feature, FeatureCollection, etc.)",
        hidden: true,
      },
    ],
  };



  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json } = context.inputs;

      if (!json || typeof json !== "object") {
        return this.createErrorResult("Invalid or missing JSON input");
      }

      // Check if it's a valid GeoJSON object
      const isValid = this.isValidGeoJSON(json);

      if (isValid) {
        return this.createSuccessResult({
          geojson: json,
          geojsonType: json.type,
        });
      }

      return this.createErrorResult("Invalid GeoJSON");
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error parsing GeoJSON: ${error.message}`
      );
    }
  }

  private isValidGeoJSON(data: any): boolean {
    // For FeatureCollection, validate each feature individually
    if (data.type === "FeatureCollection") {
      if (!Array.isArray(data.features)) {
        return false;
      }
      
      // Validate each feature in the collection
      for (const feature of data.features) {
        if (!booleanValid(feature)) {
          return false;
        }
      }
      
      return true;
    }

    // For other types, use Turf.js booleanValid
    return booleanValid(data as any);
  }
}
