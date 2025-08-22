import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";
import { GeoTiffMetadata } from "./types";

export class BboxValidatorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bbox-validator",
    name: "Bbox Validator",
    type: "bbox-validator",
    description: "Validate that a bounding box is within GeoTIFF bounds.",
    tags: ["3D", "Geo"],
    icon: "check-circle",
    inputs: [
      {
        name: "metadata",
        type: "json",
        description: "GeoTIFF metadata containing bounds information",
        required: true,
      },
      {
        name: "bbox",
        type: "json", // [minX, minY, maxX, maxY] in WGS84
        description: "Bounding box to validate against GeoTIFF bounds",
        required: true,
      },
    ],
    outputs: [
      {
        name: "validated_bbox",
        type: "json",
        description: "Validated bounding box",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { metadata, bbox } = context.inputs;

    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
      return this.createErrorResult(
        "Bbox is required and must be an array of 4 numbers [minX, minY, maxX, maxY]."
      );
    }
    if (!metadata || typeof metadata !== "object") {
      return this.createErrorResult(
        "Metadata is required and must be an object."
      );
    }

    const validation = this.validateBounds(
      bbox as [number, number, number, number],
      metadata as GeoTiffMetadata
    );
    if (!validation.isValid) {
      return this.createErrorResult(validation.error!);
    }

    return this.createSuccessResult({
      validated_bbox: bbox,
    });
  }

  private validateBounds(
    requestedBbox: [number, number, number, number],
    metadata: GeoTiffMetadata
  ): { isValid: boolean; error?: string } {
    const [reqMinX, reqMinY, reqMaxX, reqMaxY] = requestedBbox;
    const [geoMinX, geoMinY, geoMaxX, geoMaxY] = metadata.bounds;

    if (
      reqMinX < geoMinX ||
      reqMaxX > geoMaxX ||
      reqMinY < geoMinY ||
      reqMaxY > geoMaxY
    ) {
      return {
        isValid: false,
        error: `Requested bbox [${requestedBbox.join(", ")}] exceeds GeoTIFF bounds [${metadata.bounds.join(", ")}]`,
      };
    }

    return { isValid: true };
  }
}
