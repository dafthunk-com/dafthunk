import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { feature } from "@turf/turf";

export class FeatureNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "feature",
    name: "Feature",
    type: "feature",
    description: "Wraps a GeoJSON geometry in a GeoJSON Feature.",
    tags: ["Geo", "GeoJSON", "Feature"],
    icon: "map-pin",
    documentation:
      "This node wraps a GeoJSON geometry in a GeoJSON Feature with optional properties and ID.",
    inlinable: true,
    inputs: [
      {
        name: "geometry",
        type: "geojson",
        description: "GeoJSON geometry to wrap in a Feature",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to add to the Feature",
        required: false,
      },
      {
        name: "id",
        type: "string",
        description: "Feature ID",
        required: false,
      },
    ],
    outputs: [
      {
        name: "feature",
        type: "geojson",
        description: "GeoJSON Feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geometry, properties, id } = context.inputs;

      if (!geometry) {
        return this.createErrorResult("Missing geometry input");
      }

      // Prepare options for feature function
      const options: { properties?: any; id?: string | number } = {};

      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        options.properties = properties;
      }

      if (id !== undefined && id !== null) {
        if (typeof id !== "string" && typeof id !== "number") {
          return this.createErrorResult("ID must be a string or number");
        }
        options.id = id;
      }

      // Delegate everything to Turf.js feature function
      const featureResult = feature(
        geometry as any,
        options.properties,
        options
      );

      return this.createSuccessResult({
        feature: featureResult,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error creating feature: ${error.message}`);
    }
  }
}
