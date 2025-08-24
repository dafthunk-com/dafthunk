import { NodeExecution, NodeType } from "@dafthunk/types";
import { centerMedian } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class CenterMedianNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "center-median",
    name: "Center Median",
    type: "center-median",
    description:
      "Takes a Feature or FeatureCollection and returns the median center, using the median of the vertices of each feature.",
    tags: ["Geo"],
    icon: "align-center",
    documentation: `This node calculates the median center of a feature or feature collection by finding the median of all vertex coordinates.

## Usage Example

- **Input**: 
\`\`\`
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [0, 0]
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [10, 0]
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [5, 10]
        }
      }
    ]
  }
}
\`\`\`
- **Output**: 
\`\`\`
{
  "center": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [5, 0]
    }
  }
}
\`\`\``,
    inlinable: true,
    inputs: [
      {
        name: "features",
        type: "geojson",
        description: "GeoJSON Feature or FeatureCollection",
        required: true,
      },
      {
        name: "options",
        type: "json",
        description: "Optional parameters for the center calculation",
        required: false,
      },
    ],
    outputs: [
      {
        name: "center",
        type: "geojson",
        description:
          "A Point feature at the median center of the input features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { features, options } = context.inputs;

      if (!features) {
        return this.createErrorResult("Missing features input");
      }

      // Delegate everything to Turf.js centerMedian function
      const center = centerMedian(features as any, options as any);

      return this.createSuccessResult({
        center,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating median center: ${error.message}`
      );
    }
  }
}
