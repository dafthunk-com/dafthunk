import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * DETR-ResNet-50 node implementation for object detection
 */
export class DetrResnet50Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "detr-resnet50",
    name: "DETR-ResNet-50",
    type: "detr-resnet50",
    description:
      "Detects and classifies objects in images using DETR-ResNet-50 model",
    tags: ["Image"],
    icon: "image",
    computeCost: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to use for object detection",
        required: true,
      },
    ],
    outputs: [
      {
        name: "detections",
        type: "json",
        description:
          "JSON object with detected objects with scores, labels, and bounding boxes",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const image = context.inputs.image;

      if (!image) {
        return this.createErrorResult("Image is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the DETR-ResNet-50 model for object detection
      const result = await context.env.AI.run(
        "@cf/facebook/detr-resnet-50",
        {
          image: Array.from(image.data),
        },
        context.env.AI_OPTIONS
      );

      // Transform the result to include proper bbox format
      const detections = Array.isArray(result)
        ? result.map((detection: any) => ({
            label: detection.label,
            score: detection.score,
            bbox: detection.bbox || [
              detection.x,
              detection.y,
              detection.width,
              detection.height,
            ],
          }))
        : result;

      return this.createSuccessResult({
        detections,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
