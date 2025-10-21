import { NodeExecution, NodeType } from "@dafthunk/types";
import { rewind } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class RewindNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rewind",
    name: "Rewind",
    type: "rewind",
    description:
      "Rewind (Multi)LineString or (Multi)Polygon outer ring counterclockwise and inner rings clockwise (Uses Shoelace Formula).",
    tags: ["Geo", "GeoJSON", "Transform", "Rewind"],
    icon: "rotate-ccw",
    documentation:
      "This node reverses the coordinate order of a GeoJSON geometry.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "Input GeoJSON Polygon, LineString, or MultiPolygon",
        required: true,
      },
      {
        name: "reverse",
        type: "boolean",
        description: "Enable reverse winding (default: false)",
        required: false,
      },
      {
        name: "mutate",
        type: "boolean",
        description:
          "Allows GeoJSON input to be mutated (significant performance increase if true) (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "rewound",
        type: "geojson",
        description: "Rewound GeoJSON Polygon",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, reverse, mutate } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing geojson input");
      }

      // Prepare options for rewind
      const options: { reverse?: boolean; mutate?: boolean } = {};

      if (reverse !== undefined && reverse !== null) {
        if (typeof reverse !== "boolean") {
          return this.createErrorResult("Reverse must be a boolean");
        }
        options.reverse = reverse;
      }

      if (mutate !== undefined && mutate !== null) {
        if (typeof mutate !== "boolean") {
          return this.createErrorResult("Mutate must be a boolean");
        }
        options.mutate = mutate;
      }

      // Delegate to Turf.js rewind function
      const rewound = rewind(geojson as any, options);

      return this.createSuccessResult({
        rewound,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error rewinding geometry: ${error.message}`
      );
    }
  }
}
