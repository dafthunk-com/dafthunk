import { NodeExecution, NodeType } from "@dafthunk/types";
import { center } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class CenterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "center",
    name: "Center",
    type: "center",
    description: "Calculates the center point of any GeoJSON feature.",
    tags: ["Geo"],
    icon: "target",
    documentation: `This node calculates the center point (centroid) of a GeoJSON geometry.

## Usage Example

- **Input**: A polygon or multi-polygon GeoJSON
- **Output**: 
\`\`\`
{
  "type": "Point",
  "coordinates": [centerLongitude, centerLatitude]
}
\`\`\`

The node finds the geometric center of polygons, lines, or point collections.`,
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON feature(s) to calculate center for",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the output point feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "center",
        type: "geojson",
        description: "Center point as a Point feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, properties } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Prepare properties for center point
      let centerProperties = {};
      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        centerProperties = properties;
      }

      // Calculate the center using Turf.js
      const centerPoint = center(geojson as any);

      // Set properties if provided
      if (Object.keys(centerProperties).length > 0) {
        centerPoint.properties = {
          ...centerPoint.properties,
          ...centerProperties,
        };
      }

      return this.createSuccessResult({
        center: centerPoint,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating center: ${error.message}`
      );
    }
  }
}
