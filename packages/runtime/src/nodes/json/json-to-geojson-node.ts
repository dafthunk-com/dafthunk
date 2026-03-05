import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { GeoJSON, NodeExecution, NodeType } from "@dafthunk/types";
import { booleanValid, cleanCoords } from "@dafthunk/runtime/geo";

/**
 * This node converts JSON data to valid GeoJSON format with validation.
 */
export class JsonToGeojsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-to-geojson",
    name: "JSON to GeoJSON",
    type: "json-to-geojson",
    description: "Converts JSON data to valid GeoJSON format with validation.",
    tags: ["Data", "JSON", "Convert", "GeoJSON"],
    icon: "file-json",
    documentation:
      "This node converts JSON data to valid GeoJSON format with validation.",
    inlinable: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "JSON data to convert to GeoJSON.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The validated and converted GeoJSON.",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { inputs } = context;

    try {
      const input = inputs.json;

      if (input === null || input === undefined) {
        return this.createErrorResult("JSON input is required.");
      }

      let parsedData: any;

      // Parse input if it's a string
      if (typeof input === "string") {
        try {
          parsedData = JSON.parse(input);
        } catch (parseError) {
          return this.createErrorResult(
            `Invalid JSON string: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }
      } else if (typeof input === "object") {
        parsedData = input;
      } else {
        return this.createErrorResult(
          `Unsupported input type: ${typeof input}. Expected string or object.`
        );
      }

      // Validate and clean the GeoJSON using Turf.js
      const geojson = this.validateAndCleanGeoJSON(parsedData);

      return this.createSuccessResult({ geojson });
    } catch (error) {
      return this.createErrorResult(
        `Failed to convert JSON to GeoJSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateAndCleanGeoJSON(data: any): GeoJSON {
    if (!data || typeof data !== "object") {
      throw new Error("Input must be an object");
    }

    if (!data.type) {
      throw new Error("Input must have a 'type' property");
    }

    // For FeatureCollection, validate each feature individually
    if (data.type === "FeatureCollection") {
      if (!Array.isArray(data.features)) {
        throw new Error("FeatureCollection must have a 'features' array");
      }

      // Clean and validate each feature in the collection
      const cleanedFeatures = data.features.map((feature: any) => {
        const cleaned = cleanCoords(feature);
        if (!booleanValid(cleaned)) {
          throw new Error("Invalid GeoJSON format in FeatureCollection");
        }
        return cleaned;
      });

      return { ...data, features: cleanedFeatures } as GeoJSON;
    }

    // Clean the coordinates
    const cleaned = cleanCoords(data as any);

    // Validate using booleanValid
    if (!booleanValid(cleaned)) {
      throw new Error("Invalid GeoJSON format");
    }

    return cleaned as GeoJSON;
  }
}
