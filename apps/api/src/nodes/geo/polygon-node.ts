import { NodeExecution, NodeType } from "@dafthunk/types";
import { polygon } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class PolygonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "polygon",
    name: "Polygon",
    type: "polygon",
    description:
      "Creates a Polygon feature from an array of coordinate rings (exterior ring and optional holes).",
    tags: ["Geo"],
    icon: "square",
    documentation:
      "This node creates a Polygon feature from an array of coordinate rings (exterior ring and optional holes).",
    inlinable: true,
    inputs: [
      {
        name: "coordinates",
        type: "json",
        description:
          "Array of rings, where first ring is exterior and rest are holes [[[lon1, lat1], [lon2, lat2], ...]]",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { coordinates, properties } = context.inputs;

      if (!coordinates) {
        return this.createErrorResult("Missing coordinates input");
      }

      // Prepare properties for polygon
      let polygonProperties = {};
      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        polygonProperties = properties;
      }

      // Create the polygon using Turf.js - let it handle validation
      const polygonFeature = polygon(coordinates, polygonProperties);

      return this.createSuccessResult({
        polygon: polygonFeature,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error creating Polygon: ${error.message}`);
    }
  }
}
