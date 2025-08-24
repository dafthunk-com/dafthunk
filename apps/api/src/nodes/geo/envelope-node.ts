import { NodeExecution, NodeType } from "@dafthunk/types";
import { envelope } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class EnvelopeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "envelope",
    name: "Envelope",
    type: "envelope",
    description:
      "Creates a bounding rectangle (envelope) around any GeoJSON geometry.",
    tags: ["Geo"],
    icon: "square",
    documentation: `This node creates the minimum bounding rectangle (envelope) for a geometry.

## Usage Example

- **Input**: Any GeoJSON geometry
- **Output**: A rectangular polygon that completely contains the input geometry

The node creates the smallest possible rectangle that encompasses the entire input geometry.`,
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to create envelope for",
        required: true,
      },
    ],
    outputs: [
      {
        name: "envelope",
        type: "geojson",
        description: "Bounding rectangle polygon feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Delegate everything to Turf.js envelope function
      const envelopePolygon = envelope(geojson);

      return this.createSuccessResult({
        envelope: envelopePolygon,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error creating envelope: ${error.message}`
      );
    }
  }
}
