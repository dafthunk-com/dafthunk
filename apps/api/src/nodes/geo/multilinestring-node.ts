import { NodeExecution, NodeType } from "@dafthunk/types";
import { multiLineString } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class MultiLineStringNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multi-line-string",
    name: "Multi Line String",
    type: "multi-line-string",
    description:
      "Creates a Feature<MultiLineString> based on a coordinate array. Properties can be added optionally.",
    tags: ["Geo", "GeoJSON", "MultiLineString"],
    icon: "route",
    documentation:
      "This node creates a MultiLineString geometry from multiple line geometries.",
    inlinable: true,
    inputs: [
      {
        name: "coordinates",
        type: "geojson",
        description: "Array of LineString coordinate arrays",
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
        name: "multiLineString",
        type: "geojson",
        description: "A GeoJSON MultiLineString Feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { coordinates, properties, bbox, id } = context.inputs;

      if (!coordinates) {
        return this.createErrorResult("Missing coordinates input");
      }

      // Prepare options for multiLineString function
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

      // Delegate everything to Turf.js multiLineString function
      const multiLineStringResult = multiLineString(
        coordinates as any,
        properties as any,
        options as any
      );

      return this.createSuccessResult({
        multiLineString: multiLineStringResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating multi line string: ${error.message}`
      );
    }
  }
}
