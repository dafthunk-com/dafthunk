import { NodeExecution, NodeType } from "@dafthunk/types";
import { multiPoint } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class MultiPointNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multipoint",
    name: "Multi Point",
    type: "multipoint",
    description:
      "Creates a Feature<MultiPoint> based on a coordinate array. Properties can be added optionally.",
    tags: ["Geo", "GeoJSON", "MultiPoint"],
    icon: "map-pin",
    documentation:
      "This node creates a MultiPoint GeoJSON feature from an array of coordinate pairs.",
    inlinable: true,
    inputs: [
      {
        name: "coordinates",
        type: "geojson",
        description: "Array of Point coordinate arrays",
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
        name: "multiPoint",
        type: "geojson",
        description: "A GeoJSON MultiPoint Feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { coordinates, properties, bbox, id } = context.inputs;

      if (!coordinates) {
        return this.createErrorResult("Missing coordinates input");
      }

      // Prepare options for multiPoint function
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

      // Delegate everything to Turf.js multiPoint function
      const multiPointResult = multiPoint(
        coordinates as any,
        properties as any,
        options as any
      );

      return this.createSuccessResult({
        multiPoint: multiPointResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating multi point: ${error.message}`
      );
    }
  }
}
