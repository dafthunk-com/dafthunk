import { NodeExecution, NodeType } from "@dafthunk/types";
import { rhumbDestination } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../types";

export class RhumbDestinationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rhumbDestination",
    name: "Rhumb Destination",
    type: "rhumbDestination",
    description:
      "Calculates the destination point along a rhumb line (constant bearing) from an origin point.",
    tags: ["Geo", "GeoJSON", "Measurement", "RhumbDestination"],
    icon: "map-pin",
    documentation:
      "This node calculates a destination point given a starting point, bearing, and distance using rhumb lines.",
    inlinable: true,
    inputs: [
      {
        name: "origin",
        type: "geojson",
        description: "Origin point (Feature or Point geometry)",
        required: true,
      },
      {
        name: "distance",
        type: "number",
        description: "Distance to travel along the rhumb line",
        required: true,
      },
      {
        name: "bearing",
        type: "number",
        description: "Bearing/direction in degrees (0 = north, 90 = east)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description:
          "Units for distance (kilometers, miles, meters, degrees, radians)",
        required: false,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to assign to the destination point feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "destination",
        type: "geojson",
        description: "Destination point feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { origin, distance, bearing, units, properties } = context.inputs;

      if (!origin) {
        return this.createErrorResult("Missing origin point input");
      }

      if (distance === undefined || distance === null) {
        return this.createErrorResult("Missing distance input");
      }

      if (bearing === undefined || bearing === null) {
        return this.createErrorResult("Missing bearing input");
      }

      // Prepare options for rhumb destination calculation
      const options: { units?: string; properties?: any } = {};

      if (units !== undefined && units !== null) {
        options.units = units;
      }

      if (properties !== undefined && properties !== null) {
        options.properties = properties;
      }

      // Calculate the rhumb destination using Turf.js
      const destinationPoint = rhumbDestination(
        origin as any,
        distance,
        bearing,
        options as any
      );

      return this.createSuccessResult({
        destination: destinationPoint,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating rhumb destination: ${error.message}`
      );
    }
  }
}
