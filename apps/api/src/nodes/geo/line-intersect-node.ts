import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineIntersect } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class LineIntersectNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-intersect",
    name: "Line Intersect",
    type: "line-intersect",
    description:
      "Takes any LineString or Polygon GeoJSON and returns the intersecting point(s).",
    tags: ["Geo", "GeoJSON", "Geometry", "LineIntersect"],
    icon: "cross",
    documentation:
      "This node finds the intersection points between two LineString or Polygon geometries.",
    inlinable: true,
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
    ],
    outputs: [
      {
        name: "intersections",
        type: "geojson",
        description:
          "FeatureCollection of Point features representing intersections",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line1, line2 } = context.inputs;

      if (!line1) {
        return this.createErrorResult("Missing line1 input");
      }

      if (!line2) {
        return this.createErrorResult("Missing line2 input");
      }

      // Delegate everything to Turf.js lineIntersect function
      const intersectionPoints = lineIntersect(line1 as any, line2 as any);

      return this.createSuccessResult({
        intersections: intersectionPoints,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error finding line intersections: ${error.message}`
      );
    }
  }
}
