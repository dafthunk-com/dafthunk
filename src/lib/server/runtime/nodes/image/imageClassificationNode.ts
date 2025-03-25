import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult, NodeContext, NodeType } from "../../workflowTypes";

/**
 * Image Classification node implementation
 */
export class ImageClassificationNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "image-classification",
    name: "Image Classification",
    type: "image-classification",
    description: "Detects and classifies objects in images",
    category: "Image",
    icon: "image",
    inputs: [
      {
        name: "image",
        type: "image",
        description: "The image to use for object detection",
      },
    ],
    outputs: [
      {
        name: "detections",
        type: "array",
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
        image: [...image.data],
      });

      // The result should be an array of detected objects
      // Each object has score, label, and box properties
      // The box property contains xmin, ymin, xmax, ymax coordinates
      return this.createSuccessResult({
        detections: result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
