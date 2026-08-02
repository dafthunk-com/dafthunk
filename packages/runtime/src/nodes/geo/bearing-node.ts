import { bearing } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { extractPosition } from "./geo-input";

export class BearingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bearing",
    name: "Bearing",
    type: "bearing",
    description: "Calculates the bearing in degrees between two points",
    tags: ["Geo", "GeoJSON", "Measurement", "Bearing"],
    icon: "compass",
    inlinable: true,
    asTool: false,
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
      const startCoords = extractPosition(start);
      const endCoords = extractPosition(end);

      if (!startCoords) {
        return this.createErrorResult(
          "Invalid start point - must be coordinates [lng, lat] or Point geometry"
        );
      }

      if (!endCoords) {
        return this.createErrorResult(
          "Invalid end point - must be coordinates [lng, lat] or Point geometry"
        );
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
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(
        `Error calculating bearing: ${error.message}`
      );
    }
  }
}
