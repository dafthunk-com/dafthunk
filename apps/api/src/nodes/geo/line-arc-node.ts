import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineArc } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineArcNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-arc",
    name: "Line Arc",
    type: "line-arc",
    description:
      "Creates a circular arc, of a circle of the given radius and center point, between bearing1 and bearing2.",
    tags: ["Geo"],
    icon: "circle",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "center",
        type: "geojson",
        description: "Center point of the arc",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description: "Radius of the arc in kilometers",
        required: true,
      },
      {
        name: "bearing1",
        type: "number",
        description: "First bearing in degrees",
        required: true,
      },
      {
        name: "bearing2",
        type: "number",
        description: "Second bearing in degrees",
        required: true,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of steps to generate along the arc (default: 64)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "arc",
        type: "geojson",
        description: "LineString feature representing the arc",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { center, radius, bearing1, bearing2, steps } = context.inputs;

      if (!center) {
        return this.createErrorResult("Missing center input");
      }

      if (radius === undefined || radius === null) {
        return this.createErrorResult("Missing radius input");
      }

      if (typeof radius !== "number") {
        return this.createErrorResult("Radius must be a number");
      }

      if (bearing1 === undefined || bearing1 === null) {
        return this.createErrorResult("Missing bearing1 input");
      }

      if (typeof bearing1 !== "number") {
        return this.createErrorResult("Bearing1 must be a number");
      }

      if (bearing2 === undefined || bearing2 === null) {
        return this.createErrorResult("Missing bearing2 input");
      }

      if (typeof bearing2 !== "number") {
        return this.createErrorResult("Bearing2 must be a number");
      }

      // Prepare options for lineArc
      const options: { steps?: number } = {};

      if (steps !== undefined && steps !== null) {
        if (typeof steps !== "number") {
          return this.createErrorResult("Steps must be a number");
        }

        if (steps <= 0) {
          return this.createErrorResult("Steps must be a positive number");
        }

        options.steps = steps;
      }

      // Delegate everything to Turf.js lineArc function
      const arcFeature = lineArc(
        center as any,
        radius,
        bearing1,
        bearing2,
        options
      );

      return this.createSuccessResult({
        arc: arcFeature,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating line arc: ${error.message}`
      );
    }
  }
}
