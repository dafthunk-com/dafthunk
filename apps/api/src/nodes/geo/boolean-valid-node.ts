import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanValid } from "@turf/turf";

export class BooleanValidNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-valid",
    name: "Boolean Valid",
    type: "boolean-valid",
    description:
      "Checks if the geometry is valid according to the OGC Simple Feature Specification.",
    tags: ["Geo", "GeoJSON", "Boolean", "Valid"],
    icon: "check-circle",
    documentation:
      "This node validates whether a GeoJSON geometry conforms to the OGC Simple Feature Specification.",
    inlinable: true,
    inputs: [
      {
        name: "feature",
        type: "geojson",
        description: "GeoJSON Feature or Geometry to validate",
        required: true,
      },
    ],
    outputs: [
      {
        name: "valid",
        type: "boolean",
        description: "True if the geometry is valid, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { feature } = context.inputs;

      // Delegate everything to Turf.js booleanValid function
      // The function handles null, undefined, and invalid inputs by returning false
      const valid = booleanValid(feature as any);

      return this.createSuccessResult({
        valid,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error validating geometry: ${error.message}`
      );
    }
  }
}
