import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineSegment } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineSegmentNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-segment",
    name: "Line Segment",
    type: "line-segment",
    description:
      "Creates a FeatureCollection of 2-vertex LineString segments from a (Multi)LineString or (Multi)Polygon.",
    tags: ["Geo"],
    icon: "git-branch",
    documentation:
      "This node breaks down a LineString or Polygon into individual 2-vertex line segments.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON Polygon or LineString to segment",
        required: true,
      },
    ],
    outputs: [
      {
        name: "segments",
        type: "geojson",
        description: "FeatureCollection of 2-vertex LineString segments",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }

      // Delegate everything to Turf.js lineSegment function
      const segmentFeatures = lineSegment(geojson as any);

      return this.createSuccessResult({
        segments: segmentFeatures,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating line segments: ${error.message}`
      );
    }
  }
}
