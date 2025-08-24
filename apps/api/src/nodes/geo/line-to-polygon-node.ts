import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineToPolygon } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineToPolygonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-to-polygon",
    name: "Line To Polygon",
    type: "line-to-polygon",
    description:
      "Converts a LineString or MultiLineString to a Polygon or MultiPolygon.",
    tags: ["Geo"],
    icon: "square",
    documentation: `This node converts a LineString or MultiLineString geometry into a Polygon or MultiPolygon.

## Usage Example

- **Input**: 
\`\`\`
{
  "line": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    }
  },
  "properties": {
    "name": "Converted Polygon"
  }
}
\`\`\`
- **Output**: 
\`\`\`
{
  "polygon": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    },
    "properties": {
      "name": "Converted Polygon"
    }
  }
}
\`\`\``,
    inlinable: true,
    inputs: [
      {
        name: "line",
        type: "geojson",
        description:
          "LineString or MultiLineString feature to convert to polygon",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the output polygon feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon or MultiPolygon feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line, properties } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      // Prepare properties for polygon
      let polygonProperties = {};
      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        polygonProperties = properties;
      }

      // Delegate everything to Turf.js lineToPolygon function
      const polygonFeature = lineToPolygon(line as any, polygonProperties);

      return this.createSuccessResult({
        polygon: polygonFeature,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error converting line to polygon: ${error.message}`
      );
    }
  }
}
