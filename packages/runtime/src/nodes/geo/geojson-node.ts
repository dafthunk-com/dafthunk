import { booleanValid } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  NodeExecution,
  NodeType,
} from "@dafthunk/types";
import { isGeoJSON } from "./geo-input";

export class GeoJsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geojson",
    name: "GeoJSON",
    type: "geojson",
    description: "Parse any valid GeoJSON object from JSON input",
    tags: ["Geo", "GeoJSON"],
    icon: "map",
    documentation:
      "This node parses and validates GeoJSON objects from JSON input.",
    inlinable: true,
    asTool: false,
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
        description:
          "The type of GeoJSON (Point, LineString, Feature, FeatureCollection, etc.)",
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
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(`Error parsing GeoJSON: ${error.message}`);
    }
  }

  private isValidGeoJSON(data: unknown): boolean {
    if (!isGeoJSON(data)) {
      return false;
    }

    // booleanValid only understands a single geometry or feature, so the two
    // collection types are validated member by member. `Geometry.type` is a
    // plain string, so the union does not discriminate on its own.
    if (data.type === "FeatureCollection") {
      const { features } = data as FeatureCollection;
      return Array.isArray(features) && features.every((f) => booleanValid(f));
    }

    if (data.type === "GeometryCollection") {
      const { geometries } = data as GeometryCollection;
      return (
        Array.isArray(geometries) && geometries.every((g) => booleanValid(g))
      );
    }

    return booleanValid(data as Feature | Geometry);
  }
}
