import { NodeExecution, NodeType } from "@dafthunk/types";
import { envelope } from "@turf/turf";
import type { AllGeoJSON } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class EnvelopeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "envelope",
    name: "Envelope",
    type: "envelope",
    description: "Calculate the bounding box (envelope) of GeoJSON features as a rectangular polygon",
    tags: ["Geo", "Turf", "Boundary"],
    icon: "square",
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON object to calculate envelope for",
        required: true,
      },
    ],
    outputs: [
      {
        name: "envelope",
        type: "geojson",
        description: "A rectangular polygon that encompasses all vertices",
      },
      {
        name: "bbox",
        type: "json",
        description: "The bounding box coordinates [minX, minY, maxX, maxY]",
        hidden: true,
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
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (!this.isValidGeoJSON(geojson)) {
        return this.createErrorResult("Invalid GeoJSON object provided");
      }

      // Calculate the envelope using Turf.js
      const envelopePolygon = envelope(geojson);

      if (!envelopePolygon || !envelopePolygon.geometry) {
        return this.createErrorResult("Unable to calculate envelope - GeoJSON may be empty or invalid");
      }

      // Extract bounding box coordinates from the envelope polygon
      // Envelope polygon coordinates are in format: [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]]
      const coordinates = envelopePolygon.geometry.coordinates[0];
      const bbox = [
        coordinates[0][0], // minX
        coordinates[0][1], // minY
        coordinates[2][0], // maxX
        coordinates[2][1], // maxY
      ];

      // Check for invalid bbox values (Infinity, -Infinity, NaN) which indicate empty or invalid input
      if (bbox.some(coord => !isFinite(coord))) {
        return this.createErrorResult("Unable to calculate envelope - GeoJSON may be empty or invalid");
      }

      return this.createSuccessResult({
        envelope: envelopePolygon,
        bbox: bbox,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error calculating envelope: ${error.message}`);
    }
  }
} 