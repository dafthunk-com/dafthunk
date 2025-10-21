import { NodeExecution, NodeType } from "@dafthunk/types";
import { multiPolygon } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class MultiPolygonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multipolygon",
    name: "Multi Polygon",
    type: "multipolygon",
    description:
      "Creates a Feature<MultiPolygon> based on a coordinate array. Properties can be added optionally.",
    tags: ["Geo", "GeoJSON", "MultiPolygon"],
    icon: "layers",
    documentation:
      "This node creates a MultiPolygon geometry from multiple polygon geometries.",
    inlinable: true,
    inputs: [
      {
        name: "coordinates",
        type: "geojson",
        description: "Array of Polygon coordinate arrays",
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
        name: "multiPolygon",
        type: "geojson",
        description: "A GeoJSON MultiPolygon Feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { coordinates, properties, bbox, id } = context.inputs;

      if (!coordinates) {
        return this.createErrorResult("Missing coordinates input");
      }

      // Prepare options for multiPolygon function
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

      // Delegate everything to Turf.js multiPolygon function
      const multiPolygonResult = multiPolygon(
        coordinates as any,
        properties as any,
        options as any
      );

      return this.createSuccessResult({
        multiPolygon: multiPolygonResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating multi polygon: ${error.message}`
      );
    }
  }
}
