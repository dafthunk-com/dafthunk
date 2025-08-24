import { NodeExecution, NodeType } from "@dafthunk/types";
import { intersect } from "@turf/turf";

import { ExecutableNode, NodeContext } from "../types";

export class IntersectNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "intersect",
    name: "Intersect",
    type: "intersect",
    description: "Finds the intersection of two polygons.",
    tags: ["Geo"],
    icon: "squares-intersect",
    documentation: `This node finds the geometric intersection (overlapping area) between two polygon geometries.

## Usage Example

- **Input**: 
\`\`\`
{
  "polygon1": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    }
  },
  "polygon2": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]]
    }
  },
  "properties": {
    "name": "Overlap Area"
  }
}
\`\`\`
- **Output**: 
\`\`\`
{
  "intersection": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[5, 5], [10, 5], [10, 10], [5, 10], [5, 5]]]
    },
    "properties": {
      "name": "Overlap Area"
    }
  }
}
\`\`\``,
    inlinable: true,
    inputs: [
      {
        name: "polygon1",
        type: "geojson",
        description: "First polygon (Polygon or MultiPolygon feature)",
        required: true,
      },
      {
        name: "polygon2",
        type: "geojson",
        description: "Second polygon (Polygon or MultiPolygon feature)",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the result feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "intersection",
        type: "geojson",
        description:
          "Intersection result as a Polygon or MultiPolygon feature, or null if no intersection",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { polygon1, polygon2, properties } = context.inputs;
    if (!polygon1) {
      return this.createErrorResult("Missing polygon1 input");
    }
    if (!polygon2) {
      return this.createErrorResult("Missing polygon2 input");
    }
    if (
      properties !== undefined &&
      properties !== null &&
      typeof properties !== "object"
    ) {
      return this.createErrorResult("Properties must be an object");
    }
    try {
      const result = intersect(polygon1, polygon2);
      if (result && properties && typeof properties === "object") {
        result.properties = { ...properties };
      }
      return this.createSuccessResult({ intersection: result ?? null });
    } catch (err) {
      return this.createErrorResult((err as Error).message);
    }
  }
}
