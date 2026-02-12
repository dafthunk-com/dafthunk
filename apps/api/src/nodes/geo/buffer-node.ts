import { NodeExecution, NodeType } from "@dafthunk/types";
import { buffer } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class BufferNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "buffer",
    name: "Buffer",
    type: "buffer",
    description:
      "Calculates a buffer for input features for a given radius. Units supported are miles, kilometers, and degrees.",
    tags: ["Geo", "GeoJSON", "Transform", "Buffer"],
    icon: "circle",
    documentation:
      "This node creates a buffer zone around a geometry by expanding it outward (or inward with negative radius) by a specified distance.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "Input to be buffered",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description:
          "Distance to draw the buffer (negative values are allowed)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for radius (default: kilometers)",
        required: false,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of steps (default: 8)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "buffered",
        type: "geojson",
        description: "Buffered features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, radius, units, steps } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }
      if (radius === undefined || radius === null) {
        return this.createErrorResult("Missing radius input");
      }

      // Prepare options for buffer
      const options: { units?: string; steps?: number } = {};
      if (units !== undefined && units !== null) {
        options.units = units;
      }
      if (steps !== undefined && steps !== null) {
        options.steps = steps;
      }

      // Buffer the geometry using Turf.js
      const buffered = buffer(geojson as any, radius, options as any);
      return this.createSuccessResult({
        buffered,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error buffering geometry: ${error.message}`
      );
    }
  }
}
