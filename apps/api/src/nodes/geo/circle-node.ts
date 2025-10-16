import { NodeExecution, NodeType } from "@dafthunk/types";
import { circle } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class CircleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "circle",
    name: "Circle",
    type: "circle",
    description: "Creates a circular polygon given a center point and radius.",
    tags: ["Geo"],
    icon: "circle",
    documentation:
      "This node creates a circular polygon from a center point and radius with customizable precision.",
    inlinable: true,
    inputs: [
      {
        name: "center",
        type: "geojson",
        description: "Center point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description: "Radius of the circle",
        required: true,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of sides for the polygon (default: 64)",
        required: false,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the radius measurement",
        required: false,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the circle feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "circle",
        type: "geojson",
        description: "Circle as a Polygon feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { center, radius, steps, units, properties } = context.inputs;

      if (!center) {
        return this.createErrorResult("Missing center point input");
      }

      if (radius === undefined || radius === null) {
        return this.createErrorResult("Missing radius input");
      }

      if (typeof radius !== "number" || !isFinite(radius) || radius <= 0) {
        return this.createErrorResult("Radius must be a positive number");
      }

      // Prepare options for circle creation
      const options: { steps?: number; units?: string; properties?: any } = {};

      if (steps !== undefined && steps !== null) {
        if (typeof steps !== "number" || !isFinite(steps) || steps < 3) {
          return this.createErrorResult("Steps must be a valid number >= 3");
        }
        options.steps = Math.floor(steps);
      }

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }
        options.units = units;
      }

      // Create the circle using Turf.js
      const circlePolygon = circle(center as any, radius, options as any);

      // Set properties if provided
      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }
        circlePolygon.properties = properties;
      }

      return this.createSuccessResult({
        circle: circlePolygon,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error creating circle: ${error.message}`);
    }
  }
}
