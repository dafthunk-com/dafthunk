import { NodeExecution, NodeType } from "@dafthunk/types";
import { combine } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class CombineNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "combine",
    name: "Combine",
    type: "combine",
    description:
      "Combines features into MultiPoint, MultiLineString, or MultiPolygon features.",
    tags: ["Geo", "GeoJSON", "Transform", "Combine"],
    icon: "layers",
    documentation:
      "This node combines multiple GeoJSON geometries into a single geometry.",
    inlinable: true,
    inputs: [
      {
        name: "featureCollection",
        type: "geojson",
        description: "FeatureCollection of features to combine",
        required: true,
      },
    ],
    outputs: [
      {
        name: "combined",
        type: "geojson",
        description: "FeatureCollection with combined multigeometry features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { featureCollection } = context.inputs;
      if (!featureCollection) {
        return this.createErrorResult("Missing FeatureCollection input");
      }
      const combinedFeatures = combine(featureCollection);
      return this.createSuccessResult({
        combined: combinedFeatures,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error combining features: ${error.message}`
      );
    }
  }
}
