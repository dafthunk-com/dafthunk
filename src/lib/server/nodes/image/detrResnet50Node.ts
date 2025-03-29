import { ExecutableNode } from "../types";
import { ExecutionResult, NodeContext } from "../../runtime/types";
import { ArrayParameter, ImageParameter } from "../types";
import { NodeType } from "../types";

/**
 * DETR-ResNet-50 node implementation for object detection
 */
export class DetrResnet50Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "detr-resnet-50",
    name: "DETR-ResNet-50",
    type: "detr-resnet-50",
    description:
      "Detects and classifies objects in images using DETR-ResNet-50 model",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "image",
        type: ImageParameter,
        description: "The image to use for object detection",
        required: true,
      },
    ],
    outputs: [
      {
        name: "detections",
        type: ArrayParameter,
        description:
          "Array of detected objects with scores, labels, and bounding boxes",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const image = context.inputs.image;

      if (!image) {
        return this.createErrorResult("Image is required");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Run the DETR-ResNet-50 model for object detection
      const result = await context.env.AI.run("@cf/facebook/detr-resnet-50", {
        image: Array.from(image.data),
      });

      return this.createSuccessResult({
        detections: new ArrayParameter(result),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
