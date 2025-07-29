import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * ToGeoJSON node implementation
 * This node converts various input types to GeoJSON format.
 */
export class ToGeoJsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "to-geojson",
    name: "To GeoJSON",
    type: "to-geojson",
    description:
      "Converts coordinates, geometry, or location data to GeoJSON format",
    tags: ["Text", "Geo"],
    icon: "map",
    inputs: [
      {
        name: "input",
        type: "any",
        description:
          "Input data to convert to GeoJSON (coordinates, geometry object, or location data)",
        required: true,
      },
      {
        name: "geometryType",
        type: "string",
        description: "Type of geometry to create (Point, LineString, Polygon)",
        required: false,
        value: "Point",
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to include in the GeoJSON feature",
        required: false,
        value: {},
      },
    ],
    outputs: [
      {
        name: "result",
        type: "geojson",
        description: "The GeoJSON representation of the input",
      },
    ],
  };

  private isValidCoordinate(
    coord: any
  ): coord is [number, number] | [number, number, number] {
    return (
      Array.isArray(coord) &&
      (coord.length === 2 || coord.length === 3) &&
      coord.every((c) => typeof c === "number" && !isNaN(c))
    );
  }

  private parseCoordinatesFromString(input: string): [number, number] | null {
    // Try to parse common coordinate formats:
    // "lat,lng" or "lng,lat" or "lat lng" or "lng lat"
    const patterns = [
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/, // "lat,lng"
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/, // "lat lng"
    ];

    for (const pattern of patterns) {
      const match = input.trim().match(pattern);
      if (match) {
        const a = parseFloat(match[1]);
        const b = parseFloat(match[2]);
        if (!isNaN(a) && !isNaN(b)) {
          // Assume longitude, latitude order for GeoJSON
          return Math.abs(a) <= 180 && Math.abs(b) <= 90 ? [a, b] : [b, a];
        }
      }
    }

    return null;
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { input, geometryType = "Point", properties = {} } = context.inputs;

      if (input === undefined || input === null) {
        return this.createErrorResult("Input is required");
      }

      let coordinates: any;
      let actualGeometryType = geometryType;

      // Handle different input types
      if (typeof input === "string") {
        // Try to parse coordinates from string
        const parsed = this.parseCoordinatesFromString(input);
        if (parsed) {
          coordinates = parsed;
          actualGeometryType = "Point";
        } else {
          return this.createErrorResult(
            "Unable to parse coordinates from string. Expected format: 'lat,lng' or 'lng,lat'"
          );
        }
      } else if (Array.isArray(input)) {
        // Handle array inputs
        if (input.length === 2 && this.isValidCoordinate(input)) {
          // Single coordinate pair
          coordinates = input;
          actualGeometryType = "Point";
        } else if (
          input.length > 2 &&
          input.every((coord) => this.isValidCoordinate(coord))
        ) {
          // Array of coordinates
          coordinates = input;
          actualGeometryType =
            geometryType === "Point" ? "LineString" : geometryType;
        } else {
          return this.createErrorResult("Invalid coordinate array format");
        }
      } else if (typeof input === "object") {
        // Handle object inputs
        if (input.type && input.coordinates) {
          // Already a geometry object
          coordinates = input.coordinates;
          actualGeometryType = input.type;
        } else if (input.lat !== undefined && input.lng !== undefined) {
          // Object with lat/lng properties
          const lat = parseFloat(input.lat);
          const lng = parseFloat(input.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = [lng, lat]; // GeoJSON uses [lng, lat]
            actualGeometryType = "Point";
          } else {
            return this.createErrorResult("Invalid lat/lng values in object");
          }
        } else if (
          input.longitude !== undefined &&
          input.latitude !== undefined
        ) {
          // Object with longitude/latitude properties
          const lat = parseFloat(input.latitude);
          const lng = parseFloat(input.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = [lng, lat]; // GeoJSON uses [lng, lat]
            actualGeometryType = "Point";
          } else {
            return this.createErrorResult(
              "Invalid longitude/latitude values in object"
            );
          }
        } else {
          return this.createErrorResult(
            "Unrecognized object format. Expected lat/lng, latitude/longitude, or geometry object"
          );
        }
      } else {
        return this.createErrorResult(
          "Input must be a string, array, or object"
        );
      }

      // Create GeoJSON geometry
      const geometry = {
        type: actualGeometryType,
        coordinates: coordinates,
      };

      // Create GeoJSON feature
      const result = {
        type: "Feature",
        geometry: geometry,
        properties: properties || {},
      };

      return this.createSuccessResult({
        result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
