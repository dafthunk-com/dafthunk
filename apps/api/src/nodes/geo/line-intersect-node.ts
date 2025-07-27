import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineIntersect } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineIntersectNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "lineIntersect",
    name: "Line Intersect",
    type: "lineIntersect",
    description: "Finds intersection points between two linestring or multilinestring features/geometries.",
    tags: ["Geo"],
    icon: "git-merge",
    inputs: [
      {
        name: "line1",
        type: "geojson",
        description: "First linestring or multilinestring (Feature or geometry)",
        required: true,
      },
      {
        name: "line2",
        type: "geojson",
        description: "Second linestring or multilinestring (Feature or geometry)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "intersections",
        type: "geojson",
        description: "FeatureCollection of intersection points (may be empty)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line1, line2 } = context.inputs;
      if (!line1) {
        return this.createErrorResult("Missing line1 input");
      }
      if (!line2) {
        return this.createErrorResult("Missing line2 input");
      }
      
      const intersections = lineIntersect(line1, line2);
      return this.createSuccessResult({
        intersections,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error finding line intersections: ${error.message}`);
    }
  }
} 