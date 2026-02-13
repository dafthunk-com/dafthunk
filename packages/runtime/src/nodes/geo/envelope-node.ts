import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { envelope } from "@turf/turf";

export class EnvelopeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "envelope",
    name: "Envelope",
    type: "envelope",
    description:
      "Creates a bounding rectangle (envelope) around any GeoJSON geometry.",
    tags: ["Geo", "GeoJSON", "Geometry", "Envelope"],
    icon: "square",
    documentation:
      "This node creates the minimum bounding rectangle (envelope) for a geometry.",
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
