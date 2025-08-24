import { NodeExecution, NodeType } from "@dafthunk/types";
import { point } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class PointNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "point",
    name: "Point",
    type: "point",
    description:
      "Creates a Point feature from x, y coordinates with optional z.",
    tags: ["Geo"],
    icon: "map-pin",
    documentation: `This node creates a Point feature from x, y coordinates with optional z elevation.

## Usage Example

- **Input x**: \`-73.935242\`
- **Input y**: \`40.730610\`
- **Input z**: \`10\`
- **Output**: \`{"type":"Feature","geometry":{"type":"Point","coordinates":[-73.935242,40.730610,10]},"properties":{}}\``,
    inlinable: true,
    inputs: [
      {
        name: "x",
        type: "number",
        description: "X coordinate (longitude)",
        required: true,
      },
      {
        name: "y",
        type: "number",
        description: "Y coordinate (latitude)",
        required: true,
      },
      {
        name: "z",
        type: "number",
        description: "Z coordinate (elevation) - optional",
        required: false,
      },
    ],
    outputs: [
      {
        name: "point",
        type: "geojson",
        description: "Point feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { x, y, z } = context.inputs;

      // Build coordinates array - include z if provided
      const coordinates = z !== undefined && z !== null ? [x, y, z] : [x, y];

      // Delegate to Turf.js point function - it handles all validation internally
      const pointFeature = point(coordinates);

      return this.createSuccessResult({
        point: pointFeature,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error creating point: ${error.message}`);
    }
  }
}
