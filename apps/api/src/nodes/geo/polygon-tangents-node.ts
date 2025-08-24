import { NodeExecution, NodeType } from "@dafthunk/types";
import { polygonTangents } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class PolygonTangentsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "polygon-tangents",
    name: "Polygon Tangents",
    type: "polygon-tangents",
    description: "Finds the tangents of a (Multi)Polygon from a Point.",
    tags: ["Geo"],
    icon: "compass",
    documentation: `This node finds the tangent points on a polygon from a given external point.

## Usage Example

- **Input**: 
\`\`\`
{
  "point": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [15, 5]
    }
  },
  "polygon": {
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
  "tangents": {
    "type": "FeatureCollection",
    "features": [
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
      }
    ]
  }
}
\`\`\``,
    inlinable: true,
    inputs: [
      {
        name: "point",
        type: "geojson",
        description: "Point to calculate the tangent points from",
        required: true,
      },
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon or MultiPolygon to get tangents from",
        required: true,
      },
    ],
    outputs: [
      {
        name: "tangents",
        type: "geojson",
        description: "Feature Collection containing the two tangent points",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { point, polygon } = context.inputs;

      if (!point) {
        return this.createErrorResult("Missing point input");
      }

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Delegate to Turf.js polygonTangents function
      const tangents = polygonTangents(point as any, polygon as any);

      return this.createSuccessResult({
        tangents,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating polygon tangents: ${error.message}`
      );
    }
  }
}
