import { NodeExecution, NodeType } from "@dafthunk/types";
import { bearing } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BearingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bearing",
    name: "Bearing",
    type: "bearing",
    description: "Calculates the bearing in degrees between two points.",
    tags: ["Geo"],
    icon: "compass",
    inputs: [
      {
        name: "start",
        type: "geojson",
        description: "Starting point coordinates [lng, lat]",
        required: true,
      },
      {
        name: "end",
        type: "geojson",
        description: "Ending point coordinates [lng, lat]",
        required: true,
      },
      {
        name: "final",
        type: "boolean",
        description: "Calculate final bearing if true (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bearing",
        type: "number",
        description: "Bearing in decimal degrees, between -180 and 180 degrees",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { start, end, final } = context.inputs;

      if (!start) {
        return this.createErrorResult("Missing start point input");
      }

      if (!end) {
        return this.createErrorResult("Missing end point input");
      }

      // Extract coordinates from GeoJSON if needed
      const startCoords = this.extractCoordinates(start);
      const endCoords = this.extractCoordinates(end);

      if (!startCoords) {
        return this.createErrorResult("Invalid start point - must be coordinates [lng, lat] or Point geometry");
      }

      if (!endCoords) {
        return this.createErrorResult("Invalid end point - must be coordinates [lng, lat] or Point geometry");
      }

      // Validate final parameter
      if (final !== undefined && final !== null && typeof final !== "boolean") {
        return this.createErrorResult("Final parameter must be a boolean");
      }

      // Calculate bearing using Turf.js
      const calculatedBearing = bearing(startCoords, endCoords, { final });

      return this.createSuccessResult({
        bearing: calculatedBearing,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error calculating bearing: ${error.message}`);
    }
  }

  private extractCoordinates(input: any): [number, number] | null {
    // If input is already coordinates array
    if (Array.isArray(input) && input.length >= 2) {
      return [input[0], input[1]];
    }

    // If input is a Point geometry
    if (input?.type === "Point" && Array.isArray(input.coordinates)) {
      return [input.coordinates[0], input.coordinates[1]];
    }

    // If input is a Feature with Point geometry
    if (input?.type === "Feature" && input.geometry?.type === "Point") {
      return [input.geometry.coordinates[0], input.geometry.coordinates[1]];
    }

    return null;
  }
} 