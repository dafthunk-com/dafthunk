import { NodeExecution, NodeType } from "@dafthunk/types";
import { transformScale } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class TransformScaleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "transformScale",
    name: "Transform Scale",
    type: "transformScale",
    description:
      "Scales any GeoJSON geometry by a factor around an origin point.",
    tags: ["Geo"],
    icon: "resize",
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

      if (typeof factor !== "number" || !isFinite(factor)) {
        return this.createErrorResult("Factor must be a valid number");
      }

      // Prepare options for scaling
      const options: { origin?: any } = {};

      if (origin !== undefined && origin !== null) {
        options.origin = origin;
      }

      // Delegate to Turf.js transformScale function
      const scaledGeometry = transformScale(
        geojson as any,
        factor,
        options as any
      );

      return this.createSuccessResult({
        scaled: scaledGeometry,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error scaling geometry: ${error.message}`);
    }
  }
}
