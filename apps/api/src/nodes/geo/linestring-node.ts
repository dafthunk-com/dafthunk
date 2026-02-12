import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineString } from "@turf/turf";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class LineStringNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "lineString",
    name: "LineString",
    type: "lineString",
    description:
      "Creates a LineString feature from an array of coordinate pairs.",
    tags: ["Geo", "GeoJSON", "LineString"],
    icon: "route",
    documentation:
      "This node creates a LineString feature from an array of coordinate pairs.",
    inlinable: true,
    inputs: [
      {
        name: "coordinates",
        type: "json",
        description:
          "Array of coordinate pairs [[lon1, lat1], [lon2, lat2], ...]",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "lineString",
        type: "geojson",
        description: "LineString feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { coordinates, properties } = context.inputs;

      // Delegate everything to Turf.js lineString function
      const lineStringFeature = lineString(coordinates, properties);

      return this.createSuccessResult({
        lineString: lineStringFeature,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating LineString: ${error.message}`
      );
    }
  }
}
