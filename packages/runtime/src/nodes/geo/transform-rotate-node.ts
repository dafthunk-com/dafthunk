import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { transformRotate } from "@turf/turf";

export class TransformRotateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "transformRotate",
    name: "Transform Rotate",
    type: "transformRotate",
    description:
      "Rotates any GeoJSON geometry around a pivot point by a specified angle.",
    tags: ["Geo", "GeoJSON", "Transform", "Rotate"],
    icon: "rotate-cw",
    documentation:
      "This node rotates a GeoJSON geometry around a pivot point by a specified angle in degrees.",
    inlinable: true,
    inputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The GeoJSON geometry or feature to rotate",
        required: true,
      },
      {
        name: "angle",
        type: "number",
        description: "Angle of rotation in degrees (positive for clockwise)",
        required: true,
      },
      {
        name: "pivot",
        type: "geojson",
        description:
          "Point around which to rotate (default: centroid of geometry)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "rotated",
        type: "geojson",
        description: "Rotated geometry or feature",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { geojson, angle, pivot } = context.inputs;

      if (!geojson) {
        return this.createErrorResult("Missing GeoJSON input");
      }

      if (angle === undefined || angle === null) {
        return this.createErrorResult("Missing angle input");
      }

      if (typeof angle !== "number" || !Number.isFinite(angle)) {
        return this.createErrorResult("Angle must be a valid number");
      }

      // Prepare options for rotation
      const options: { pivot?: any } = {};
      if (pivot !== undefined && pivot !== null) {
        options.pivot = pivot;
      }

      // Delegate to Turf.js transformRotate function
      const rotatedGeometry = transformRotate(geojson, angle, options);

      return this.createSuccessResult({
        rotated: rotatedGeometry,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error rotating geometry: ${error.message}`
      );
    }
  }
}
