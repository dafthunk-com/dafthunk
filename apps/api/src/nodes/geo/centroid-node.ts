import { NodeExecution, NodeType } from "@dafthunk/types";
import { centroid } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class CentroidNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "centroid",
    name: "Centroid",
    type: "centroid",
    description:
      "Computes the centroid as the mean of all vertices within the object.",
    tags: ["Geo", "GeoJSON", "Measurement", "Centroid"],
    icon: "target",
    documentation:
      "This node computes the centroid as the mean of all vertices within the object.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON to be centered",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to assign to the centroid point feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "centroid",
        type: "geojson",
        description: "The centroid of the input object",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, properties } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Prepare options object for Turf.js centroid function
      const options = properties ? { properties } : {};

      // Delegate to Turf.js centroid function
      const centroidPoint = centroid(geojson, options);

      return this.createSuccessResult({
        centroid: centroidPoint,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating centroid: ${error.message}`
      );
    }
  }
}
