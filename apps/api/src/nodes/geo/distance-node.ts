import { NodeExecution, NodeType } from "@dafthunk/types";
import { distance } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class DistanceNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "distance",
    name: "Distance",
    type: "distance",
    description: "Calculates the distance between two points.",
    tags: ["Geo"],
    icon: "ruler",
    documentation: `This node calculates the distance between two points.

## Usage Example

- **Input**: 
\`\`\`
{
  "from": {"type": "Point", "coordinates": [0, 0]},
  "to": {"type": "Point", "coordinates": [1, 1]},
  "units": "kilometers"
}
\`\`\`
- **Output**: \`157.2\` (distance in kilometers)`,
    inlinable: true,
    inputs: [
      {
        name: "from",
        type: "geojson",
        description: "Starting point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "to",
        type: "geojson",
        description: "Ending point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the distance measurement (default: kilometers)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "distance",
        type: "number",
        description: "Distance in specified units",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { from, to, units } = context.inputs;

      if (!from) {
        return this.createErrorResult("Missing from point input");
      }

      if (!to) {
        return this.createErrorResult("Missing to point input");
      }

      // Prepare options for distance calculation
      const options: any = {};

      if (units !== undefined && units !== null) {
        options.units = units;
      }

      // Calculate the distance using Turf.js
      const calculatedDistance = distance(from, to, options);

      return this.createSuccessResult({
        distance: calculatedDistance,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating distance: ${error.message}`
      );
    }
  }
}
