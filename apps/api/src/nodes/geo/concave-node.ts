import { NodeExecution, NodeType } from "@dafthunk/types";
import { concave } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class ConcaveNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "concave",
    name: "Concave",
    type: "concave",
    description:
      "Takes a set of points and returns a concave hull polygon. Internally, this uses turf-tin to generate geometries.",
    tags: ["Geo", "GeoJSON", "Transform", "Concave"],
    icon: "square",
    documentation:
      "This node creates a concave hull (alpha shape) from a set of points.",
    inlinable: true,
    inputs: [
      {
        name: "points",
        type: "geojson",
        description: "Input points in a FeatureCollection",
        required: true,
      },
      {
        name: "maxEdge",
        type: "number",
        description:
          "The length (in 'units') of an edge necessary for part of the hull to become concave (default: Infinity)",
        required: false,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units of the result e.g. 'kilometers', 'miles', 'meters' (default: kilometers)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "concave",
        type: "geojson",
        description: "A concave hull polygon",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { points, maxEdge, units } = context.inputs;

      if (!points) {
        return this.createErrorResult("Missing points input");
      }

      // Prepare options for concave
      const options: { maxEdge?: number; units?: string } = {};

      if (maxEdge !== undefined && maxEdge !== null) {
        if (typeof maxEdge !== "number") {
          return this.createErrorResult("MaxEdge must be a number");
        }
        if (maxEdge <= 0) {
          return this.createErrorResult("MaxEdge must be a positive number");
        }
        options.maxEdge = maxEdge;
      }

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }
        options.units = units;
      }

      // Delegate to Turf.js concave function
      const concaveHull = concave(points as any, options as any);

      return this.createSuccessResult({
        concave: concaveHull,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating concave hull: ${error.message}`
      );
    }
  }
}
