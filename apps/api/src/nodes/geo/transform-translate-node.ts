import { NodeExecution, NodeType } from "@dafthunk/types";
import { transformTranslate } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class TransformTranslateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "transformTranslate",
    name: "Transform Translate",
    type: "transformTranslate",
    description:
      "Moves any GeoJSON geometry by a specified distance and direction.",
    tags: ["Geo"],
    icon: "move",
    documentation: `This node moves a GeoJSON geometry by a specified distance in a given direction.

## Usage Example

- **Input**: 
\`\`\`
{
  "geojson": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [0, 0]
    }
  },
  "distance": 10,
  "direction": 45,
  "units": "kilometers",
  "mutate": false
}
\`\`\`
- **Output**: 
\`\`\`
{
  "translated": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [0.063, 0.063]
    }
  }
}
\`\`\``,
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to translate",
        required: true,
      },
      {
        name: "distance",
        type: "number",
        description: "Distance to translate the geometry",
        required: true,
      },
      {
        name: "direction",
        type: "number",
        description: "Direction in degrees (0 = north, 90 = east)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units for distance (kilometers, miles, meters, degrees, radians)",
        required: false,
      },
      {
        name: "mutate",
        type: "boolean",
        description: "Whether to mutate the original geometry (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "translated",
        type: "geojson",
        description: "Translated geometry or feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, distance, direction, units, mutate } = context.inputs;

      // Delegate to Turf.js transformTranslate function
      const translatedGeometry = transformTranslate(
        geojson,
        distance,
        direction,
        {
          units,
          mutate,
        }
      );

      return this.createSuccessResult({
        translated: translatedGeometry,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error translating geometry: ${error.message}`
      );
    }
  }
}
