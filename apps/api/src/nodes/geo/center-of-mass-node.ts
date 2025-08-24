import { NodeExecution, NodeType } from "@dafthunk/types";
import { centerOfMass } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class CenterOfMassNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "centerOfMass",
    name: "Center of Mass",
    type: "centerOfMass",
    description:
      "Takes any Feature or FeatureCollection and returns its center of mass using the centroid of polygon formula.",
    tags: ["Geo"],
    icon: "target",
    documentation: "*Missing detailed documentation*",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON to be centered",
        required: true,
      },
      {
        name: "properties",
        type: "json",
        description: "Properties to assign to the center of mass point feature",
        required: false,
      },
    ],
    outputs: [
      {
        name: "centerOfMass",
        type: "geojson",
        description: "The center of mass of the input object",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, properties } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Prepare options object for Turf.js centerOfMass function
      const options = properties ? { properties } : {};

      // Delegate to Turf.js centerOfMass function
      const centerOfMassPoint = centerOfMass(geojson, options);

      return this.createSuccessResult({
        centerOfMass: centerOfMassPoint,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error calculating center of mass: ${error.message}`
      );
    }
  }
}
