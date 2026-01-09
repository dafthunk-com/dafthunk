import { NodeExecution, NodeType } from "@dafthunk/types";
import { square } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class SquareNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "square",
    name: "Square",
    type: "square",
    description:
      "Takes a bounding box and calculates the minimum square bounding box that would contain the input.",
    tags: ["Geo", "GeoJSON", "Geometry", "Square"],
    icon: "square",
    documentation:
      "This node calculates the minimum square bounding box that would contain the input bounding box.",
    inlinable: true,
    inputs: [
      {
        name: "bbox",
        type: "json",
        description: "Bounding box extent in [west, south, east, north] order",
        required: true,
      },
    ],
    outputs: [
      {
        name: "square",
        type: "json",
        description: "A square bounding box surrounding the input bbox",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { bbox } = context.inputs;

      if (!bbox) {
        return this.createErrorResult("Missing bbox input");
      }

      if (!Array.isArray(bbox)) {
        return this.createErrorResult("Bbox must be an array");
      }

      if (bbox.length !== 4) {
        return this.createErrorResult(
          "Bbox must have exactly 4 elements [west, south, east, north]"
        );
      }

      // Validate that all elements are numbers
      for (let i = 0; i < bbox.length; i++) {
        if (typeof bbox[i] !== "number") {
          return this.createErrorResult(
            `Bbox element at index ${i} must be a number`
          );
        }
      }

      // Delegate to Turf.js square function
      const squareBbox = square(bbox as [number, number, number, number]);

      return this.createSuccessResult({
        square: squareBbox,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating square bounding box: ${error.message}`
      );
    }
  }
}
