import { NodeExecution, NodeType } from "@dafthunk/types";
import { buffer } from "@turf/turf";
import type { AllGeoJSON } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BufferNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "buffer",
    name: "Buffer",
    type: "buffer",
    description: "Calculates a buffer for input features for a given radius. Units supported are miles, kilometers, and degrees.",
    tags: ["Geo", "Turf", "Buffer", "Transform"],
    icon: "circle-dot",
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON object to buffer",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description: "Distance to draw the buffer (negative values are allowed)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the buffer distance",
        required: false,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of steps for buffer calculation",
        required: false,
      },
    ],
    outputs: [
      {
        name: "buffer",
        type: "geojson",
        description: "The buffered features as FeatureCollection or Feature",
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

  private isValidUnits(units: string): boolean {
    const validUnits = [
      "meters", "metres", "millimeters", "millimetres", "centimeters", "centimetres",
      "kilometers", "kilometres", "miles", "nauticalmiles", "inches", "yards", "feet",
      "radians", "degrees"
    ];
    return validUnits.includes(units.toLowerCase());
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, radius, units, steps } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (radius === undefined || radius === null) {
        return this.createErrorResult("Missing radius input");
      }

      if (typeof radius !== "number" || !isFinite(radius)) {
        return this.createErrorResult("Radius must be a valid number");
      }

      if (!this.isValidGeoJSON(geojson)) {
        return this.createErrorResult("Invalid GeoJSON object provided");
      }

      // Prepare options for buffer calculation
      const options: { units?: string; steps?: number } = {};
      
      // Set units with validation (default: "kilometers")
      if (units !== undefined && units !== null) {
        if (typeof units !== "string" || !this.isValidUnits(units)) {
          return this.createErrorResult("Invalid units. Supported units are: meters, kilometers, miles, degrees, etc.");
        }
        options.units = units;
      } else {
        options.units = "kilometers";
      }

      // Set steps with validation (default: 8)
      if (steps !== undefined && steps !== null) {
        if (typeof steps !== "number" || !isFinite(steps) || steps < 1) {
          return this.createErrorResult("Steps must be a positive number");
        }
        options.steps = Math.floor(steps);
      } else {
        options.steps = 8;
      }

      // Calculate the buffer using Turf.js
      const bufferedGeometry = buffer(geojson as any, radius, options as any);

      if (!bufferedGeometry) {
        return this.createErrorResult("Unable to calculate buffer - the resulting geometry may be invalid (try using a larger radius for negative buffers)");
      }

      return this.createSuccessResult({
        buffer: bufferedGeometry,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error calculating buffer: ${error.message}`);
    }
  }
} 