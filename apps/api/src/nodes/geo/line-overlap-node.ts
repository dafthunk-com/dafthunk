import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineOverlap } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineOverlapNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-overlap",
    name: "Line Overlap",
    type: "line-overlap",
    description:
      "Takes any LineString or Polygon and returns the overlapping lines between both features.",
    tags: ["Geo"],
    icon: "layers",
    inputs: [
      {
        name: "line1",
        type: "geojson",
        description: "First LineString or Polygon feature",
        required: true,
      },
      {
        name: "line2",
        type: "geojson",
        description: "Second LineString or Polygon feature",
        required: true,
      },
      {
        name: "tolerance",
        type: "number",
        description:
          "Tolerance distance to match overlapping line segments in kilometers (default: 0)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "overlaps",
        type: "geojson",
        description:
          "FeatureCollection of LineString features representing overlapping segments",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line1, line2, tolerance } = context.inputs;

      if (!line1) {
        return this.createErrorResult("Missing line1 input");
      }

      if (!line2) {
        return this.createErrorResult("Missing line2 input");
      }

      // Prepare options for lineOverlap
      const options: { tolerance?: number } = {};

      if (tolerance !== undefined && tolerance !== null) {
        if (typeof tolerance !== "number") {
          return this.createErrorResult("Tolerance must be a number");
        }

        if (tolerance < 0) {
          return this.createErrorResult(
            "Tolerance must be a non-negative number"
          );
        }

        options.tolerance = tolerance;
      }

      // Delegate everything to Turf.js lineOverlap function
      const overlapFeatures = lineOverlap(line1 as any, line2 as any, options);

      return this.createSuccessResult({
        overlaps: overlapFeatures,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error finding line overlaps: ${error.message}`
      );
    }
  }
}
