import { NodeExecution, NodeType } from "@dafthunk/types";
import { rhumbBearing } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class RhumbBearingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rhumbBearing",
    name: "Rhumb Bearing",
    type: "rhumbBearing",
    description:
      "Calculates the rhumb line bearing (constant bearing) between two points.",
    tags: ["Geo"],
    icon: "navigation",
    documentation: `This node calculates the rhumb line bearing (constant bearing) between two points on Earth's surface.

## Usage Example

- **Input**: 
\`\`\`
{
  "start": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-74.006, 40.7128]
    }
  },
  "end": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [2.3522, 48.8566]
    }
  },
  "final": false
}
\`\`\`
- **Output**: \`45.2\` (rhumb line bearing in degrees)`,
    inlinable: true,
    inputs: [
      {
        name: "start",
        type: "geojson",
        description: "Starting point (Feature or Point geometry)",
        required: true,
      },
      {
        name: "end",
        type: "geojson",
        description: "Ending point (Feature or Point geometry)",
        required: true,
      },
      {
        name: "final",
        type: "boolean",
        description:
          "Calculate final bearing instead of initial bearing (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bearing",
        type: "number",
        description: "Rhumb line bearing in degrees (-180 to 180)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { start, end, final } = context.inputs;

      if (!start) {
        return this.createErrorResult("Missing start point input");
      }

      if (!end) {
        return this.createErrorResult("Missing end point input");
      }

      // Prepare options for rhumb bearing calculation
      const options: { final?: boolean } = {};
      if (final !== undefined && final !== null) {
        if (typeof final !== "boolean") {
          return this.createErrorResult("Final parameter must be a boolean");
        }
        options.final = final;
      }

      // Calculate the rhumb bearing using Turf.js
      const bearing = rhumbBearing(start, end, options);

      return this.createSuccessResult({
        bearing: bearing,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating rhumb bearing: ${error.message}`
      );
    }
  }
}
