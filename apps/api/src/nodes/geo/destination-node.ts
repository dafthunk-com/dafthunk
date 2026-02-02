import { NodeExecution, NodeType } from "@dafthunk/types";
import { destination } from "@turf/turf";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class DestinationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "destination",
    name: "Destination",
    type: "destination",
    description:
      "Calculates a destination point given an origin point, distance, and bearing.",
    tags: ["Geo", "GeoJSON", "Measurement", "Destination"],
    icon: "navigation",
    documentation:
      "This node calculates a destination point given an origin point, distance, and bearing direction.",
    inlinable: true,
    inputs: [
      {
        name: "origin",
        type: "geojson",
        description: "Origin point (Point feature or coordinates)",
        required: true,
      },
      {
        name: "distance",
        type: "number",
        description: "Distance to travel",
        required: true,
      },
      {
        name: "bearing",
        type: "number",
        description: "Bearing in degrees (-180 to 180)",
        required: true,
      },
      {
        name: "units",
        type: "string",
        description: "Units for the distance measurement",
        required: false,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties object for the destination point feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "destination",
        type: "geojson",
        description: "Destination point as a Point feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { origin, distance, bearing, units, properties } = context.inputs;

      // Basic input validation
      if (!origin) {
        return this.createErrorResult("Missing origin point input");
      }

      if (distance === undefined || distance === null) {
        return this.createErrorResult("Missing distance input");
      }

      if (bearing === undefined || bearing === null) {
        return this.createErrorResult("Missing bearing input");
      }

      // Prepare options for destination calculation
      const options: any = {};

      if (units !== undefined && units !== null) {
        options.units = units;
      }

      if (properties !== undefined && properties !== null) {
        options.properties = properties;
      }

      // Delegate to Turf.js destination function
      const destinationPoint = destination(origin, distance, bearing, options);

      return this.createSuccessResult({
        destination: destinationPoint,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating destination: ${error.message}`
      );
    }
  }
}
