import { NodeExecution, NodeType } from "@dafthunk/types";
import { polygonToLine } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class PolygonToLineNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "polygon-to-line",
    name: "Polygon To Line",
    type: "polygon-to-line",
    description:
      "Converts a Polygon or MultiPolygon to a LineString or MultiLineString.",
    tags: ["Geo"],
    icon: "route",
    inputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon or MultiPolygon feature to convert to line",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the output line feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "line",
        type: "geojson",
        description: "LineString or MultiLineString feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { polygon, properties } = context.inputs;

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Prepare properties for line
      let lineProperties = {};
      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        lineProperties = properties;
      }

      // Delegate everything to Turf.js polygonToLine function
      const lineFeature = polygonToLine(polygon as any, lineProperties);

      return this.createSuccessResult({
        line: lineFeature,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error converting polygon to line: ${error.message}`
      );
    }
  }
}
