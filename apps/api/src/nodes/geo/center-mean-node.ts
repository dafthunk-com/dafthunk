import { NodeExecution, NodeType } from "@dafthunk/types";
import { centerMean } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class CenterMeanNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "center-mean",
    name: "Center Mean",
    type: "center-mean",
    description:
      "Takes a Feature or FeatureCollection and returns the mean center, using the mean of the vertices of each feature.",
    tags: ["Geo"],
    icon: "align-center",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "features",
        type: "geojson",
        description: "GeoJSON Feature or FeatureCollection",
        required: true,
      },
      {
        name: "options",
        type: "json",
        description: "Optional parameters for the center calculation",
        required: false,
      },
    ],
    outputs: [
      {
        name: "center",
        type: "geojson",
        description: "A Point feature at the mean center of the input features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { features, options } = context.inputs;

      if (!features) {
        return this.createErrorResult("Missing features input");
      }

      // Delegate everything to Turf.js centerMean function
      const center = centerMean(features as any, options as any);

      return this.createSuccessResult({
        center,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating mean center: ${error.message}`
      );
    }
  }
}
