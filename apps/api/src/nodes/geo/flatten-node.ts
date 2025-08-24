import { NodeExecution, NodeType } from "@dafthunk/types";
import { flatten } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class FlattenNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "flatten",
    name: "Flatten",
    type: "flatten",
    description:
      "Flattens any GeoJSON to a FeatureCollection of Point, LineString, or Polygon features.",
    tags: ["Geo"],
    icon: "layers",
    documentation: `This node flattens complex GeoJSON structures into a FeatureCollection of simple Point, LineString, or Polygon features.

## Usage Example

- **Input**: 
\`\`\`
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [
            [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
            [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]
          ]
        }
      }
    ]
  }
}
\`\`\`
- **Output**: 
\`\`\`
{
  "flattened": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        }
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]
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
        description: "Any GeoJSON object to flatten",
        required: true,
      },
    ],
    outputs: [
      {
        name: "flattened",
        type: "geojson",
        description: "FeatureCollection of flattened features",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Delegate everything to Turf.js flatten function
      const flattenedFeatures = flatten(geojson);

      return this.createSuccessResult({
        flattened: flattenedFeatures,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error flattening GeoJSON: ${error.message}`
      );
    }
  }
}
