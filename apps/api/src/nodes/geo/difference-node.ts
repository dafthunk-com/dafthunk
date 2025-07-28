import { NodeExecution, NodeType } from "@dafthunk/types";
import { difference } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class DifferenceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "difference",
    name: "Difference",
    type: "difference",
    description:
      "Returns the difference between two (multi)polygon features as a new (multi)polygon feature.",
    tags: ["Geo"],
    icon: "minus-square",
    inputs: [
      {
        name: "featureCollection",
        type: "geojson",
        description:
          "FeatureCollection containing two polygon or multipolygon features",
        required: true,
      },
    ],
    outputs: [
      {
        name: "difference",
        type: "geojson",
        description:
          "Polygon or multipolygon feature representing the difference (null if no difference)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { featureCollection } = context.inputs;
    if (
      !featureCollection ||
      featureCollection.type !== "FeatureCollection" ||
      !Array.isArray(featureCollection.features) ||
      featureCollection.features.length !== 2
    ) {
      return this.createErrorResult(
        "featureCollection must be a FeatureCollection containing exactly two features"
      );
    }
    try {
      const diff = difference(featureCollection as any);
      return this.createSuccessResult({
        difference: diff || null,
      });
    } catch (err) {
      return this.createErrorResult(
        `Error calculating difference: ${(err as Error).message}`
      );
    }
  }
}
