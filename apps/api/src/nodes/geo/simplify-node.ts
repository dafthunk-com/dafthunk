import { NodeExecution, NodeType } from "@dafthunk/types";
import { simplify } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class SimplifyNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "simplify",
    name: "Simplify",
    type: "simplify",
    description: "Simplifies a geometry by reducing the number of vertices while preserving its general shape.",
    tags: ["Geo"],
    icon: "minimize",
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to simplify",
        required: true,
      },
      {
        name: "tolerance",
        type: "number",
        description: "Tolerance for simplification (default: 1)",
        required: false,
      },
      {
        name: "highQuality",
        type: "boolean",
        description: "Whether to use high quality simplification (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "simplified",
        type: "geojson",
        description: "Simplified geometry or feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, tolerance, highQuality } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      // Prepare options for simplification
      const options: { tolerance?: number; highQuality?: boolean } = {};
      
      if (tolerance !== undefined && tolerance !== null) {
        options.tolerance = tolerance;
      }
      
      if (highQuality !== undefined && highQuality !== null) {
        options.highQuality = highQuality;
      }

      // Delegate everything to Turf.js simplify function
      const simplifiedGeometry = simplify(geojson, options);

      return this.createSuccessResult({
        simplified: simplifiedGeometry,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error simplifying geometry: ${error.message}`);
    }
  }
} 