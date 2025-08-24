import { NodeExecution, NodeType } from "@dafthunk/types";
import { bboxPolygon } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class BboxPolygonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bboxPolygon",
    name: "Bbox Polygon",
    type: "bboxPolygon",
    description: "Takes a bbox and returns an equivalent polygon.",
    tags: ["Geo"],
    icon: "square",
    documentation: `This node creates a bounding box polygon from a GeoJSON geometry.

## Usage Example

- **Input**: Any GeoJSON geometry
- **Output**: 
\`\`\`
{
  "type": "Polygon",
  "coordinates": [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]]
}
\`\`\`

The node creates a rectangular polygon that completely contains the input geometry.`,
    inlinable: true,
    inputs: [
      {
        name: "bbox",
        type: "json",
        description: "Bbox extent in [minX, minY, maxX, maxY] order",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to assign to the polygon feature",
        required: false,
      },
      {
        name: "id",
        type: "string",
        description: "Id to assign to the polygon feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon representation of the bounding box",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { bbox, properties, id } = context.inputs;

      if (!bbox) {
        return this.createErrorResult("Missing bbox input");
      }

      if (!Array.isArray(bbox) || bbox.length !== 4) {
        return this.createErrorResult(
          "Bbox must be an array with exactly 4 elements [minX, minY, maxX, maxY]"
        );
      }

      // Validate bbox coordinates are numbers
      for (let i = 0; i < bbox.length; i++) {
        if (typeof bbox[i] !== "number" || !isFinite(bbox[i])) {
          return this.createErrorResult(
            `Bbox coordinate at index ${i} must be a valid number`
          );
        }
      }

      // Prepare options object for Turf.js bboxPolygon function
      const options: { properties?: any; id?: string | number } = {};

      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        options.properties = properties;
      }

      if (id !== undefined && id !== null) {
        if (typeof id !== "string" && typeof id !== "number") {
          return this.createErrorResult("Id must be a string or number");
        }
        options.id = id;
      }

      // Delegate to Turf.js bboxPolygon function
      const polygon = bboxPolygon(bbox as any, options);

      return this.createSuccessResult({
        polygon,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating bbox polygon: ${error.message}`
      );
    }
  }
}
