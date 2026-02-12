import { NodeExecution, NodeType } from "@dafthunk/types";
import { kinks } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class KinksNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "kinks",
    name: "Kinks",
    type: "kinks",
    description:
      "Takes a LineString or Polygon and returns the points at all self-intersections.",
    tags: ["Geo", "GeoJSON", "Geometry", "Kinks"],
    icon: "zap",
    documentation:
      "This node finds self-intersection points (kinks) in LineString or Polygon geometries.",
    inlinable: true,
    inputs: [
      {
        name: "line",
        type: "geojson",
        description: "LineString or Polygon feature to find kinks in",
        required: true,
      },
    ],
    outputs: [
      {
        name: "kinks",
        type: "geojson",
        description: "FeatureCollection of Point features representing kinks",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      // Delegate everything to Turf.js kinks function
      const kinkPoints = kinks(line as any);

      return this.createSuccessResult({
        kinks: kinkPoints,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error finding kinks: ${error.message}`);
    }
  }
}
