import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanWithin } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BooleanWithinNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-within",
    name: "Boolean Within",
    type: "boolean-within",
    description:
      "Returns true if the first geometry is completely within the second geometry.",
    tags: ["Geo"],
    icon: "mouse-pointer-2",
    documentation: `This node checks if one geometry is completely within another geometry.

## Usage Example

- **Input**: Two GeoJSON geometries
- **Output**: \`true\` or \`false\`

The node determines if the first geometry is entirely contained within the second geometry.`,
    inlinable: true,
    inputs: [
      {
        name: "feature1",
        type: "geojson",
        description:
          "First GeoJSON Feature or Geometry (the one to check if it's within)",
        required: true,
      },
      {
        name: "feature2",
        type: "geojson",
        description: "Second GeoJSON Feature or Geometry (the container)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "within",
        type: "boolean",
        description:
          "True if feature1 is completely within feature2, false otherwise",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { feature1, feature2 } = context.inputs;

      if (!feature1) {
        return this.createErrorResult("Missing feature1 input");
      }

      if (!feature2) {
        return this.createErrorResult("Missing feature2 input");
      }

      // Delegate everything to Turf.js booleanWithin function
      const within = booleanWithin(feature1 as any, feature2 as any);

      return this.createSuccessResult({
        within,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking if feature is within: ${error.message}`
      );
    }
  }
}
