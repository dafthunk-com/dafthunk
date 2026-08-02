import { transformScale } from "@dafthunk/geo";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { GeoPosition } from "./geo-input";

export class TransformScaleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "transform-scale",
    name: "Transform Scale",
    type: "transform-scale",
    description:
      "Scales any GeoJSON geometry by a factor around an origin point",
    tags: ["Geo", "GeoJSON", "Transform", "Scale"],
    icon: "maximize",
    documentation:
      "This node scales a GeoJSON geometry by a specified factor around an origin point.",
    inlinable: true,
    asTool: false,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to scale",
        required: true,
      },
      {
        name: "factor",
        type: "number",
        description:
          "Scale factor (1 = no change, 2 = double size, 0.5 = half size)",
        required: true,
      },
      {
        name: "origin",
        type: "geojson",
        description:
          "Point around which to scale (default: centroid of geometry)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "scaled",
        type: "geojson",
        description: "Scaled geometry or feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, factor, origin } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (factor === undefined || factor === null) {
        return this.createErrorResult("Missing factor input");
      }

      if (typeof factor !== "number" || !Number.isFinite(factor)) {
        return this.createErrorResult("Factor must be a valid number");
      }

      // Prepare options for scaling
      const options: { origin?: GeoPosition } = {};

      if (origin !== undefined && origin !== null) {
        options.origin = origin;
      }

      // Delegate to Turf.js transformScale function
      const scaledGeometry = transformScale(geojson, factor, options);

      return this.createSuccessResult({
        scaled: scaledGeometry,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return this.createErrorResult(`Error scaling geometry: ${error.message}`);
    }
  }
}
