import { NodeExecution, NodeType } from "@dafthunk/types";
import { featureCollection } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class FeatureCollectionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "feature-collection",
    name: "Feature Collection",
    type: "feature-collection",
    description: "Takes one or more Features and creates a FeatureCollection.",
    tags: ["Geo"],
    icon: "layers",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "features",
        type: "geojson",
        description:
          "Array of GeoJSON Features to combine into a FeatureCollection",
        required: true,
      },
      {
        name: "bbox",
        type: "json",
        description:
          "Bounding Box Array [west, south, east, north] associated with the FeatureCollection",
        required: false,
      },
      {
        name: "id",
        type: "string",
        description: "Identifier associated with the FeatureCollection",
        required: false,
      },
    ],
    outputs: [
      {
        name: "featureCollection",
        type: "geojson",
        description: "FeatureCollection of Features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { features, bbox, id } = context.inputs;

      if (!features) {
        return this.createErrorResult("Missing features input");
      }

      // Prepare options for featureCollection function
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

      // Delegate everything to Turf.js featureCollection function
      const featureCollectionResult = featureCollection(
        features as any,
        options as any
      );

      return this.createSuccessResult({
        featureCollection: featureCollectionResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating feature collection: ${error.message}`
      );
    }
  }
}
