import { NodeExecution, NodeType } from "@dafthunk/types";
import { booleanConcave } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class BooleanConcaveNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-concave",
    name: "Boolean Concave",
    type: "boolean-concave",
    description:
      "Takes a polygon and returns true or false as to whether it is concave or not.",
    tags: ["Geo", "GeoJSON", "Boolean", "Concave"],
    icon: "square",
    documentation:
      "This node determines whether a polygon is concave (has inward angles) or convex (all angles are outward).",
    inlinable: true,
    inputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "Polygon Feature to be evaluated",
        required: true,
      },
    ],
    outputs: [
      {
        name: "isConcave",
        type: "boolean",
        description: "True if the polygon is concave, false if convex",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { polygon } = context.inputs;

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Delegate everything to Turf.js booleanConcave function
      const isConcave = booleanConcave(polygon as any);

      return this.createSuccessResult({
        isConcave,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error checking concave property: ${error.message}`
      );
    }
  }
}
