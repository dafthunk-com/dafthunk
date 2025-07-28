import { NodeExecution, NodeType } from "@dafthunk/types";
import { mask } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class MaskNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "mask",
    name: "Mask",
    type: "mask",
    description:
      "Takes polygons or multipolygons and an optional mask, and returns an exterior ring polygon with holes.",
    tags: ["Geo"],
    icon: "eye-off",
    inputs: [
      {
        name: "polygon",
        type: "geojson",
        description: "GeoJSON polygon used as interior rings or holes",
        required: true,
      },
      {
        name: "mask",
        type: "geojson",
        description:
          "GeoJSON polygon used as the exterior ring (if undefined, the world extent is used)",
        required: false,
      },
      {
        name: "mutate",
        type: "boolean",
        description:
          "Allows the mask GeoJSON input to be mutated (performance improvement if true)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "masked",
        type: "geojson",
        description: "Masked Polygon (exterior ring with holes)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { polygon, mask: maskInput, mutate } = context.inputs;

      if (!polygon) {
        return this.createErrorResult("Missing polygon input");
      }

      // Prepare options for mask function
      const options: { mutate?: boolean } = {};

      if (mutate !== undefined && mutate !== null) {
        if (typeof mutate !== "boolean") {
          return this.createErrorResult("Mutate must be a boolean");
        }
        options.mutate = mutate;
      }

      // Delegate everything to Turf.js mask function
      const maskedPolygon = mask(polygon as any, maskInput as any, options);

      return this.createSuccessResult({
        masked: maskedPolygon,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error creating mask: ${error.message}`);
    }
  }
}
