import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanPointInPolygon } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class BooleanPointInPolygonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "booleanPointInPolygon",
    name: "Point In Polygon",
    type: "booleanPointInPolygon",
    description: "Tests whether a point is inside a polygon.",
    tags: ["Geo", "GeoJSON", "Boolean", "PointInPolygon"],
    icon: "locate",
    documentation:
      "This node tests whether a point is located inside a polygon geometry.",
    inlinable: true,
    inputs: [
      {
        name: "point",
        type: "geojson",
        description: "Point to test (Point feature or coordinates)",
        required: true,
      },
      {
        name: "polygon",
        type: "geojson",
        description:
          "Polygon to test against (Polygon or MultiPolygon feature)",
        required: true,
      },
      {
        name: "ignoreBoundary",
        type: "boolean",
        description:
          "Whether to ignore if point is on polygon boundary (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "inside",
        type: "boolean",
        description: "True if point is inside polygon, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { point, polygon, ignoreBoundary } = context.inputs;
      if (!point) {
        return this.createErrorResult("Missing point input");
      }
      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }
      // Directly delegate to turf.booleanPointInPolygon
      const isInside = booleanPointInPolygon(point, polygon, {
        ignoreBoundary,
      });
      return this.createSuccessResult({ inside: isInside });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error testing point in polygon: ${error.message}`
      );
    }
  }
}
