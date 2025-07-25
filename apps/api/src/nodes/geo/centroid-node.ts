import { NodeExecution, NodeType } from "@dafthunk/types";
import { centroid } from "@turf/turf";
import type { AllGeoJSON } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class CentroidNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "centroid",
    name: "Centroid",
    type: "centroid",
    description: "Calculate the centroid point as the mean of all vertices within a GeoJSON object",
    tags: ["Geo", "Turf", "Center"],
    icon: "crosshairs",
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON object to calculate centroid for",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Optional properties to attach to the centroid feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "centroid",
        type: "geojson",
        description: "A Point feature representing the centroid of the input",
      },
    ],
  };

  private isValidGeoJSON(geojson: any): geojson is AllGeoJSON {
    if (!geojson || typeof geojson !== "object") {
      return false;
    }

    // Check for required type property
    if (!geojson.type) {
      return false;
    }

    // Valid GeoJSON types
    const validTypes = [
      "Point", "MultiPoint", "LineString", "MultiLineString",
      "Polygon", "MultiPolygon", "GeometryCollection",
      "Feature", "FeatureCollection"
    ];

    return validTypes.includes(geojson.type);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, properties } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (!this.isValidGeoJSON(geojson)) {
        return this.createErrorResult("Invalid GeoJSON object provided");
      }

      // Prepare options for centroid calculation
      const options: { properties?: any } = {};
      if (properties && typeof properties === "object") {
        options.properties = properties;
      }

      // Calculate the centroid using Turf.js
      const centroidPoint = centroid(geojson, options);

      if (!centroidPoint || !centroidPoint.geometry || !centroidPoint.geometry.coordinates) {
        return this.createErrorResult("Unable to calculate centroid - GeoJSON may be empty or invalid");
      }

      return this.createSuccessResult({
        centroid: centroidPoint,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error calculating centroid: ${error.message}`);
    }
  }
} 