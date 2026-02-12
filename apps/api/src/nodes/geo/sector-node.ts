import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { Units } from "@turf/helpers";
import { sector } from "@turf/turf";

export class SectorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "sector",
    name: "Sector",
    type: "sector",
    description:
      "Creates a circular sector of a circle of given radius and center Point, between (clockwise) bearing1 and bearing2; 0 bearing is North of center point, positive clockwise.",
    tags: ["Geo", "GeoJSON", "Geometry", "Sector"],
    icon: "chart-pie",
    documentation:
      "This node creates a circular sector (pie slice) polygon from a center point, radius, and two bearing angles.",
    inlinable: true,
    inputs: [
      {
        name: "center",
        type: "geojson",
        description: "Center point",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description: "Radius of the circle",
        required: true,
      },
      {
        name: "bearing1",
        type: "number",
        description:
          "Angle, in decimal degrees, of the first radius of the sector",
        required: true,
      },
      {
        name: "bearing2",
        type: "number",
        description:
          "Angle, in decimal degrees, of the second radius of the sector",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units for radius (miles, kilometers, degrees, or radians)",
        required: false,
      },
      {
        name: "steps",
        type: "number",
        description: "Number of steps for the sector polygon",
        required: false,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to add to the sector polygon",
        required: false,
      },
    ],
    outputs: [
      {
        name: "sector",
        type: "geojson",
        description: "Sector polygon",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { center, radius, bearing1, bearing2, units, steps, properties } =
        context.inputs;

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

      // Prepare options for sector function
      const options: { units?: Units; steps?: number; properties?: any } = {};

      if (units !== undefined && units !== null) {
        if (typeof units !== "string") {
          return this.createErrorResult("Units must be a string");
        }

        const validUnits: Units[] = [
          "miles",
          "kilometers",
          "degrees",
          "radians",
        ];
        if (!validUnits.includes(units as Units)) {
          return this.createErrorResult(
            "Units must be one of: miles, kilometers, degrees, radians"
          );
        }

        options.units = units as Units;
      }

      if (steps !== undefined && steps !== null) {
        if (typeof steps !== "number") {
          return this.createErrorResult("Steps must be a number");
        }

        if (steps <= 0) {
          return this.createErrorResult("Steps must be a positive number");
        }

        options.steps = steps;
      }

      if (properties !== undefined && properties !== null) {
        if (typeof properties !== "object") {
          return this.createErrorResult("Properties must be an object");
        }

        options.properties = properties;
      }

      // Delegate everything to Turf.js sector function
      const sectorPolygon = sector(
        center as any,
        radius,
        bearing1,
        bearing2,
        options
      );

      return this.createSuccessResult({
        sector: sectorPolygon,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error creating sector: ${error.message}`);
    }
  }
}
