import { NodeExecution, NodeType } from "@dafthunk/types";
import { geometryCollection } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class GeometryCollectionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geometry-collection",
    name: "Geometry Collection",
    type: "geometry-collection",
    description:
      "Creates a Feature<GeometryCollection> based on a coordinate array. Properties can be added optionally.",
    tags: ["Geo"],
    icon: "layers",
    inputs: [
      {
        name: "geometries",
        type: "geojson",
        description:
          "Array of GeoJSON Geometries to combine into a GeometryCollection",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Object of key-value pairs to add as properties",
        required: false,
      },
      {
        name: "bbox",
        type: "json",
        description:
          "Bounding Box Array [west, south, east, north] associated with the Feature",
        required: false,
      },
      {
        name: "id",
        type: "string",
        description: "Identifier associated with the Feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "geometryCollection",
        type: "geojson",
        description: "A GeoJSON GeometryCollection Feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geometries, properties, bbox, id } = context.inputs;

      if (!geometries) {
        return this.createErrorResult("Missing geometries input");
      }

      // Prepare options for geometryCollection function
      const options: { bbox?: number[]; id?: string | number } = {};

      if (bbox !== undefined && bbox !== null) {
        if (!Array.isArray(bbox)) {
          return this.createErrorResult("Bbox must be an array");
        }

        if (bbox.length !== 4) {
          return this.createErrorResult(
            "Bbox must be an array of 4 numbers [west, south, east, north]"
          );
        }

        for (let i = 0; i < bbox.length; i++) {
          if (typeof bbox[i] !== "number") {
            return this.createErrorResult("All bbox values must be numbers");
          }
        }

        options.bbox = bbox;
      }

      if (id !== undefined && id !== null) {
        if (typeof id !== "string" && typeof id !== "number") {
          return this.createErrorResult("ID must be a string or number");
        }
        options.id = id;
      }

      // Delegate everything to Turf.js geometryCollection function
      const geometryCollectionResult = geometryCollection(
        geometries as any,
        properties as any,
        options as any
      );

      return this.createSuccessResult({
        geometryCollection: geometryCollectionResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating geometry collection: ${error.message}`
      );
    }
  }
}
