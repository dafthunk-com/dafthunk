import { NodeExecution, NodeType } from "@dafthunk/types";
import { unkinkPolygon } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class UnkinkPolygonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "unkink-polygon",
    name: "Unkink Polygon",
    type: "unkink-polygon",
    description:
      "Takes a kinked polygon and returns a feature collection of polygons that have no kinks.",
    tags: ["Geo", "GeoJSON", "Transform", "UnkinkPolygon"],
    icon: "scissors",
    documentation:
      "This node removes self-intersections (kinks) from a polygon by splitting it into multiple valid polygons.",
    inlinable: true,
    inputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon to unkink",
        required: true,
      },
    ],
    outputs: [
      {
        name: "unkinked",
        type: "geojson",
        description: "FeatureCollection of polygons without kinks",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { polygon } = context.inputs;

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Delegate everything to Turf.js unkinkPolygon function
      const unkinkedPolygons = unkinkPolygon(polygon as any);

      return this.createSuccessResult({
        unkinked: unkinkedPolygons,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error unkinking polygon: ${error.message}`
      );
    }
  }
}
