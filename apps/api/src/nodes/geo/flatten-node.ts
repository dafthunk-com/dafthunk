import { NodeExecution, NodeType } from "@dafthunk/types";
import { flatten } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class FlattenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "flatten",
    name: "Flatten",
    type: "flatten",
    description:
      "Flattens any GeoJSON to a FeatureCollection of Point, LineString, or Polygon features.",
    tags: ["Geo", "GeoJSON", "Transform", "Flatten"],
    icon: "layers",
    documentation:
      "This node flattens complex GeoJSON structures into a FeatureCollection of simple Point, LineString, or Polygon features.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "Any GeoJSON object to flatten",
        required: true,
      },
    ],
    outputs: [
      {
        name: "flattened",
        type: "geojson",
        description: "FeatureCollection of flattened features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Delegate everything to Turf.js flatten function
      const flattenedFeatures = flatten(geojson);

      return this.createSuccessResult({
        flattened: flattenedFeatures,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error flattening GeoJSON: ${error.message}`
      );
    }
  }
}
