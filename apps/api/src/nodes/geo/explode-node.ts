import { NodeExecution, NodeType } from "@dafthunk/types";
import { explode } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class ExplodeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "explode",
    name: "Explode",
    type: "explode",
    description:
      "Extracts all vertices from geometries as individual Point features.",
    tags: ["Geo"],
    icon: "chart-scatter",
    documentation: `This node extracts all vertices from a geometry as individual Point features.

## Usage Example

- **Input**: 
\`\`\`
{
  "geojson": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    }
  }
}
\`\`\`
- **Output**: 
\`\`\`
{
  "points": {
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
          "coordinates": [10, 10]
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [0, 10]
        }
      }
    ]
  }
}
\`\`\``,
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to explode into points",
        required: true,
      },
    ],
    outputs: [
      {
        name: "points",
        type: "geojson",
        description:
          "FeatureCollection of Point features representing all vertices",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Delegate everything to Turf.js explode function
      const explodedPoints = explode(geojson);

      return this.createSuccessResult({
        points: explodedPoints,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error exploding geometry: ${error.message}`
      );
    }
  }
}
